'use server'

import { createServerClient as createSupabaseClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

type CookieOptions = {
  name: string
  value: string
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
    console.log(`[SUPABASE_UTILS_DEBUG] ${message}`, data || '')
  }
}

// Helper to safely access cookies
const getCookie = async (name: string): Promise<string | undefined> => {
  try {
    const cookieStore = await cookies()
    const allCookies = await cookieStore.getAll()
    const cookie = allCookies.find((c: { name: string }) => c.name === name)
    return cookie?.value
  } catch (error) {
    debug(`Error getting cookie ${name}:`, error)
    return undefined
  }
}

// Helper to safely set cookies
const setCookie = async (name: string, value: string, options: Omit<CookieOptions, 'name' | 'value'> = {}): Promise<void> => {
  try {
    const cookieStore = await cookies()
    
    // Default options for Netlify deployment and cross-tab persistence
    const defaultOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure in production
      sameSite: 'lax' as const, // Changed from default to 'lax' for better compatibility
      path: '/', // App-wide access
      maxAge: 60 * 60 * 24 * 7, // 7 days
      ...options
    }

    // For production/Netlify, use more permissive settings for cross-tab sharing
    if (process.env.NODE_ENV === 'production') {
      defaultOptions.sameSite = 'none' as const
      defaultOptions.secure = true
      // Use Netlify domain if available
      if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL !== '*.netlify.app') {
        const domain = process.env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, '').split('/')[0]
        if (domain.includes('.netlify.app')) {
          (defaultOptions as any).domain = '.netlify.app'
        }
      }
    }

    await cookieStore.set({
      name,
      value,
      ...defaultOptions
    } as any) // Type assertion for Next.js 14 compatibility
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

    const cookieStore = await cookies()

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
          get: async (name: string) => {
            try {
              const value = await getCookie(name)
              return value
            } catch (error) {
              debug(`Error getting cookie ${name}:`, error)
              return undefined
            }
          },
          set: async (name: string, value: string, options: any) => {
            try {
              // Enhanced cookie options for cross-tab persistence
              const enhancedOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                ...options
              }

              // For production/Netlify, add domain configuration
              if (process.env.NODE_ENV === 'production') {
                enhancedOptions.secure = true
                enhancedOptions.sameSite = 'none'
                if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL !== '*.netlify.app') {
                  const domain = process.env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, '').split('/')[0]
                  if (domain.includes('.netlify.app')) {
                    (enhancedOptions as any).domain = '.netlify.app'
                  }
                }
              }

              await setCookie(name, value, enhancedOptions)
            } catch (error) {
              debug(`Error setting cookie ${name}:`, error)
            }
          },
          remove: async (name: string, options: any) => {
            try {
              const removeOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                maxAge: 0,
                expires: new Date(0),
                ...options
              }

              // For production/Netlify, add domain configuration
              if (process.env.NODE_ENV === 'production') {
                removeOptions.secure = true
                removeOptions.sameSite = 'none'
                if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL !== '*.netlify.app') {
                  const domain = process.env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, '').split('/')[0]
                  if (domain.includes('.netlify.app')) {
                    (removeOptions as any).domain = '.netlify.app'
                  }
                }
              }

              await setCookie(name, '', removeOptions)
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

/**
 * Get the authenticated user's session
 * Uses getUser() for security and falls back to getSession() if needed
 */
export async function getServerSession() {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      console.error('Failed to create Supabase client')
      return null
    }

    // First try to get the user (most secure method)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Error getting user:', userError)
      // Fall back to getSession if getUser fails
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.warn('Fell back to getSession after getUser failed')
      }
      return session || null
    }

    // If we have a user, get the session
    if (user) {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    }

    return null
  } catch (error) {
    console.error('Error in getServerSession:', error)
    return null
  }
}

// For backward compatibility
export const createServerClient = createServerSupabaseClient
export const getServerSupabaseClient = createServerSupabaseClient
