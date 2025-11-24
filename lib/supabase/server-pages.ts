import { createServerClient as createSupabaseServerClient, type CookieOptions } from "@supabase/ssr"
import type { Database } from "./database.types"
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next"

// Server-side client for Pages Router
export function createServerSupabaseClient(context?: {
  req: NextApiRequest
  res: NextApiResponse
} | GetServerSidePropsContext) {
  if (!context) {
    throw new Error("Context is required for Pages Router Supabase client")
  }

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return context.req.cookies[name]
        },
        set(name: string, value: string, options: CookieOptions) {
          context.res.setHeader(
            "Set-Cookie",
            `${name}=${value}; ${Object.entries(options)
              .map(([key, value]) => `${key}=${value}`)
              .join("; ")}`
          )
        },
        remove(name: string, options: CookieOptions) {
          context.res.setHeader(
            "Set-Cookie",
            `${name}=; Max-Age=0; ${Object.entries(options)
              .map(([key, value]) => `${key}=${value}`)
              .join("; ")}`
          )
        },
      },
    }
  )
}

// Alias for createServerSupabaseClient to maintain compatibility
export const createClient = createServerSupabaseClient
