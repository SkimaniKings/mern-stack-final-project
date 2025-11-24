'use server'

import { createServerClient as createSupabaseClient } from "@supabase/ssr"
import { cookies } from 'next/headers'
import type { Database } from "./database.types"

// Debug helper
const debug = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SUPABASE_SERVER_DEBUG] ${message}`, data || '')
  }
}

export async function createServerSupabaseClient() {
  try {
    debug('Creating server-side Supabase client...')
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
    }

    // Get the cookie store asynchronously
    const cookieStore = await cookies()
    
    // Helper function to get all cookies as an object
    const getAllCookies = async () => {
      const allCookies = await cookieStore.getAll()
      return allCookies.reduce((acc, cookie) => {
        acc[cookie.name] = cookie.value
        return acc
      }, {} as Record<string, string>)
    }
    
    // Get initial cookies
    const initialCookies = await getAllCookies()
    
    return createSupabaseClient<Database>(
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
              // Return from initial cookies to avoid async operation
              return initialCookies[name]
            } catch (error) {
              debug(`Error getting cookie ${name}:`, error)
              return undefined
            }
          },
          set: async (name: string, value: string, options: any) => {
            try {
              await cookieStore.set(name, value, options)
            } catch (error) {
              debug(`Error setting cookie ${name}:`, error)
            }
          },
          remove: async (name: string, options: any) => {
            try {
              await cookieStore.set(name, '', { 
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
  } catch (error) {
    console.error('Error in createServerSupabaseClient:', error)
    throw error
  }
}

// For backward compatibility
export const createServerClient = createServerSupabaseClient
export const getServerSupabaseClient = createServerSupabaseClient
