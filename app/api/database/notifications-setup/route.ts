import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/supabase/auth-refresh";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// This is a direct fix for the database structure
// It will create the tables with the correct structure
export async function GET() {
  try {
    // First refresh the auth session to prevent JWT expiration errors
    await refreshSession();
    
    const adminClient = await createAdminSupabaseClient();
    const supabase = await createServerSupabaseClient();
    
    if (!adminClient || !supabase) {
      return NextResponse.json(
        { error: "Failed to create Supabase clients" },
        { status: 500 }
      );
    }

    // Let's directly execute SQL to fix the database structure
    console.log("Starting database fix...");
    
    // First, check if tables exist with correct structure
    try {
      const { data: notificationData, error: notificationError } = await adminClient
        .from('user_notifications')
        .select('user_id')
        .limit(1);
      
      const { data: preferencesData, error: preferencesError } = await adminClient
        .from('notification_preferences')
        .select('user_id')
        .limit(1);
      
      // If we get specific column errors, we need to recreate the tables
      if ((notificationError && (notificationError.code === '42703' || notificationError.code === '42P01')) || 
          (preferencesError && preferencesError.code === '42P01')) {
        
        console.log("Tables missing or have incorrect structure, recreating...");
        
        // First, try to create a function to execute our SQL
        const createFunctionSql = `
          CREATE OR REPLACE FUNCTION setup_notification_tables() RETURNS void AS $$
          BEGIN
            -- Drop existing tables and views
            DROP TABLE IF EXISTS user_notifications CASCADE;
            DROP TABLE IF EXISTS notification_preferences CASCADE;
            DROP TABLE IF EXISTS notification_types CASCADE;
            DROP VIEW IF EXISTS user_notification_history CASCADE;

            -- Create notification_types table
            CREATE TABLE notification_types (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL UNIQUE,
              description TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Create user_notifications table
            CREATE TABLE user_notifications (
              notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID NOT NULL,
              notification_type TEXT NOT NULL,
              message TEXT NOT NULL,
              link TEXT,
              is_read BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Create notification_preferences table
            CREATE TABLE notification_preferences (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID NOT NULL UNIQUE,
              email_notifications BOOLEAN DEFAULT TRUE,
              push_notifications BOOLEAN DEFAULT TRUE,
              watchlist_alerts BOOLEAN DEFAULT TRUE,
              budget_alerts BOOLEAN DEFAULT TRUE,
              goal_alerts BOOLEAN DEFAULT TRUE,
              bill_reminders BOOLEAN DEFAULT TRUE,
              investment_updates BOOLEAN DEFAULT TRUE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Create user_notification_history view
            CREATE VIEW user_notification_history AS
            SELECT 
              notification_id,
              user_id,
              notification_type,
              message,
              link,
              is_read,
              created_at,
              updated_at
            FROM user_notifications
            ORDER BY created_at DESC;

            -- Insert default notification types
            INSERT INTO notification_types (name, description) VALUES
              ('General Alert', 'General system alerts and notifications'),
              ('Watchlist Alert', 'Alerts related to watchlist items'),
              ('Budget Alert', 'Alerts related to budget limits'),
              ('Goal Alert', 'Reminders about progress and milestones for your goals'),
              ('Bill Reminder', 'Reminders about upcoming or due bills'),
              ('Investment Update', 'Updates about investment performance'),
              ('System Update', 'System updates and maintenance notifications')
            ON CONFLICT (name) DO NOTHING;
            
            -- Refresh the PostgREST schema cache
            PERFORM pg_notify('pgrst', 'reload schema');
          END;
          $$ LANGUAGE plpgsql;
        `;
        
        // Execute the function creation
        const { error: functionError } = await adminClient.rpc('execute_sql', { 
          sql_query: createFunctionSql 
        });
        
        if (functionError) {
          console.error("Error creating setup function:", functionError);
          return NextResponse.json({
            success: false,
            message: "Failed to create database setup function",
            error: functionError
          }, { status: 500 });
        }
        
        // Now call the function to set up the tables
        const { error: setupError } = await adminClient.rpc('execute_sql', { 
          sql_query: 'SELECT setup_notification_tables();' 
        });
        
        if (setupError) {
          console.error("Error setting up tables:", setupError);
          return NextResponse.json({
            success: false,
            message: "Failed to set up tables",
            error: setupError
          }, { status: 500 });
        }
      }
    } catch (error) {
      console.error("Error checking table structure:", error);
      return NextResponse.json({
        success: false,
        message: "Error checking database structure",
        error: error instanceof Error ? error.toString() : 'Unknown error'
      }, { status: 500 });
    }

    // Let's ensure notification types are created
    try {
      const { error: typesError } = await adminClient.from('notification_types').upsert([
        { name: "General Alert", description: "General system alerts and notifications" },
        { name: "Watchlist Alert", description: "Alerts related to watchlist items" },
        { name: "Budget Alert", description: "Alerts related to budget limits" },
        { name: "Expense Reminder", description: "Reminders about upcoming or overdue expenses" },
        { name: "Bill Reminder", description: "Reminders about upcoming or due bills" },
        { name: "Investment Update", description: "Updates about investment performance" },
        { name: "System Update", description: "System updates and maintenance notifications" }
      ], { onConflict: 'name' });
      
      if (typesError) {
        console.error("Error upserting notification types:", typesError);
        
        if (typesError.code === '42P01') {
          // Table doesn't exist
          return NextResponse.json({
            success: false,
            message: "The notification_types table doesn't exist. Please run the database setup again."
          }, { status: 500 });
        }
      } else {
        console.log("Successfully upserted notification types");
      }
    } catch (error) {
      console.error("Error creating notification types:", error);
    }
    
    // Refresh the PostgREST schema cache
    try {
      const { error: refreshError } = await adminClient.rpc('execute_sql', { 
        sql_query: "SELECT pg_notify('pgrst', 'reload schema');" 
      });
      
      if (refreshError) {
        console.error("Error refreshing schema cache:", refreshError);
      } else {
        console.log("Successfully refreshed schema cache");
      }
    } catch (error) {
      console.error("Error during schema refresh:", error);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Notification system setup completed successfully."
    });
    
  } catch (error) {
    console.error("Error in database setup:", error);
    
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
