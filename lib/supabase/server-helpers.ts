'use server'

import { createServerClient as createSupabaseClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

type Cookie = {
  name: string
  value: string
}

// Type for cookie options
type CookieOptions = Omit<Cookie, 'value'> & {
  value?: string
  httpOnly?: boolean
  secure?: boolean
  maxAge?: number
  path?: string
  sameSite?: 'lax' | 'strict' | 'none'
  expires?: Date
}

// Debug helper
const debug = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SUPABASE_SERVER_DEBUG] ${message}`, data || '')
  }
}

// Helper to safely access cookies
const getCookie = (name: string): string | undefined => {
  try {
    const cookieStore = cookies()
    // Use getAll() and find the cookie by name
    const allCookies = cookieStore.getAll()
    const cookie = allCookies.find(c => c.name === name)
    return cookie?.value
  } catch (error) {
    debug(`Error getting cookie ${name}:`, error)
    return undefined
  }
}

// Helper to safely set cookies
const setCookie = (name: string, value: string, options: Omit<CookieOptions, 'name' | 'value'> = {}) => {
  try {
    const cookieStore = cookies()
    // Use the set method with an object parameter
    cookieStore.set({
      name,
      value,
      ...options
    })
  } catch (error) {
    debug(`Error setting cookie ${name}:`, error)
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

    const cookieStore = cookies()
    
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
          get: (name: string) => {
            try {
              // Use our helper function that uses getAll()
              return getCookie(name)
            } catch (error) {
              debug(`Error getting cookie ${name}:`, error)
              return undefined
            }
          },
          set: (name: string, value: string, options: any) => {
            try {
              // Use our helper function
              setCookie(name, value, options)
            } catch (error) {
              debug(`Error setting cookie ${name}:`, error)
            }
          },
          remove: (name: string, options: any) => {
            try {
              // Set maxAge to 0 to remove the cookie
              setCookie(name, '', {
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
