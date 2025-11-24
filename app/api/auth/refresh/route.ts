import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/supabase/auth-refresh";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Endpoint to refresh the user's authentication token
 * This helps prevent "invalid JWT: token is expired" errors
 */
export async function GET() {
  try {
    // First try to refresh the session
    const refreshedSession = await refreshSession();
    
    if (!refreshedSession) {
      // If refreshSession fails, try to get the current session
      const supabase = await createServerSupabaseClient();
      
      if (!supabase) {
        return NextResponse.json(
          { error: "Failed to create Supabase client" },
          { status: 500 }
        );
      }
      
      // Try to refresh the session directly
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Error refreshing session:", error);
        return NextResponse.json(
          { 
            success: false, 
            error: "Authentication error", 
            message: "Failed to refresh your session. Please log in again.",
            details: error.message
          },
          { status: 401 }
        );
      }
      
      if (!data.session) {
        return NextResponse.json(
          { 
            success: false, 
            error: "No active session", 
            message: "No active session found. Please log in."
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: "Session refreshed successfully",
        expiresAt: data.session.expires_at
      });
    }
    
    return NextResponse.json({
      success: true,
      message: "Session refreshed successfully",
      expiresAt: refreshedSession.expires_at
    });
  } catch (error) {
    console.error("Unexpected error in refreshing session:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "An unexpected error occurred", 
        details: error instanceof Error ? error.toString() : 'Unknown error',
        message: "Failed to refresh your session. Please try logging in again."
      },
      { status: 500 }
    );
  }
}
