import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Always use admin client to set up storage buckets and policies
    const adminClient = await createAdminSupabaseClient()
    
    if (!adminClient) {
      console.error('Failed to create admin client for storage setup')
      return NextResponse.json({ error: 'Failed to create admin client' }, { status: 500 })
    }
    
    // Create the profile-images bucket if it doesn't exist
    const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets()
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
      return NextResponse.json({ error: bucketsError.message }, { status: 500 })
    }
    
    const profileBucketExists = buckets.some(bucket => bucket.name === 'profile-images')
    
    if (!profileBucketExists) {
      console.log('Creating profile-images bucket...')
      const { error: createError } = await adminClient.storage.createBucket('profile-images', {
        public: true,
        fileSizeLimit: 2097152, // 2MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      })
      
      if (createError) {
        console.error('Error creating profile-images bucket:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
    }
    
    // Execute the SQL function to create the reports bucket with proper RLS policies
    // @ts-ignore - TypeScript error with rpc typing
    const { data: adminData, error: adminError } = await adminClient.rpc('create_reports_bucket_with_policies')
    
    if (adminError) {
      console.error('Error setting up reports bucket with admin client:', adminError)
      return NextResponse.json({ error: adminError.message }, { status: 500 })
    }
    
    console.log('Successfully set up reports bucket with admin client')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Storage buckets setup completed successfully',
      buckets: buckets.map((b: any) => b.name)
    })
    
  } catch (error: any) {
    console.error('Error in storage setup endpoint:', error)
    return NextResponse.json({ error: error.message || 'Unknown error occurred' }, { status: 500 })
  }
}
