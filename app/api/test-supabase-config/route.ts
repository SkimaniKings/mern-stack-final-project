import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth"

export async function GET() {
  try {
    // Test authentication
    const user = await getAuthenticatedUser()
    
    // Include safe information about configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "[Not configured]"
    const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    return NextResponse.json({
      success: true,
      config: {
        supabaseUrl,
        hasAnonKey: hasAnon,
        authenticated: !!user,
        userId: user?.id || null
      }
    })
  } catch (error) {
    console.error("Error in test-supabase-config API:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
