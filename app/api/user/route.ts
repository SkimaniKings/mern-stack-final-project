import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { userId, username, email, firstName, lastName } = body;
    
    // Validate required fields
    if (!userId || !username || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Create server-side Supabase client (bypasses RLS)
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Failed to create database client" },
        { status: 500 }
      );
    }
    
    // Create the full name if first and last name are provided
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : undefined;
    
    // Insert the user record
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        username,
        email,
        full_name: fullName,
        is_email_verified: false,
        mfa_enabled: false,
        is_biometrics_enabled: false,
        suspicious_login_flag: false,
        session_timeout_minutes: 30,
        emergency_access_enabled: false,
        has_consented: false,
        privacy_level: 'standard',
        local_data_only: false,
        allow_data_analysis: true,
        data_retention_policy: '1y',
        locale: 'en-US',
        currency_code: 'USD',
        timezone: 'UTC',
        theme: 'system',
        date_format: 'YYYY-MM-DD',
        notification_preferences: {},
        onboarding_completed: false,
        user_role: 'user',
        permission_scope: {},
        marketing_opt_in: false,
        last_login_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error creating user record:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in user creation API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
