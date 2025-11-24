import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client for authentication
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials are not properly configured")
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  })
}

// GET endpoint to retrieve the current user session
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    // Try to get the user directly from Supabase Auth
    const { data, error } = await supabase.auth.getUser()
    
    if (data?.user) {
      // User is authenticated
      return NextResponse.json({ 
        authenticated: true, 
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.email
        }
      })
    }
    
    // If getUser fails, try getSession
    const { data: sessionData } = await supabase.auth.getSession()
    
    if (sessionData?.session?.user) {
      // User is authenticated via session
      return NextResponse.json({ 
        authenticated: true, 
        user: {
          id: sessionData.session.user.id,
          email: sessionData.session.user.email,
          name: sessionData.session.user.user_metadata?.full_name || sessionData.session.user.email
        }
      })
    }
    
    // Try refreshing the session
    const { data: refreshData } = await supabase.auth.refreshSession()
    
    if (refreshData?.session?.user) {
      // User is authenticated after refresh
      return NextResponse.json({ 
        authenticated: true, 
        user: {
          id: refreshData.session.user.id,
          email: refreshData.session.user.email,
          name: refreshData.session.user.user_metadata?.full_name || refreshData.session.user.email
        }
      })
    }
    
    // User is not authenticated
    return NextResponse.json({ 
      authenticated: false,
      user: null
    })
  } catch (error) {
    console.error('Error in session API:', error)
    return NextResponse.json({ 
      authenticated: false, 
      user: null, 
      error: 'An error occurred while checking authentication'
    }, { status: 500 })
  }
}
