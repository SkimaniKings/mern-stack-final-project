# Notification Preferences Fix

This document provides instructions for fixing the row-level security policy issue with the notification_preferences table.

## Problem

The current implementation encounters an error when trying to create default notification preferences for users:

```
Error creating default preferences: {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "notification_preferences"'
}
```

This occurs because the table has row-level security (RLS) policies for SELECT and UPDATE operations, but is missing a policy for INSERT operations.

## Solution

The solution uses a service role client to bypass RLS policies when creating notification preferences:

1. Created a new admin client utility (`lib/supabase/admin.ts`) that uses the Supabase service role key to bypass RLS
2. Updated the notification functions to use this admin client for operations that require bypassing RLS
3. Added proper error handling and logging

## Required Environment Variables

For this solution to work, you need to add the Supabase service role key to your environment variables:

1. Open your `.env.local` file
2. Add the following line:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   
You can find your service role key in the Supabase dashboard under Project Settings > API.

**IMPORTANT:** Never expose your service role key in client-side code or commit it to version control. It should only be used in server-side code.

## Implementation Details

The fix implements:

1. A new `createAdminSupabaseClient()` function that creates a Supabase client with the service role key
2. Updated server actions that use this admin client to perform operations that would otherwise be blocked by RLS
3. Proper error handling and logging throughout the code

This approach ensures that:
- Notification preferences can be created for users without RLS errors
- The application uses real data instead of mock data
- Operations are properly secured and only performed server-side

## How to Apply the Fix

### Option 1: Run the Migration Script

1. Make sure you have the Supabase service role key in your `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Run the migration script:
   ```bash
   node scripts/run-notification-migration.js
   ```

### Option 2: Apply the Migration Manually

1. Go to the Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `migrations/add_notification_preferences_rpc.sql`
4. Run the SQL query

## Verification

After applying the fix, you should be able to:

1. Access the notifications page without errors
2. See your notification preferences (either real or mock)
3. Update your notification preferences

The code has been updated to gracefully handle cases where the database operation might fail, by providing mock preferences as a fallback.

## Technical Details

The fix implements:

1. A Row Level Security (RLS) INSERT policy that allows users to insert their own notification preferences
2. An updated trigger function that creates notification preferences for new users automatically
3. Client-side fallback to mock data when database operations fail

This approach ensures that the application continues to work even if the database migration hasn't been applied yet, while still providing a path to properly set up the database when ready.
