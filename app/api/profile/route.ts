import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { uploadToBucket } from "@/lib/supabase/storage-utils";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';

// Enable detailed logging
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[PROFILE_API]', ...args);
  }
}

// GET /api/profile - Get current user profile
export async function GET(req: NextRequest) {
  try {
    log('GET /api/profile - Starting');
    
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      log('ERROR: Failed to create Supabase client');
      return NextResponse.json({ error: "Failed to create Supabase client" }, { status: 500 });
    }

    log('Getting authenticated user...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      log('ERROR: No authenticated user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    log('Authenticated user ID:', user.id);

    // Get user profile from the users table
    log('Fetching user profile from database...');
    // @ts-ignore - TypeScript error with database typing
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        email,
        avatar_url,
        user_role,
        theme,
        currency_code,
        timezone,
        onboarding_completed,
        phone
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      log('ERROR fetching user profile:', error.message);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    log('Profile fetched successfully');
    return NextResponse.json(data);
  } catch (error) {
    log('CRITICAL ERROR in GET /api/profile:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/profile - Update user profile
export async function PATCH(req: NextRequest) {
  try {
    log('PATCH /api/profile - Starting');
    
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      log('ERROR: Failed to create Supabase client');
      return NextResponse.json({ error: "Failed to create Supabase client" }, { status: 500 });
    }

    log('Getting authenticated user...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      log('ERROR: No authenticated user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    log('Authenticated user ID:', user.id);

    log('Parsing request body...');
    const body = await req.json();
    log('Request body keys:', Object.keys(body));
    const { first_name, last_name, avatar_base64, phone, ...otherFields } = body;

    // Combine first and last name into full_name
    const updates: Record<string, any> = {
      ...otherFields
    };
    
    // Add phone number if provided
    if (phone !== undefined) {
      updates.phone = phone;
      log('Phone number update added');
    }
    
    log('Initial updates:', Object.keys(updates));

    // Process base64 image if provided
    if (avatar_base64) {
      log('Processing base64 image data...');
      // Validate that it's a proper base64 image
      if (avatar_base64.startsWith('data:image/')) {
        try {
          // Extract the file type from the base64 string
          const fileType = avatar_base64.split(';')[0].split('/')[1];
          const fileName = `${uuidv4()}.${fileType}`;
          
          // Remove the data:image/xxx;base64, prefix
          const base64Data = avatar_base64.split(',')[1];
          
          // Use admin client to bypass RLS policies for storage operations
          const adminClient = createAdminSupabaseClient();
          if (!adminClient) {
            log('ERROR: Failed to create admin Supabase client');
            return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
          }
          
          // Use our utility function to upload the image
          log('Uploading image to profile-images bucket...');
          const { success, url, error: uploadError } = await uploadToBucket(
            'profile-images',
            `${user.id}/${fileName}`,
            avatar_base64,
            { contentType: `image/${fileType}` }
          );
          
          if (!success) {
            log('ERROR: Failed to upload image:', uploadError);
            return NextResponse.json({ error: `Failed to upload image: ${uploadError}` }, { status: 500 });
          }
          
          log('Image uploaded successfully, public URL:', url);
          updates.avatar_url = url;
          log('Profile picture uploaded to storage and URL saved');
        } catch (error) {
          log('ERROR processing image:', error);
          return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
        }
      } else {
        log('ERROR: Invalid image data format');
        return NextResponse.json({ error: "Invalid image data format" }, { status: 400 });
      }
    }

    if (first_name || last_name) {
      log('Processing name update...');
      // Only update if at least one name field is provided
      // @ts-ignore - TypeScript error with database typing
      const currentProfile = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (currentProfile.error) {
        log('ERROR fetching current profile for name update:', currentProfile.error.message);
      }
      
      const currentFullName = currentProfile.data?.full_name || '';
      log('Current full name:', currentFullName);
      const nameParts = currentFullName.split(' ');
      const currentFirst = nameParts[0] || '';
      const currentLast = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      updates.full_name = `${first_name || currentFirst || ''} ${last_name || currentLast || ''}`.trim();
      log('New full name:', updates.full_name);
    }

    // Check if we have any updates to make
    if (Object.keys(updates).length === 0) {
      log('No updates provided in request');
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }
    
    log('Final updates to apply:', Object.keys(updates));

    // First check if the user record exists
    log('Checking if user record exists...');
    // @ts-ignore - TypeScript error with database typing
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (checkError) {
      log('ERROR checking user existence:', checkError.message);
      
      // If the user doesn't exist, create a new record
      if (checkError.code === 'PGRST116') { // Record not found error
        log('User record not found, creating new record...');
        // @ts-ignore - TypeScript error with database typing
        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            ...updates
          })
          .select();

        if (insertError) {
          log('ERROR creating user record:', insertError.message);
          return NextResponse.json({ error: `Failed to create profile: ${insertError.message}` }, { status: 500 });
        }

        log('User record created successfully');
        return NextResponse.json(insertData[0]);
      }
      
      return NextResponse.json({ error: `Failed to check profile: ${checkError.message}` }, { status: 500 });
    }

    // Update user profile
    log('Updating user profile...');
    // @ts-ignore - TypeScript error with database typing
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select();

    if (error) {
      log('ERROR updating user profile:', error.message);
      return NextResponse.json({ error: `Failed to update profile: ${error.message}` }, { status: 500 });
    }

    // Also update the user metadata in auth.users if name was changed
    if (first_name || last_name) {
      log('Updating user metadata in auth...');
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name,
          first_name: first_name,
          last_name: last_name
        }
      });
      
      if (authUpdateError) {
        log('WARNING: Failed to update auth user metadata:', authUpdateError.message);
        // Continue anyway as this is not critical
      } else {
        log('Auth user metadata updated successfully');
      }
    }

    log('Profile updated successfully');
    return NextResponse.json(data[0]);
  } catch (error) {
    log('CRITICAL ERROR in PATCH /api/profile:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
