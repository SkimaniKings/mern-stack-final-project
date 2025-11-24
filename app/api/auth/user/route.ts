import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    console.log('Server: Checking for authenticated user')
    
    // Use the same authentication method as the dashboard
    // This function is cached and handles all the edge cases properly
    const user = await getAuthenticatedUser()
    
    if (user && user.id) {
      console.log(`Server: Found authenticated user ID: ${user.id}`)
      return NextResponse.json({ 
        success: true, 
        userId: user.id,
        isAuthenticated: true,
        email: user.email,
        method: 'auth-lib'
      })
    }
    
    // If no authenticated user found, try with server client directly
    try {
      const supabase = await createServerSupabaseClient()
      if (!supabase) {
        console.error('Failed to create Supabase client')
        throw new Error('Failed to create Supabase client')
      }
      
      // Use getUser for secure authentication by contacting the Supabase Auth server
      const { data, error } = await supabase.auth.getUser()
      
      if (error) {
        // Don't throw an error for auth session missing - this is expected for unauthenticated users
        if (error.message.includes('Auth session missing')) {
          console.log('Server: Auth session missing')
        } else {
          console.error('Server: Authentication error:', error.message)
        }
      } else if (data?.user?.id) {
        console.log(`Server: Found authenticated user ID directly: ${data.user.id}`)
        return NextResponse.json({ 
          success: true, 
          userId: data.user.id,
          isAuthenticated: true,
          email: data.user.email,
          method: 'direct-auth'
        })
      }
    } catch (serverError) {
      console.error('Server: Error with server client:', serverError)
    }
    
    // If no authenticated user found, return 401 Unauthorized
    console.log('Server: No authenticated user found')
    return NextResponse.json({
      success: false,
      message: 'Authentication required',
      error: 'User not authenticated'
    }, { status: 401 })
    
  } catch (error) {
    console.error('Error in /api/auth/user:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get user ID',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
