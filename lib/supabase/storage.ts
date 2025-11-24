import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a Supabase client for client-side operations
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to the documents bucket
 * This function includes a workaround for the row-level security issue
 * by using a specific path format that bypasses RLS checks
 */
export async function uploadDocumentFile(
  file: File,
  path: string,
  options?: { contentType?: string; upsert?: boolean }
) {
  try {
    // Ensure the path starts with the user's folder to work around RLS issues
    // This approach doesn't require changing bucket policies
    const { data: userData } = await supabaseClient.auth.getUser();
    
    if (!userData || !userData.user) {
      throw new Error('User not authenticated');
    }
    
    // Use the user's ID as the folder prefix to isolate user files
    // This is a common pattern that works even with default RLS policies
    const userId = userData.user.id;
    const securePath = `${userId}/${path}`;
    
    // Upload the file with the secure path
    const { data, error } = await supabaseClient.storage
      .from('tax_documents')
      .upload(securePath, file, {
        contentType: options?.contentType,
        upsert: options?.upsert ?? false,
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
    
    return {
      ...data,
      // Return a URL that can be used to access the file
      publicUrl: supabaseClient.storage.from('documents').getPublicUrl(securePath).data.publicUrl,
      // Also return the path for future reference
      path: securePath,
    };
  } catch (error) {
    console.error('Error in uploadDocumentFile:', error);
    throw error;
  }
}

/**
 * Downloads a file from the tax_documents bucket
 */
export async function getDocumentFile(path: string) {
  try {
    // Get the current user
    const { data: userData } = await supabaseClient.auth.getUser();
    
    if (!userData || !userData.user) {
      throw new Error('User not authenticated');
    }
    
    // Ensure the path includes the user ID prefix if it doesn't already
    const userId = userData.user.id;
    const securePath = path.startsWith(userId) ? path : `${userId}/${path}`;
    
    // Get the file
    const { data, error } = await supabaseClient.storage
      .from('tax_documents')
      .download(securePath);
    
    if (error) {
      // Add more specific error handling for common storage issues
      if (error.message.includes('Bucket not found')) {
        console.error('Storage bucket not found:', error.message);
        throw new Error('The tax documents storage bucket is misconfigured. Please contact support.');
      }
      if (error.message.toLowerCase().includes('not found')) {
        console.error(`File not found at path: ${securePath}`, error.message);
        throw new Error('The requested document could not be found. It may have been moved or deleted.');
      }
      console.error('Error downloading file:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    // Catch and re-throw with a more generic message if it's not one of our custom errors
    if (error instanceof Error && (error.message.includes('misconfigured') || error.message.includes('could not be found'))) {
      throw error;
    }
    console.error('Error in getDocumentFile:', error);
    throw new Error('An unexpected error occurred while trying to download the document.');
  }
}

/**
 * Lists files in the documents bucket for the current user
 */
export async function listDocumentFiles(folder: string = '') {
  try {
    // Get the current user
    const { data: userData } = await supabaseClient.auth.getUser();
    
    if (!userData || !userData.user) {
      throw new Error('User not authenticated');
    }
    
    // Use the user's ID as the folder prefix
    const userId = userData.user.id;
    const securePath = folder ? `${userId}/${folder}` : userId;
    
    // List files in the user's folder
    const { data, error } = await supabaseClient.storage
      .from('tax_documents')
      .list(securePath);
    
    if (error) {
      console.error('Error listing files:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in listDocumentFiles:', error);
    throw error;
  }
}

/**
 * Deletes a file from the documents bucket
 */
export async function deleteDocumentFile(path: string) {
  try {
    // Get the current user
    const { data: userData } = await supabaseClient.auth.getUser();
    
    if (!userData || !userData.user) {
      throw new Error('User not authenticated');
    }
    
    // Ensure the path includes the user ID prefix if it doesn't already
    const userId = userData.user.id;
    const securePath = path.startsWith(userId) ? path : `${userId}/${path}`;
    
    // Delete the file
    const { data, error } = await supabaseClient.storage
      .from('tax_documents')
      .remove([securePath]);
    
    if (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in deleteDocumentFile:', error);
    throw error;
  }
}
