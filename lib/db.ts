import { createServerClient as createClient } from '@/lib/supabase/server'

// Export the createClient function directly
export const getSupabase = createClient

// Helper function to get the current user ID from the session
export async function getCurrentUserId() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id
}

// Generic database error handler
export function handleDatabaseError(error: any) {
  console.error('Database operation failed:', error)
  
  if (error?.code === '42P01') {
    return { error: 'The requested table does not exist. Please check your database setup.' }
  }
  
  if (error?.code === '23505') {
    return { error: 'A record with this information already exists.' }
  }
  
  if (error?.code === '23503') {
    return { error: 'This operation references a record that does not exist.' }
  }
  
  return { error: 'An unexpected database error occurred. Please try again later.' }
}

// Helper to ensure RLS policies are respected by adding user_id filter
export function withUserFilter(query: any, userId: string) {
  return query.eq('user_id', userId)
}
