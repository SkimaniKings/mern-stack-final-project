import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Enable more detailed logging
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[PROFILE_UPLOAD]', ...args);
  }
}

// Helper function to ensure bucket exists using admin privileges
async function ensureBucketExists() {
  try {
    log('Checking if bucket exists...');
    
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      log('ERROR: NEXT_PUBLIC_SUPABASE_URL is not defined');
      return false;
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      log('ERROR: SUPABASE_SERVICE_ROLE_KEY is not defined');
      return false;
    }
    
    // Use service role key to bypass RLS
    log('Creating admin client with service role key');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Check if bucket exists
    log('Listing buckets...');
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      log('ERROR listing buckets:', listError.message);
      return false;
    }
    
    log('Buckets found:', buckets.map((b: any) => b.name).join(', '));
    const bucketExists = buckets.some((bucket: any) => bucket.name === 'user-content');
    
    if (bucketExists) {
      log('Bucket "user-content" already exists');
      return true;
    }
    
    // Create the bucket if it doesn't exist
    log('Creating bucket "user-content"...');
    const { error } = await supabaseAdmin.storage.createBucket('user-content', {
      public: true,
      fileSizeLimit: 2097152, // 2MB in bytes
    });
    
    if (error) {
      log('ERROR creating bucket:', error.message);
      return false;
    }
    
    log('Bucket created successfully');
    
    // Set bucket to public
    log('Setting bucket to public...');
    const { error: policyError } = await supabaseAdmin.storage.updateBucket('user-content', {
      public: true,
    });
    
    if (policyError) {
      log('WARNING: Error setting bucket to public:', policyError.message);
      // Continue anyway as the bucket was created
    } else {
      log('Bucket set to public successfully');
    }
    
    return true;
  } catch (error) {
    log('CRITICAL ERROR ensuring bucket exists:', error);
    return false;
  }
}

// POST /api/profile/upload - Upload profile picture
export async function POST(req: NextRequest) {
  try {
    log('Starting profile picture upload process');
    
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
    log('Authenticated user:', user.id);
    
    // Ensure the storage bucket exists before proceeding
    log('Ensuring storage bucket exists...');
    const bucketExists = await ensureBucketExists();
    if (!bucketExists) {
      log('ERROR: Failed to ensure bucket exists');
      return NextResponse.json({ error: "Failed to create storage bucket" }, { status: 500 });
    }
    log('Bucket exists or was created successfully');

    // Get form data with the file
    log('Parsing form data...');
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      log('ERROR: No file provided in form data');
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    log('File received:', file.name, file.type, `${file.size} bytes`);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      log('ERROR: Invalid file type:', file.type);
      return NextResponse.json({ 
        error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed" 
      }, { status: 400 });
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      log('ERROR: File too large:', file.size, 'bytes');
      return NextResponse.json({ 
        error: "File too large. Maximum size is 2MB" 
      }, { status: 400 });
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    log('Generated file path:', filePath);

    // Create admin client for upload to ensure it works
    log('Creating admin client for upload...');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Upload to Supabase Storage using admin client
    log('Uploading file to storage...');
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('user-content')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      log('ERROR uploading file:', uploadError.message);
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }
    log('File uploaded successfully');

    // Get public URL for the uploaded file
    log('Getting public URL...');
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('user-content')
      .getPublicUrl(filePath);
    log('Public URL:', publicUrl);

    // Update user profile with the new avatar URL
    log('Updating user profile with new avatar URL...');
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)
      .select();

    if (profileError) {
      log('ERROR updating profile with avatar:', profileError.message);
      return NextResponse.json({ error: `Failed to update profile: ${profileError.message}` }, { status: 500 });
    }
    log('Profile updated successfully');

    return NextResponse.json({ 
      success: true, 
      avatar_url: publicUrl,
      profile: profileData[0]
    });
  } catch (error) {
    log('CRITICAL ERROR in POST /api/profile/upload:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
