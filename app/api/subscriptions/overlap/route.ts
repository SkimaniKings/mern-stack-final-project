import { NextResponse } from "next/server"
import { headers, cookies } from "next/headers"
import { z } from "zod"
import { supabaseAdmin, getCurrentUserId } from "@/lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { OverlappingSubscription } from "@/types/subscription"

// Schema for overlap check validation
const overlapCheckSchema = z.object({
  service_provider: z.string().min(1, "Service provider is required"),
  start_date: z.string().transform(str => new Date(str)),
  end_date: z.string().nullable().transform(str => str ? new Date(str) : null),
  current_id: z.string().uuid().nullable()
})

// Check for overlapping subscriptions
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    const body = await req.json()
    const validatedData = overlapCheckSchema.parse(body)
    
    // Call the database function to check for overlaps
    const { data, error } = await supabaseAdmin.rpc(
      'check_subscription_overlap',
      {
        p_user_id: userId,
        p_service_provider: validatedData.service_provider,
        p_start_date: validatedData.start_date.toISOString(),
        p_end_date: validatedData.end_date ? validatedData.end_date.toISOString() : null,
        p_current_id: validatedData.current_id
      }
    )
    
    if (error) {
      console.error("[SUBSCRIPTION_OVERLAP_CHECK]", error)
      return new NextResponse("Database error: " + error.message, { status: 500 })
    }
    
    return NextResponse.json(data || [])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[SUBSCRIPTION_OVERLAP_CHECK]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// GET all potential overlapping subscriptions for a user
export async function GET(request: Request) {
  try {
    // Create a server-side Supabase client that can access the user's session
    const supabase = await createServerSupabaseClient();
    let userId: string;
    
    // Check if we have a valid Supabase client
    if (supabase) {
      // Get the authenticated user ID using the server-side client
      const { data: { user } } = await supabase.auth.getUser();
      
      // ALWAYS prioritize the authenticated user ID
      if (user?.id) {
        userId = user.id;
        console.log(`Using authenticated user ID for overlap detection: ${userId}`);
        // Continue with the authenticated user ID
      } else {
        // No authenticated user found, fall back to client ID
        userId = await getCurrentUserId(request);
        console.log(`No authenticated user found, using fallback ID: ${userId}`);
      }
    } else {
      // If Supabase client creation failed, fall back to client ID
      userId = await getCurrentUserId(request);
      console.log(`Supabase client creation failed, using fallback ID: ${userId}`);
    }
    
    // Get all active subscriptions for the user
    // Using supabaseAdmin to bypass RLS policies
    const { data: subscriptions, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      // Make is_active optional to include all subscriptions
      .or('is_active.eq.true,is_active.is.null')
    
    if (error) {
      console.error("[SUBSCRIPTION_OVERLAPS_GET]", error)
      return new NextResponse("Database error", { status: 500 })
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json([])
    }
    
    // Group subscriptions by category
    const subscriptionsByCategory: Record<string, any[]> = {}
    
    subscriptions.forEach(subscription => {
      // Normalize category value for grouping
      // First try category field, then category_id, then fallback to 'uncategorized'
      let categoryValue = 'uncategorized';
      
      if (subscription.category) {
        // If category is a string, use it directly
        categoryValue = subscription.category;
      } else if (subscription.category_id) {
        // If category_id is present, use it
        categoryValue = subscription.category_id;
      }
      
      // Convert to lowercase for case-insensitive comparison
      const category = categoryValue.toLowerCase();
      
      // Log the category value for debugging
      console.log('Categorizing subscription:', {
        id: subscription.id,
        name: subscription.name,
        category_id: subscription.category_id,
        category: subscription.category,
        using: category,
        vendor: subscription.vendor
      });
      
      if (!subscriptionsByCategory[category]) {
        subscriptionsByCategory[category] = [];
      }
      subscriptionsByCategory[category].push(subscription);
    })
    
    // Find categories with 2 or more subscriptions (duplicates)
    const overlappingCategories = Object.entries(subscriptionsByCategory)
      .filter(([_, categorySubscriptions]) => (categorySubscriptions as any[]).length >= 2)
      .map(([category, categorySubscriptions]) => {
        return {
          category: category,
          service_provider: category, // For backward compatibility with frontend
          subscriptions: (categorySubscriptions as any[]).map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            amount: sub.amount,
            currency: sub.currency,
            category: sub.category,
            category_id: sub.category_id,  // Add category_id field
            service_provider: sub.service_provider,
            provider: sub.provider,
            start_date: sub.start_date,
            end_date: sub.end_date,
            billing_cycle: sub.billing_cycle,
            billing_frequency: sub.billing_frequency,
            payment_cycle: sub.payment_cycle,
            recurrence: sub.recurrence,
            status: sub.status,
            is_active: sub.is_active,
            usage_value: sub.usage_value,
            usage_frequency: sub.usage_frequency,
            usage_level: sub.usage_level,
            next_billing_date: sub.next_billing_date,
            next_payment_date: sub.next_payment_date,
            next_renewal_date: sub.next_renewal_date
          })),
          count: (categorySubscriptions as any[]).length
        }
      })
    
    return NextResponse.json(overlappingCategories)
  } catch (error) {
    console.error("[SUBSCRIPTION_OVERLAPS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
