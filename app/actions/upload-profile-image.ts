"use server"

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { v4 as uuidv4 } from 'uuid'
import { cookies } from "next/headers"
import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * Server action to upload a profile image using admin client to bypass RLS policies
 */
export async function uploadProfileImage(formData: FormData) {
  try {
    // Get the current user using our server client which handles auth better
    const serverClient = await createServerSupabaseClient()
    if (!serverClient) {
      return { success: false, error: "Failed to create Supabase client" }
    }
    
    const { data: { user } } = await serverClient.auth.getUser()
    
    // If no authenticated user, try to get user ID from profile form data
    let userId = user?.id
    const formUserId = formData.get('userId') as string
    
    if (!userId && !formUserId) {
      return { success: false, error: "User not authenticated" }
    }
    
    // Use the provided user ID if no authenticated user
    userId = userId || formUserId
    
    // Get the image from form data
    const imageFile = formData.get('image') as File
    if (!imageFile) {
      return { success: false, error: "No image provided" }
    }
    
    // Convert to buffer
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Generate a unique filename
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `${userId}/${fileName}`
    
    // Use admin client to bypass RLS policies
    const adminClient = createAdminSupabaseClient()
    if (!adminClient) {
      return { success: false, error: "Failed to create admin client" }
    }
    
    // Ensure the bucket exists
    try {
      const { data: buckets } = await adminClient.storage.listBuckets()
      const bucketExists = buckets && buckets.some(b => b.name === 'profile-images')
      
      if (!bucketExists) {
        await adminClient.storage.createBucket('profile-images', {
          public: true,
          fileSizeLimit: 2 * 1024 * 1024, // 2MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        })
      }
    } catch (error: any) {
      console.error("Error ensuring bucket exists:", error)
      // Continue anyway, as the bucket might already exist
    }
    
    // Upload the file using admin client to bypass RLS
    const { data, error } = await adminClient.storage
      .from('profile-images')
      .upload(filePath, buffer, {
        contentType: imageFile.type,
        upsert: true
      })
    
    if (error) {
      console.error("Error uploading image:", error)
      return { success: false, error: `Failed to upload image: ${error.message}` }
    }
    
    // Get the public URL
    const { data: { publicUrl } } = adminClient.storage
      .from('profile-images')
      .getPublicUrl(filePath)
    
    // Add cache busting parameter
    const timestamp = new Date().getTime()
    const urlWithCacheBusting = `${publicUrl}?t=${timestamp}`
    
    // Update the user's profile with the new avatar URL
    // @ts-ignore - TypeScript error with database typing
    const { error: updateError } = await adminClient
      .from('users')
      .update({ avatar_url: urlWithCacheBusting })
      .eq('id', userId)
    
    if (updateError) {
      console.error("Error updating profile:", updateError)
      return { 
        success: true, 
        url: urlWithCacheBusting,
        warning: `Image uploaded but profile not updated: ${updateError.message}`
      }
    }
    
    return { success: true, url: urlWithCacheBusting }
  } catch (error: any) {
    console.error("Error in uploadProfileImage:", error)
    return { success: false, error: error.message || "Unknown error occurred" }
  }
}
