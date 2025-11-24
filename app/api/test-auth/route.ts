import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/supabase/server-utils'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { message: 'No active session found' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      message: 'Session retrieved successfully',
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
        },
        expires: session.expires_at,
      },
    })
  } catch (error) {
    console.error('Error in test-auth route:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
