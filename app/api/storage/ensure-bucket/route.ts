import { NextRequest, NextResponse } from 'next/server'
import { ensureBucketExists } from '@/lib/supabase/storage-utils'

export async function POST(req: NextRequest) {
  try {
    const { bucketName, options } = await req.json()
    
    if (!bucketName) {
      return NextResponse.json({ error: 'Bucket name is required' }, { status: 400 })
    }
    
    // Call our utility function to ensure the bucket exists
    const result = await ensureBucketExists(bucketName, options || {})
    
    if (!result.success) {
      console.error(`Failed to ensure bucket ${bucketName} exists:`, result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Bucket ${bucketName} is ready for use` 
    })
  } catch (error: any) {
    console.error('Error in ensure-bucket endpoint:', error)
    return NextResponse.json({ 
      error: error.message || 'Unknown error occurred' 
    }, { status: 500 })
  }
}
