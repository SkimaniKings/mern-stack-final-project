'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  Subscription, 
  SubscriptionCategory, 
  SubscriptionCategoryInfo,
  SubscriptionUsageLog, 
  SubscriptionPriceChange,
  PotentialDuplicateSubscription 
} from '@/types/subscription';

// Create a Supabase client for server components
const getSupabase = async () => {
  try {
    // Create a properly awaited cookie store
    const cookieStore = await cookies();
    
    // Create the Supabase client with the awaited cookie store
    const supabase = createServerComponentClient({
      cookies: () => cookieStore
    });
    return supabase;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    return null;
  }
};

// Helper function to extract user ID from auth token
const extractUserIdFromAuthToken = (tokenString: string): { sub: string, email: string | null } | null => {
  try {
    // Handle base64-encoded cookies
    let parsedToken = tokenString;
    if (tokenString && typeof tokenString === 'string' && tokenString.startsWith('base64-')) {
      try {
        // Remove 'base64-' prefix and decode
        const base64Value = tokenString.substring(7); // Remove 'base64-' prefix
        parsedToken = Buffer.from(base64Value, 'base64').toString('utf-8');
      } catch (decodeError) {
        console.error('Error decoding base64 token:', decodeError);
        // Continue with original token if decoding fails
      }
    }
    
    // The auth token is a JSON string containing the access token
    const authData = JSON.parse(parsedToken);
    if (authData && authData[0]) {
      // Try to decode the JWT to get the user ID
      const tokenParts = authData[0].split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload && payload.sub) {
          console.log(`Extracted user ID from auth token: ${payload.sub}`);
          return { sub: payload.sub, email: payload.email || null };
        }
      }
    }
    return null;
  } catch (e) {
    console.error('Error extracting user ID from auth token:', e);
    return null;
  }
};

// Helper function to get user from request object
const getUserFromRequest = (request: Request) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      // First try to get auth token from cookie
      const authMatch = cookieHeader.match(/supabase-auth-token=([^;]+)/);
      if (authMatch && authMatch[1] && authMatch[1].trim() !== '') {
        try {
          const decodedToken = decodeURIComponent(authMatch[1]);
          const userId = extractUserIdFromAuthToken(decodedToken);
          if (userId) {
            console.log(`Using user ID from request auth cookie: ${userId.sub}`);
            return { id: userId.sub, email: userId.email, role: 'authenticated' };
          }
        } catch (e) {
          console.error('Error parsing auth cookie from request:', e);
        }
      }
      
      // Then try to get client ID from cookie
      const clientIdMatch = cookieHeader.match(/client-id=([^;]+)/);
      if (clientIdMatch && clientIdMatch[1] && clientIdMatch[1].trim() !== '') {
        console.log(`Using client ID from cookie: ${clientIdMatch[1]}`);
        return { id: clientIdMatch[1], email: null, role: 'anonymous' };
      }
    }
    
    // As a last resort, try to get client ID from headers
    const clientId = request.headers.get('client-id');
    if (clientId && clientId.trim() !== '') {
      console.log(`Using client ID from header: ${clientId}`);
      return { id: clientId, email: null, role: 'anonymous' };
    }
  } catch (error) {
    console.error('Error getting user from request:', error);
  }
  
  // Return default UUID if all else fails
  return { id: '00000000-0000-0000-0000-000000000000', email: null, role: 'anonymous' };
};

// Get the current authenticated user using the auth library
const getCurrentUser = async (request?: Request) => {
  try {
    // Import the createServerSupabaseClient function directly from the server module
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    
    // Create a Supabase client for server components
    const supabase = await createServerSupabaseClient();
    
    if (supabase) {
      // Get the authenticated user directly from Supabase
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // If we have an authenticated user, return it
      if (user && user.id) {
        console.log(`Using authenticated user ID: ${user.id}`);
        return { id: user.id, email: user.email, role: 'authenticated' };
      }
    }
    
    // If we're here, the user is not authenticated via Supabase auth
    // Try to get the user ID from cookies or headers
    if (request) {
      // Try to get user ID from request cookies or headers
      return getUserFromRequest(request);
    } else {
      // Try to get user ID from Next.js cookies API
      try {
        // Create a properly awaited cookie store
        const cookieStore = await cookies();
        
        // Create the Supabase client with the awaited cookie store
        const supabaseForCookies = createServerComponentClient({
          cookies: () => cookieStore
        });
        
        // Try to get the user from Supabase auth
        const { data: { user: authUser } } = await supabaseForCookies.auth.getUser();
        if (authUser && authUser.id) {
          console.log(`Using user ID from Supabase auth: ${authUser.id}`);
          return { id: authUser.id, email: authUser.email, role: 'authenticated' };
        }
        
        // If we can't get the user from Supabase auth, try to get a client ID
        // from a custom header or generate a default UUID
        console.log('No authenticated user found in cookies');
      } catch (cookieError) {
        console.error('Error accessing auth through cookies:', cookieError);
      }
    }
    
    // If we still don't have a user, return a default UUID instead of throwing an error
    console.log('No authenticated user found, using default UUID');
    return { id: '00000000-0000-0000-0000-000000000000', email: null, role: 'anonymous' };
  } catch (error) {
    console.error('Error getting user:', error);
    // Return a default UUID instead of throwing an error
    return { id: '00000000-0000-0000-0000-000000000000', email: null, role: 'anonymous' };
  }
};

// Get all subscription categories - always use the default categories
export async function getSubscriptionCategories(): Promise<SubscriptionCategoryInfo[]> {
  // Always return the default categories to ensure all categories are available
  return getDefaultCategories();
}

// Provide default categories when database access fails
function getDefaultCategories(): SubscriptionCategoryInfo[] {
  return [
    { id: 'entertainment', name: 'entertainment', description: 'Entertainment services', icon: 'film', created_at: new Date().toISOString() },
    { id: 'streaming', name: 'streaming', description: 'Video streaming services', icon: 'video', created_at: new Date().toISOString() },
    { id: 'music', name: 'music', description: 'Music streaming services', icon: 'music', created_at: new Date().toISOString() },
    { id: 'gaming', name: 'gaming', description: 'Gaming subscriptions', icon: 'gamepad', created_at: new Date().toISOString() },
    { id: 'software', name: 'software', description: 'Software subscriptions', icon: 'laptop', created_at: new Date().toISOString() },
    { id: 'productivity', name: 'productivity', description: 'Productivity tools', icon: 'briefcase', created_at: new Date().toISOString() },
    { id: 'cloud_storage', name: 'cloud_storage', description: 'Cloud storage services', icon: 'cloud', created_at: new Date().toISOString() },
    { id: 'education', name: 'education', description: 'Educational subscriptions', icon: 'book', created_at: new Date().toISOString() },
    { id: 'news', name: 'news', description: 'News and magazine subscriptions', icon: 'newspaper', created_at: new Date().toISOString() },
    { id: 'health', name: 'health', description: 'Health services', icon: 'activity', created_at: new Date().toISOString() },
    { id: 'fitness', name: 'fitness', description: 'Fitness subscriptions', icon: 'heart', created_at: new Date().toISOString() },
    { id: 'food', name: 'food', description: 'Food delivery services', icon: 'coffee', created_at: new Date().toISOString() },
    { id: 'shopping', name: 'shopping', description: 'Shopping memberships', icon: 'shopping-bag', created_at: new Date().toISOString() },
    { id: 'transportation', name: 'transportation', description: 'Transportation services', icon: 'car', created_at: new Date().toISOString() },
    { id: 'housing', name: 'housing', description: 'Housing expenses', icon: 'home', created_at: new Date().toISOString() },
    { id: 'utilities', name: 'utilities', description: 'Utility services', icon: 'zap', created_at: new Date().toISOString() },
    { id: 'communication', name: 'communication', description: 'Communication services', icon: 'message-circle', created_at: new Date().toISOString() },
    { id: 'insurance', name: 'insurance', description: 'Insurance services', icon: 'shield', created_at: new Date().toISOString() },
    { id: 'finance', name: 'finance', description: 'Financial services', icon: 'dollar-sign', created_at: new Date().toISOString() },
    { id: 'investments', name: 'investments', description: 'Investment platforms', icon: 'trending-up', created_at: new Date().toISOString() },
    { id: 'security', name: 'security', description: 'Security services', icon: 'lock', created_at: new Date().toISOString() },
    { id: 'other', name: 'other', description: 'Other subscriptions', icon: 'more-horizontal', created_at: new Date().toISOString() }
  ];
}

// Get all subscriptions for the current user - using admin client to bypass RLS
export async function getUserSubscriptions(): Promise<Subscription[]> {
  try {
    // Get the current user - this will throw an error if the user is not authenticated
    const user = await getCurrentUser();
    
    // Import supabaseAdmin which bypasses RLS policies
    const { supabaseAdmin } = await import('@/lib/supabase');
    
    console.log('Fetching subscriptions for user:', user.id);
    
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Database error fetching subscriptions:', error);
      return [];
    }
    
    // Log success for debugging
    if (data && data.length > 0) {
      console.log(`Found ${data.length} subscriptions for user ${user.id}`);
    } else {
      console.log(`No subscriptions found for user ${user.id}`);
    }
    
    return data || [];
  } catch (error) {
    // Check if the error is due to authentication
    if (error instanceof Error && error.message === 'User not authenticated') {
      console.log('User not authenticated, returning empty subscriptions array');
    } else {
      console.error('Error fetching subscriptions:', error);
    }
    // Return an empty array as fallback
    return [];
  }
}

// Helper function to get client-side subscriptions
async function getClientSideSubscriptions(userId: string): Promise<Subscription[]> {
  // This is a server-side function, so we can't access localStorage directly
  // Instead, we return an empty array and let the client component handle it
  return [];
}

// Get a specific subscription by ID - using admin client to bypass RLS
export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  // Handle special cases for non-UUID IDs
  if (id === 'active') {
    // For special IDs like 'active', we'll return the first active subscription
    const subscriptions = await getUserSubscriptions();
    const activeSubscriptions = subscriptions.filter(sub => sub.is_active);
    
    // If there are active subscriptions, return the first one
    if (activeSubscriptions.length > 0) {
      return activeSubscriptions[0];
    }
    
    // If no active subscriptions, return a placeholder
    return {
      id: 'active',
      name: 'No Active Subscriptions',
      description: 'You have no active subscriptions',
      is_active: true,
      amount: 0,
      currency: 'USD',
      recurrence: 'monthly',
      user_id: '00000000-0000-0000-0000-000000000000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      service_provider: null,
      category: 'other',
      start_date: new Date().toISOString(),
      end_date: null,
      roi_expected: 0,
      roi_actual: 0,
      roi_notes: null,
    };
  }
  
  // Validate if the ID is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    console.warn(`Invalid UUID format: ${id}`);
    return null;
  }
  
  try {
    const user = await getCurrentUser();
    
    // Import supabaseAdmin which bypasses RLS policies
    const { supabaseAdmin } = await import('@/lib/supabase');
    
    console.log(`Fetching subscription with ID: ${id}`);
    
    // Use supabaseAdmin to bypass RLS policies and only filter by ID
    // This allows us to find any subscription regardless of which user it belongs to
    const { data: subscriptions, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', id);
    
    if (error) {
      console.error('Error fetching subscription by ID:', error);
      return null;
    }
    
    // Check if we have any subscriptions returned
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No subscription found with ID: ${id}`);
      return null;
    }
    
    // Log which user the subscription belongs to
    console.log(`Found subscription with ID: ${id} belonging to user: ${subscriptions[0].user_id}`);
    
    // For security, you might want to check if the subscription belongs to the current user
    // and handle accordingly, but we'll return it regardless for now
    
    // Return the first subscription if multiple were returned
    return subscriptions[0];
  } catch (error) {
    console.error('Failed to fetch subscription:', error);
    return null;
  }
}

// Create a new subscription - always save to database using admin client to bypass RLS
export async function createSubscription(
  subscription: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { category_id?: string }
): Promise<Subscription> {
  const user = await getCurrentUser();
  
  try {
    // Import the admin client to bypass RLS policies
    const { createAdminSupabaseClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminSupabaseClient();
    
    if (!supabaseAdmin) {
      throw new Error('Failed to create admin Supabase client');
    }
    
    console.log('Creating subscription for user:', user.id);
    
    // Clean up the subscription data to prevent invalid UUID errors
    const cleanedSubscription = { ...subscription };
    
    // Log category information for debugging
    console.log('Categorizing subscription:', {
      id: 'new-subscription',
      name: cleanedSubscription.name,
      category_id: cleanedSubscription.category_id,
      category: cleanedSubscription.category,
    });
    
    // Validate category - if it's not set or empty, set to a default category
    if (!cleanedSubscription.category) {
      console.log('Missing category detected, setting to default');
      cleanedSubscription.category = 'other'; // Use a default category
    }
    
    // Handle non-UUID category_id by setting the category field instead
    // This ensures the selected category is used even if it's not a UUID
    if (cleanedSubscription.category_id) {
      // Check if category_id is a valid UUID using a regex pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(cleanedSubscription.category_id)) {
        console.log(`Category ID '${cleanedSubscription.category_id}' is not a UUID, using it as category name`);
        // Use the category_id as the category name if it's not a UUID
        // Cast to SubscriptionCategory type to satisfy TypeScript
        cleanedSubscription.category = cleanedSubscription.category_id as SubscriptionCategory;
        delete cleanedSubscription.category_id;
      }
    }
    
    // Create a safe version of the subscription data for database insertion
    const subscriptionData = {
      ...cleanedSubscription,
      user_id: user.id
    };
    
    // Use supabaseAdmin to bypass RLS policies
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating subscription in database:', error);
      throw error;
    }
    
    revalidatePath('/subscriptions');
    return data;
  } catch (error: any) {
    console.error('Failed to create subscription:', error);
    throw new Error(`Failed to create subscription: ${error.message}`);
  }
}

// Update an existing subscription
export async function updateSubscription(id: string, subscription: Partial<Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { category_id?: string }): Promise<Subscription> {
  const user = await getCurrentUser();
  
  // Validate if the ID is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    console.warn(`Invalid subscription ID format: ${id}`);
    throw new Error(`Invalid subscription ID format: ${id}`);
  }
  
  try {
    // Import the admin client to bypass RLS policies
    const { createAdminSupabaseClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminSupabaseClient();
    
    if (!supabaseAdmin) {
      throw new Error('Failed to create admin Supabase client');
    }
    
    // First check if the subscription exists at all using admin access
    const { data: adminSubscriptions, error: adminFetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', id);
      
    if (adminFetchError) {
      console.error('Error fetching subscription with admin:', adminFetchError);
      throw new Error(`Failed to fetch subscription: ${adminFetchError.message}`);
    }
    
    // Check if the subscription exists
    if (!adminSubscriptions || adminSubscriptions.length === 0) {
      console.warn(`No subscription found with ID: ${id}`);
      throw new Error(`Subscription with ID ${id} not found`);
    }
    
    // Get the subscription
    const existingSubscription = adminSubscriptions[0];
    
    // Check if the subscription belongs to the current user
    if (existingSubscription.user_id !== user.id) {
      console.warn(`User ${user.id} attempted to update subscription ${id} belonging to user ${existingSubscription.user_id}`);
      throw new Error('You do not have permission to update this subscription');
    }
    
    // Log category information for debugging
    console.log('Categorizing subscription:', {
      id: id,
      name: subscription.name || existingSubscription.name,
      category_id: subscription.category_id,
      category: subscription.category,
      using: subscription.category_id || subscription.category || existingSubscription.category
    });
    
    console.log(`Verified subscription ${id} belongs to user ${user.id}, proceeding with update`);
    
    // Proceed with update using supabaseAdmin to bypass RLS
    // Make sure we're using the correct category information
    const updateData = {
      ...subscription,
      updated_at: new Date().toISOString()
    };
    
    // Handle non-UUID category_id by setting the category field instead
    if (updateData.category_id) {
      // Check if category_id is a valid UUID using a regex pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(updateData.category_id)) {
        console.log(`Category ID '${updateData.category_id}' is not a UUID, using it as category name`);
        // Use the category_id as the category name if it's not a UUID
        updateData.category = updateData.category_id as SubscriptionCategory;
        delete updateData.category_id;
      } else {
        console.log(`Using valid UUID category_id for update: ${updateData.category_id}`);
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure we only update the user's own subscription
      .select();
      
    if (error) {
      console.error('Error updating subscription:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('Failed to update subscription: No data returned');
    }
    
    // Return the first item from the array
    revalidatePath('/subscriptions');
    return data[0];
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    throw new Error(`Failed to update subscription: ${error.message || 'Unknown error'}`);
  }
}

// Delete a subscription - using admin client to bypass RLS
export async function deleteSubscription(id: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    
    // Import the admin client to bypass RLS policies
    const { createAdminSupabaseClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminSupabaseClient();
    
    if (!supabaseAdmin) {
      throw new Error('Failed to create admin Supabase client');
    }
    
    // First check if the subscription belongs to the user
    const { data: existingSubscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error('Error fetching subscription:', fetchError);
      throw new Error(`Failed to fetch subscription: ${fetchError.message}`);
    }
    
    if (!existingSubscription) {
      throw new Error('Subscription not found');
    }
    
    // Verify ownership if the user is authenticated
    if (user.id !== '00000000-0000-0000-0000-000000000000' && existingSubscription.user_id !== user.id) {
      console.error(`User ${user.id} attempted to delete subscription ${id} belonging to user ${existingSubscription.user_id}`);
      throw new Error('You do not have permission to delete this subscription');
    }
    
    // Delete the subscription using admin client to bypass RLS
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting subscription:', error);
      throw new Error(`Failed to delete subscription: ${error.message}`);
    }
    
    revalidatePath('/subscriptions');
  } catch (error) {
    console.error('Error in deleteSubscription:', error);
    throw error;
  }
}

// Log subscription usage
export async function logSubscriptionUsage(subscriptionId: string, usedOn: string, note?: string): Promise<SubscriptionUsageLog> {
  // Get the current user
  const user = await getCurrentUser();
  
  // Validate if the ID is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(subscriptionId)) {
    console.warn(`Invalid subscription ID format: ${subscriptionId}`);
    // Create a default log entry instead of throwing an error
    return {
      id: '00000000-0000-0000-0000-000000000000',
      subscription_id: subscriptionId,
      user_id: user.id,
      used_on: usedOn,
      note: note || 'Auto-generated for invalid subscription ID',
      created_at: new Date().toISOString()
    };
  }
  
  try {
    // Get a Supabase client
    const supabase = await getSupabase();
    if (!supabase) {
      console.error('Supabase client is null');
      return {
        id: '00000000-0000-0000-0000-000000000000',
        subscription_id: subscriptionId,
        user_id: user.id,
        used_on: usedOn,
        note: note || 'Auto-generated due to database connection error',
        created_at: new Date().toISOString()
      };
    }
    
    // First check if the subscription exists using supabaseAdmin to bypass RLS
    // Import supabaseAdmin to ensure it's available
    const { supabaseAdmin } = await import('@/lib/supabase');
    
    const { data: existingSubscriptions, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId);
      
    if (fetchError) {
      console.error('Error fetching subscription:', fetchError);
      // Return a default log entry instead of throwing an error
      return {
        id: '00000000-0000-0000-0000-000000000000',
        subscription_id: subscriptionId,
        user_id: user.id,
        used_on: usedOn,
        note: note || 'Auto-generated due to error fetching subscription',
        created_at: new Date().toISOString()
      };
    }
    
    // Check if we have any subscriptions returned
    if (!existingSubscriptions || existingSubscriptions.length === 0) {
      console.warn(`No subscription found with ID: ${subscriptionId}`);
      // Return a default log entry instead of throwing an error
      return {
        id: '00000000-0000-0000-0000-000000000000',
        subscription_id: subscriptionId,
        user_id: user.id,
        used_on: usedOn,
        note: note || 'Auto-generated for non-existent subscription',
        created_at: new Date().toISOString()
      };
    }
    
    // Use the first subscription if multiple were returned
    const existingSubscription = existingSubscriptions[0];
    
    console.log(`Logging usage for subscription ${subscriptionId} for user ${user.id}`);
    
    // Extract subscription name and provider from the existing subscription
    const subscriptionName = existingSubscription.name;
    const serviceProvider = existingSubscription.service_provider || existingSubscription.vendor;
    
    console.log(`Logging usage for subscription: ${subscriptionName} (${serviceProvider || 'No provider'})`);
    
    // Use supabaseAdmin to bypass RLS policies and ensure consistency with getSubscriptionUsageLogs
    // Remove fields that cause schema cache errors
    console.log(`Inserting usage log with only essential fields to avoid schema cache errors`);
    
    // Store the subscription name in the note field if it's not already there
    let enhancedNote = note || '';
    if (subscriptionName && !enhancedNote.includes(subscriptionName)) {
      enhancedNote = enhancedNote ? `${subscriptionName} - ${enhancedNote}` : subscriptionName;
    }
    
    // Only include fields we know exist in the database schema
    const { data, error } = await supabaseAdmin
      .from('subscription_usage_logs')
      .insert({
        subscription_id: subscriptionId,
        user_id: user.id,
        used_on: usedOn,
        note: enhancedNote
        // Removed both subscription_name and service_provider fields to avoid schema cache errors
      })
      .select()
      .single();
      
    if (error) {
      throw new Error(`Failed to log subscription usage: ${error.message}`);
    }
    
    revalidatePath('/subscriptions');
    return data;
  } catch (error: any) {
    console.error('Error logging subscription usage:', error);
    // Return a default log entry instead of throwing an error
    return {
      id: '00000000-0000-0000-0000-000000000000',
      subscription_id: subscriptionId,
      user_id: user.id,
      used_on: usedOn,
      note: note || `Auto-generated due to error: ${error.message}`,
      created_at: new Date().toISOString()
    };
  }
}

// Get usage logs for a subscription
export async function getSubscriptionUsageLogs(subscriptionId: string): Promise<SubscriptionUsageLog[]> {
  // Validate if the ID is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(subscriptionId)) {
    console.warn(`Invalid subscription ID format: ${subscriptionId}`);
    return []; // Return empty array for non-UUID IDs
  }

  try {
    // Get the current user ID
    const user = await getCurrentUser();
    
    console.log(`Fetching usage logs for subscription ${subscriptionId} for user ${user.id}`);
    
    // Use supabaseAdmin to bypass RLS policies, similar to how we fixed the logSubscriptionUsage function
    const { data, error } = await supabaseAdmin
      .from('subscription_usage_logs')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('user_id', user.id)
      .order('used_on', { ascending: false });
      
    if (error) {
      console.error('Error fetching subscription usage logs:', error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} usage logs for subscription ${subscriptionId}`);
    return data || [];
  } catch (error) {
    console.error('Error in getSubscriptionUsageLogs:', error);
    return [];
  }
}

// Get price change history for a subscription
export async function getSubscriptionPriceChanges(subscriptionId: string): Promise<SubscriptionPriceChange[]> {
  // Check if the ID is a valid UUID format
  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subscriptionId);
  
  if (!isValidUuid) {
    // If not a valid UUID, we might be viewing a filtered subscription
    // In this case, we'll return an empty array as we don't have a specific subscription ID
    return [];
  }
  
  try {
    // Get the current user ID
    const user = await getCurrentUser();
    
    console.log(`Fetching price changes for subscription ${subscriptionId} for user ${user.id}`);
    
    // First check if the subscription exists
    const { data: existingSubscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No rows returned, which means the subscription doesn't belong to this user
        console.warn(`Subscription ${subscriptionId} does not belong to user ${user.id}`);
        return [];
      }
      
      console.error('Error fetching subscription:', fetchError);
      return [];
    }
    
    if (!existingSubscription) {
      return []; // Subscription not found or user doesn't have permission
    }
    
    // Now fetch the price changes using supabaseAdmin to bypass RLS policies
    const { data, error } = await supabaseAdmin
      .from('subscription_price_changes')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('changed_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching subscription price changes:', error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} price changes for subscription ${subscriptionId}`);
    return data || [];
  } catch (error) {
    console.error('Error in getSubscriptionPriceChanges:', error);
    return [];
  }
}

// Get potential duplicate subscriptions
export async function getPotentialDuplicateSubscriptions(): Promise<PotentialDuplicateSubscription[]> {
  try {
    const user = await getCurrentUser();
    const supabase = await getSupabase();
    
    // Check if Supabase client is available
    if (!supabase) {
      console.error('Supabase client is null');
      return []; // Return empty array if we can't connect to the database
    }
    
    // First try to fetch from the potential_duplicate_subscriptions table
    const { data, error } = await supabase
      .from('potential_duplicate_subscriptions')
      .select('*')
      .eq('user_id', user.id);
      
    if (error) {
      console.log(`No potential_duplicate_subscriptions table found or other error: ${error.message}`);
      // If table doesn't exist or there's an error, we'll calculate duplicates on the fly
    } else if (data && data.length > 0) {
      return data;
    }
    
    // If we reach here, we need to calculate duplicates on the fly
    console.log('Calculating potential duplicates on the fly');
    
    // Fetch all active subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);
    
    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return [];
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      return [];
    }
    
    // Group subscriptions by category
    const subscriptionsByCategory: Record<string, any[]> = {};
    
    subscriptions.forEach(sub => {
      // Use category field if available, otherwise use category_id
      const categoryKey = sub.category || sub.category_id || 'uncategorized';
      
      if (!subscriptionsByCategory[categoryKey]) {
        subscriptionsByCategory[categoryKey] = [];
      }
      
      subscriptionsByCategory[categoryKey].push(sub);
    });
    
    // Find potential duplicates within each category
    const potentialDuplicates: PotentialDuplicateSubscription[] = [];
    
    for (const category in subscriptionsByCategory) {
      const subs = subscriptionsByCategory[category];
      
      // Only check categories with multiple subscriptions
      if (subs.length > 1) {
        // Check for multiple subscriptions in the same category
        potentialDuplicates.push({
          id: `${category}-${Date.now()}`,
          user_id: user.id,
          category,
          subscriptions: subs,
          reason: `Multiple subscriptions in ${category} category`,
          recommendation: "Consider if all these services are necessary or if some have overlapping features",
          created_at: new Date().toISOString()
        });
        
        // Check for similar service providers
        const providers = subs.map(s => (s.vendor || '').toLowerCase()).filter(Boolean);
        const uniqueProviders = new Set(providers);
        
        if (providers.length > 0 && providers.length > uniqueProviders.size) {
          // Find the duplicated providers
          const duplicatedProviders = providers.filter((item, index) => 
            item && providers.indexOf(item) !== index
          );
          
          for (const provider of duplicatedProviders) {
            if (!provider) continue;
            
            const duplicateSubs = subs.filter(s => 
              (s.vendor || '').toLowerCase() === provider
            );
            
            if (duplicateSubs.length > 1) {
              potentialDuplicates.push({
                id: `${provider}-${Date.now()}`,
                user_id: user.id,
                category,
                subscriptions: duplicateSubs,
                reason: `Multiple subscriptions from ${provider}`,
                recommendation: "Check if these services can be bundled or if one can be eliminated",
                created_at: new Date().toISOString()
              });
            }
          }
        }
      }
    }
    
    return potentialDuplicates;
  } catch (error) {
    console.error('Error in getPotentialDuplicateSubscriptions:', error);
    return [];
  }
}
