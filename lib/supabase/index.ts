// This file provides a unified interface for Supabase clients
// and helps with migration from the legacy client

// Import the client-side Supabase client
import { createClientSupabaseClient, supabase as browserSupabase } from "./client"

// Determine if we're in the app directory or pages directory
const isAppDirectory = process.env.NEXT_RUNTIME === 'nodejs' && typeof window === 'undefined'

// Dynamically import the appropriate server client based on the environment
let createServerClient: any
let serverSupabase: any

if (isAppDirectory) {
  // For App Router, use the App Router-compatible server client
  try {
    const serverModule = require('./server')
    createServerClient = serverModule.createServerSupabaseClient
    serverSupabase = serverModule.createClient
  } catch (error) {
    console.error('Failed to import App Router Supabase client:', error)
  }
} else {
  // For Pages Router, use the Pages Router-compatible server client
  try {
    const pagesServerModule = require('./server-pages')
    createServerClient = pagesServerModule.createServerSupabaseClient
    serverSupabase = pagesServerModule.createClient
  } catch (error) {
    console.error('Failed to import Pages Router Supabase client:', error)
  }
}

// Export the server client
export const createClient = createServerClient
export const supabase = serverSupabase

// Export the browser client
export const createBrowserClient = createClientSupabaseClient
export const browserSupabaseClient = browserSupabase

// Add a deprecation warning for direct imports
if (typeof window !== "undefined") {
  console.warn(
    "Importing from lib/supabase directly is deprecated. Use lib/supabase/client for client components and lib/supabase/server for server components.",
  )
}

