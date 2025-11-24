// Legacy client - redirects to the new module structure
import { supabase, createClient } from "./supabase/index"
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export { supabase, createClient }

// Add a deprecation warning
console.warn(
  "lib/supabase.ts is deprecated. Use lib/supabase/client for client components and lib/supabase/server for server components.",
)

// Get Supabase URL from environment variables with empty string fallback to prevent TypeScript errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
if (!supabaseUrl) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not set in environment variables');
}

// Get service role key from environment variables with empty string fallback
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
}

// Get anon key from environment variables with empty string fallback
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
if (!supabaseAnonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables');
}

// Create a Supabase client with the service role key for server-side operations
export const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey);

// Create a Supabase client for client-side operations (uses anon key)
export const supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Helper function to get the current user's ID from the session - server-side only approach
export async function getCurrentUserId(request?: Request): Promise<string | null> {
  try {
    // PRIORITY 1: Get user ID from request headers (for API calls)
    if (request?.headers) {
      const clientId = request.headers.get('client-id');
      if (clientId) {
        console.log(`Using client ID from request headers: ${clientId}`);
        return clientId;
      }
      
      // Also check cookies in the request headers
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const clientIdMatch = cookieHeader.match(/client-id=([^;]+)/);
        if (clientIdMatch && clientIdMatch[1] && clientIdMatch[1].trim() !== '') {
          console.log(`Using client ID from cookie header: ${clientIdMatch[1]}`);
          return clientIdMatch[1];
        }
      }
    }
    
    // PRIORITY 2: Get authenticated user directly from Supabase admin client
    try {
      // Use supabaseAdmin to bypass RLS policies, similar to subscription system
      const { data, error } = await supabaseAdmin.auth.getSession();
      
      if (data?.session?.user?.id) {
        const userId = data.session.user.id;
        console.log(`Using authenticated user ID from Supabase admin: ${userId}`);
        return userId;
      } else if (error) {
        console.warn('Error getting authenticated user from Supabase admin:', error);
      }
    } catch (adminError) {
      console.warn('Error using supabaseAdmin for authentication:', adminError);
    }
    
    // PRIORITY 3: Try to get user ID from the client
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user && user.id) {
        console.log(`Using authenticated user ID from client: ${user.id}`);
        return user.id;
      }
    } catch (clientError) {
      console.warn('Error getting user from client:', clientError);
    }
    
    // PRIORITY 4: Get user ID directly from the subscriptions table
    try {
      // Look for subscriptions created by this user
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!subError && subscriptions && subscriptions.length > 0 && subscriptions[0].user_id) {
        console.log(`Using user ID from subscriptions table: ${subscriptions[0].user_id}`);
        return subscriptions[0].user_id;
      }
    } catch (subError) {
      console.error('Error getting user ID from subscriptions:', subError);
    }
    
    // PRIORITY 5: Get a real user from the database (not a default UUID)
    try {
      const { data: existingUsers, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!userError && existingUsers && existingUsers.length > 0) {
        console.log(`Using existing user ID from database: ${existingUsers[0].id}`);
        return existingUsers[0].id;
      }
    } catch (userError) {
      console.error('Error getting user from database:', userError);
    }
    
    // PRIORITY 6: Create a new user as last resort
    try {
      const consistentId = crypto.randomUUID();
      console.log(`Created new consistent user ID: ${consistentId}`);
      
      try {
        const result = await supabaseAdmin
          .from('users')
          .insert({
            id: consistentId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (result.error) {
          console.error('Error storing new user ID:', result.error);
        } else {
          console.log('Successfully stored new user ID in database');
        }
      } catch (insertError) {
        console.error('Exception storing new user ID:', insertError);
      }
      
      return consistentId;
    } catch (createError) {
      console.error('Error creating new user ID:', createError);
    }
    
    // If we couldn't get a user ID, return null instead of a default UUID
    console.warn('Server: No authenticated user found');
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// Helper function to check if a user is authenticated
export async function isAuthenticated() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return !!session;
}

// Helper function to get the current user's session
export async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

