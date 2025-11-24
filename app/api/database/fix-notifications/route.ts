import { NextResponse } from "next/server";

// This is a dedicated endpoint to provide instructions for fixing the notifications database structure
export async function GET() {
  try {
    // Return clear instructions for fixing the database structure
    return NextResponse.json({
      title: "Database Fix Instructions",
      message: "The notifications tables have incorrect structure and need to be fixed manually.",
      instructions: [
        "1. Go to your Supabase dashboard",
        "2. Navigate to the SQL Editor",
        "3. Copy the SQL script below",
        "4. Run the script to recreate the tables with the correct structure",
        "5. Return to your application and refresh"
      ],
      sql: `
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
  ('Expense Reminder', 'Reminders about upcoming or overdue expenses'),
  ('Bill Reminder', 'Reminders about upcoming or due bills'),
  ('Investment Update', 'Updates about investment performance'),
  ('System Update', 'System updates and maintenance notifications')
ON CONFLICT (name) DO NOTHING;

-- Refresh the PostgREST schema cache to ensure new tables are recognized
NOTIFY pgrst, 'reload schema';
`
    });
  } catch (error) {
    console.error("Error in fix-notifications endpoint:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
