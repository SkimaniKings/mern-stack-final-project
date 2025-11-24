"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from 'uuid'
import { revalidatePath } from "next/cache"

// Enable detailed logging
const DEBUG = true

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[PROFILE_ACTION]', ...args)
  }
}

interface ProfileUpdateData {
  firstName?: string
  lastName?: string
  phone?: string
  avatarBase64?: string
}

/**
 * Server action to update a user's profile
 * This handles both basic profile info and avatar uploads
 */
export async function updateUserProfile(data: ProfileUpdateData): Promise<{ 
  success: boolean
  error?: string
  profile?: any
}> {
  try {
    log('Starting profile update with data keys:', Object.keys(data))
    
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      log('ERROR: Failed to create Supabase client')
      return { success: false, error: "Failed to create database client" }
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      log('ERROR: No authenticated user found', userError?.message)
      return { success: false, error: "You must be logged in to update your profile" }
    }
    
    log('Authenticated user ID:', user.id)
    const updates: Record<string, any> = {}
    
    // Process name updates
    if (data.firstName || data.lastName) {
      log('Processing name update')
      
      // Get current profile to merge with updates
      const { data: currentProfile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      const currentFullName = currentProfile?.full_name || ''
      const nameParts = currentFullName.split(' ')
      const currentFirst = nameParts[0] || ''
      const currentLast = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
      
      // Create the new full name
      const firstName = data.firstName || currentFirst
      const lastName = data.lastName || currentLast
      updates.full_name = `${firstName} ${lastName}`.trim()
      
      log('New full name:', updates.full_name)
      
      // Also update the user metadata in auth
      await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name,
          first_name: firstName,
          last_name: lastName
        }
      })
    }
    
    // Process phone update
    if (data.phone !== undefined) {
      // Only check for duplicates if the phone number is not empty
      if (data.phone) {
        // Check if this phone number is already in use by another user
        const { data: existingUserWithPhone, error: phoneCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('phone', data.phone)
          .neq('id', user.id) // Exclude current user
          .maybeSingle()
        
        if (existingUserWithPhone) {
          log('ERROR: Phone number already in use by another user')
          return { success: false, error: "This phone number is already in use by another user. Please use a different phone number." }
        }
        
        if (phoneCheckError && phoneCheckError.code !== 'PGRST116') { // PGRST116 = not found, which is good
          log('ERROR checking phone uniqueness:', phoneCheckError.message)
          // Continue anyway, we'll let the database constraint handle it if there's an issue
        }
      }
      
      updates.phone = data.phone
      log('Phone update:', data.phone)
    }
    
    // Process avatar update
    if (data.avatarBase64) {
      log('Processing avatar upload')
      
      if (data.avatarBase64.startsWith('data:image/')) {
        try {
          // Extract the file type from the base64 string
          const fileType = data.avatarBase64.split(';')[0].split('/')[1]
          const fileName = `${uuidv4()}.${fileType}`
          
          // Remove the data:image/xxx;base64, prefix
          const base64Data = data.avatarBase64.split(',')[1]
          
          // Upload the image to Supabase Storage
          const { error: uploadError } = await supabase
            .storage
            .from('profile-images')
            .upload(`${user.id}/${fileName}`, Buffer.from(base64Data, 'base64'), {
              contentType: `image/${fileType}`,
              upsert: true
            })
          
          if (uploadError) {
            log('ERROR uploading image:', uploadError.message)
            return { success: false, error: `Failed to upload image: ${uploadError.message}` }
          }
          
          // Get the public URL for the uploaded image
          const { data: publicUrlData } = supabase
            .storage
            .from('profile-images')
            .getPublicUrl(`${user.id}/${fileName}`)
          
          updates.avatar_url = publicUrlData.publicUrl
          log('Profile picture URL:', updates.avatar_url)
        } catch (error) {
          log('ERROR processing image:', error)
          return { success: false, error: "Failed to process image" }
        }
      } else {
        log('ERROR: Invalid image data format')
        return { success: false, error: "Invalid image data format" }
      }
    }
    
    // Check if we have any updates to make
    if (Object.keys(updates).length === 0) {
      log('No updates provided')
      return { success: false, error: "No updates provided" }
    }
    
    // Update the profile
    log('Updating profile with:', Object.keys(updates))
    
    // First check if the profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()
    
    let profile
    
    // If profile doesn't exist, create it
    if (checkError && checkError.code === 'PGRST116') { // Record not found
      log('Profile not found, creating new profile')
      
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          ...updates
        })
        .select()
      
      if (insertError) {
        log('ERROR creating profile:', insertError.message)
        return { success: false, error: `Failed to create profile: ${insertError.message}` }
      }
      
      profile = insertData[0]
    } else {
      // Update existing profile
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
      
      if (updateError) {
        log('ERROR updating profile:', updateError.message)
        
        // Handle specific error cases with user-friendly messages
        if (updateError.message.includes('users_phone_key')) {
          return { success: false, error: "This phone number is already in use by another user. Please use a different phone number." }
        }
        
        return { success: false, error: `Failed to update profile: ${updateError.message}` }
      }
      
      profile = updateData[0]
    }
    
    // Revalidate the profile page to show updated data
    revalidatePath('/profile')
    
    log('Profile updated successfully')
    return { success: true, profile }
  } catch (error) {
    log('CRITICAL ERROR in updateUserProfile:', error)
    return { 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` 
    }
  }
}
