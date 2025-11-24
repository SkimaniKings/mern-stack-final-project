import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/supabase/auth-refresh";

export async function GET() {
  try {
    // First refresh the auth session to prevent JWT expiration errors
    await refreshSession();
    const supabase = await createServerSupabaseClient();
    const adminClient = await createAdminSupabaseClient();
    
    if (!supabase || !adminClient) {
      return NextResponse.json(
        { error: "Failed to create Supabase client" },
        { status: 500 }
      );
    }

    // Get current user
    const { data, error: userError } = await supabase.auth.getUser();
    const user = data?.user;
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // First, ensure the database structure is set up
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/database/notifications-setup`);

    // Fetch notification types to map names to IDs
    const { data: notificationTypes, error: typesError } = await adminClient
      .from('notification_types')
      .select('id, name');

    if (typesError) {
      console.error("Error fetching notification types:", typesError);
      return NextResponse.json(
        { error: "Failed to fetch notification types" },
        { status: 500 }
      );
    }

    const typeMap = notificationTypes.reduce((acc, type) => {
      acc[type.name] = type.id;
      return acc;
    }, {} as Record<string, string>);

    // Sample notifications
    const sampleNotifications = [
      {
        user_id: user.id,
        notification_type: typeMap["General Alert"],
        message: "Welcome to Dripcheck! Your financial dashboard is ready.",
        link: "/dashboard",
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      },
      {
        user_id: user.id,
        notification_type: typeMap["Watchlist Alert"],
        message: "AAPL has reached your target price of $180.",
        link: "/watchlist",
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      },
      {
        user_id: user.id,
        notification_type: typeMap["Budget Alert"],
        message: "You've reached 80% of your Entertainment budget for this month.",
        link: "/budgets",
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
      },
      {
        user_id: user.id,
        notification_type: typeMap["Expense Reminder"],
        message: "Don't forget to record your recent expenses.",
        link: "/expenses",
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      },
      {
        user_id: user.id,
        notification_type: typeMap["Bill Reminder"],
        message: "Your electricity bill is due in 3 days.",
        link: "/bills",
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
      },
      {
        user_id: user.id,
        notification_type: typeMap["Investment Update"],
        message: "Your portfolio has increased by 2.5% this week.",
        link: "/investments",
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
      },
      {
        user_id: user.id,
        notification_type: typeMap["System Update"],
        message: "New feature: You can now set up recurring expenses.",
        link: "/settings",
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
      },
    ];

    // Delete existing notifications for this user
    try {
      const { error: deleteError } = await adminClient
        .from('user_notifications')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error("Error deleting existing notifications:", deleteError);
        
        // If the table doesn't exist, we need to inform the user
        if (deleteError.code === '42P01') {
          return NextResponse.json({
            success: false,
            message: "Database tables need to be created first. Please visit /api/database/notifications-setup"
          });
        }
        
        return NextResponse.json(
          { error: "Failed to clear existing notifications" },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
    }

    // Insert sample notifications
    try {
      const { error: insertError } = await adminClient
        .from('user_notifications')
        .insert(sampleNotifications);

      if (insertError) {
        console.error("Error inserting sample notifications:", insertError);
        return NextResponse.json(
          { error: "Failed to insert sample notifications" },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error during insert operation:", error);
    }

    // Create or update notification preferences
    try {
      const { error: prefError } = await adminClient
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          email_notifications: true,
          push_notifications: true,
          watchlist_alerts: true,
          budget_alerts: true,
          goal_alerts: true,
          bill_reminders: true,
          investment_updates: true
        }, { onConflict: 'user_id' });

      if (prefError) {
        console.error("Error creating notification preferences:", prefError);
      }
    } catch (error) {
      console.error("Error during preferences operation:", error);
    }

    return NextResponse.json({
      success: true,
      message: "Sample notifications created successfully",
      count: sampleNotifications.length,
    });
  } catch (error) {
    console.error("Unexpected error in creating sample notifications:", error);
    
    // Check for auth errors specifically
    if (error instanceof Error && 
        (error.toString().includes('JWT') || error.toString().includes('token is expired'))) {
      return NextResponse.json(
        { 
          error: "Authentication error", 
          message: "Your session has expired. Please refresh the page and try again.",
          details: error.toString()
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error instanceof Error ? error.toString() : 'Unknown error' },
      { status: 500 }
    );
  }
}
