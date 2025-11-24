import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const error_description = requestUrl.searchParams.get("error_description")

  // Handle OAuth error
  if (error) {
    console.error("OAuth error:", error, error_description)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description || error)}`, request.url)
    )
  }

  if (code) {
    try {
      const supabase = await createServerSupabaseClient()
      
      if (!supabase) {
        console.error("Failed to create Supabase client in auth callback")
        return NextResponse.redirect(new URL("/login?error=auth_service_unavailable", request.url))
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error("Error exchanging code for session:", error)
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
        )
      }
      
      // If we have a user, ensure their profile exists
      if (data?.user) {
        try {
          // First check if profile already exists
          const { data: existingProfile, error: profileQueryError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", data.user.id)
            .maybeSingle()
          
          if (profileQueryError) {
            console.error("Error checking for existing profile:", profileQueryError)
            // Continue anyway - the user is authenticated
          }
          
          // If profile doesn't exist, create it
          if (!existingProfile) {
            const { error: profileError } = await supabase
              .from("profiles")
              .insert({
                id: data.user.id,
                first_name: data.user.user_metadata.first_name || "User",
                last_name: data.user.user_metadata.last_name || "",
                email: data.user.email || "",
                created_at: new Date().toISOString(),
                last_sign_in: new Date().toISOString(),
              })
            
            if (profileError) {
              console.error("Error creating profile:", profileError)
              // Continue anyway - the user is authenticated
            } else {
              console.log("Profile created successfully for user:", data.user.id)
            }
          } else {
            // Update last sign in time
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ last_sign_in: new Date().toISOString() })
              .eq("id", data.user.id)
              
            if (updateError) {
              console.error("Error updating last sign in time:", updateError)
            }
          }
        } catch (err) {
          console.error("Exception during profile creation:", err)
          // Continue anyway - the user is authenticated
        }
      }

      // URL to redirect to after sign in process completes
      return NextResponse.redirect(new URL("/dashboard", request.url))
    } catch (err) {
      console.error("Unexpected error in auth callback:", err)
      return NextResponse.redirect(new URL("/login?error=unexpected_error", request.url))
    }
  }

  // If no code is provided, redirect to login
  return NextResponse.redirect(new URL("/login?error=missing_code", request.url))
}
