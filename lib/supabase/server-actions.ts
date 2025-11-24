'use server'

import { createServerClient as createSupabaseClient } from "@supabase/ssr"
import { cookies } from 'next/headers'

// Debug helper
const debug = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SUPABASE_SERVER_DEBUG] ${message}`, data || '')
  }
}

// Define the Database type
type Database = {
  public: any
}

export async function createServerActionClient() {
  try {
    debug('Creating server action Supabase client...')
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
    }

    const cookieStore = cookies()
    
    const client = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
        cookies: {
          get(name: string) {
            try {
              return cookieStore.get(name)?.value
            } catch (error) {
              debug(`Error getting cookie ${name}:`, error)
              return undefined
            }
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set(name, value, options)
            } catch (error) {
              debug(`Error setting cookie ${name}:`, error)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set(name, '', { 
                ...options, 
                maxAge: 0,
                expires: new Date(0)
              })
            } catch (error) {
              debug(`Error removing cookie ${name}:`, error)
            }
          },
        },
      }
    )

    if (!client) {
      throw new Error('Failed to create Supabase client')
    }

    debug('Server action Supabase client created successfully')
    return client
  } catch (error) {
    console.error('Error in createServerActionClient:', error)
    throw error
  }
}
