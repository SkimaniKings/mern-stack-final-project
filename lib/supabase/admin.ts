import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Create a Supabase admin client with the service role key
// This client bypasses RLS policies and should only be used in server-side code
export function createAdminSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables')
    return null
  }
  
  try {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  } catch (error) {
    console.error('Error creating admin Supabase client:', error)
    return null
  }
}
