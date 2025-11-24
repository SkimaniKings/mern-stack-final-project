import { createAdminSupabaseClient } from './admin'

/**
 * Ensures that a specific storage bucket exists in Supabase
 * @param bucketName The name of the bucket to ensure exists
 * @param options Configuration options for the bucket
 * @returns Object containing success status and error message if applicable
 */
export async function ensureBucketExists(
  bucketName: string,
  options: {
    public?: boolean;
    fileSizeLimit?: number;
    allowedMimeTypes?: string[];
  } = {}
) {
  try {
    // Use admin client to bypass RLS policies
    const supabase = createAdminSupabaseClient()
    if (!supabase) {
      console.error('Failed to create Supabase admin client')
      return { success: false, error: 'Failed to create Supabase admin client' }
    }
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error(`Error listing buckets: ${listError.message}`)
      return { success: false, error: listError.message }
    }
    
    // If bucket already exists, return success
    if (buckets.some(bucket => bucket.name === bucketName)) {
      return { success: true }
    }
    
    // Create the bucket with specified options
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: options.public ?? true,
      fileSizeLimit: options.fileSizeLimit ?? 2097152, // 2MB default
      allowedMimeTypes: options.allowedMimeTypes ?? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    })
    
    if (createError) {
      console.error(`Error creating bucket ${bucketName}: ${createError.message}`)
      return { success: false, error: createError.message }
    }
    
    console.log(`Successfully created bucket: ${bucketName}`)
    return { success: true }
  } catch (error: any) {
    console.error(`Unexpected error ensuring bucket ${bucketName} exists:`, error)
    return { success: false, error: error.message || 'Unknown error occurred' }
  }
}

/**
 * Uploads a file to a Supabase storage bucket, ensuring the bucket exists first
 * @param bucketName The name of the bucket to upload to
 * @param path The path/filename for the uploaded file
 * @param fileData The file data as a File, Blob, or base64 string
 * @param options Additional upload options
 * @returns Object containing success status, file URL if successful, and error message if applicable
 */
export async function uploadToBucket(
  bucketName: string,
  path: string,
  fileData: File | Blob | string,
  options: {
    contentType?: string;
    upsert?: boolean;
  } = {}
) {
  try {
    // First ensure the bucket exists
    const { success: bucketSuccess, error: bucketError } = await ensureBucketExists(bucketName)
    
    if (!bucketSuccess) {
      throw new Error(bucketError || `Failed to ensure bucket ${bucketName} exists`)
    }
    
    // Use admin client to bypass RLS policies
    const supabase = createAdminSupabaseClient()
    if (!supabase) {
      console.error('Failed to create Supabase admin client')
      return { success: false, error: 'Failed to create Supabase admin client' }
    }
    
    // Handle base64 string conversion
    let fileToUpload = fileData
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      // Extract content type and base64 data
      const matches = fileData.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 format')
      }
      
      const contentType = matches[1]
      const base64Data = matches[2]
      const binaryData = atob(base64Data)
      const byteArray = new Uint8Array(binaryData.length)
      
      for (let i = 0; i < binaryData.length; i++) {
        byteArray[i] = binaryData.charCodeAt(i)
      }
      
      fileToUpload = new Blob([byteArray], { type: contentType })
      options.contentType = contentType
    }
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, fileToUpload, {
        contentType: options.contentType,
        upsert: options.upsert ?? true
      })
    
    if (error) {
      console.error(`Error uploading to ${bucketName}/${path}:`, error)
      return { success: false, error: error.message }
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)
    
    return { 
      success: true, 
      path: data.path,
      url: publicUrl
    }
  } catch (error: any) {
    console.error(`Error uploading to bucket ${bucketName}:`, error)
    return { success: false, error: error.message || 'Unknown error occurred' }
  }
}
