import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { supabaseAdmin, getCurrentUserId } from "@/lib/supabase";
import { SubscriptionCategory, SubscriptionRecurrence } from "@/types/subscription";

// Schema for subscription validation
const subscriptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  service_provider: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(0, "Amount must be a positive number"),
  currency: z.string().default("USD"),
  recurrence: z.string().min(1, "Recurrence is required"),
  start_date: z.string().transform(str => new Date(str)),
  end_date: z.string().nullable().transform(str => str ? new Date(str) : null),
  is_active: z.boolean().default(true),
  roi_expected: z.number().nullable(),
  roi_actual: z.number().nullable(),
  roi_notes: z.string().nullable(),
});

// GET /api/subscriptions/[id] - Get a specific subscription
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Ensure subscriptions table exists
    await ensureSubscriptionsTableExists();
    
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        payments (
          id,
          amount,
          date,
          status,
          payment_method,
          transaction_id
        )
      `)
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error("[SUBSCRIPTION_GET]", error);
      
      // If table doesn't exist, return not found
      if (error.code === "42P01") {
        return new NextResponse("Subscription not found", { status: 404 });
      }
      
      return new NextResponse("Database error: " + error.message, { status: 500 });
    }
    
    if (!subscription) {
      return new NextResponse("Not found", { status: 404 });
    }
    
    return NextResponse.json(subscription);
  } catch (error) {
    console.error("[SUBSCRIPTION_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// PATCH /api/subscriptions/[id] - Update a subscription
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Ensure subscriptions table exists
    await ensureSubscriptionsTableExists();
    
    const body = await req.json();
    const validatedData = subscriptionSchema.parse(body);
    
    // Check if subscription exists and belongs to user
    const { data: existingSubscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      console.error("[SUBSCRIPTION_PATCH_CHECK]", fetchError);
      
      // If table doesn't exist, return not found
      if (fetchError.code === "42P01") {
        return new NextResponse("Subscription not found", { status: 404 });
      }
      
      // If no rows found, return not found
      if (fetchError.code === "PGRST116") {
        return new NextResponse("Not found", { status: 404 });
      }
      
      return new NextResponse("Database error: " + fetchError.message, { status: 500 });
    }
    
    if (!existingSubscription) {
      return new NextResponse("Not found", { status: 404 });
    }
    
    // Transform the data to match the database column names
    const subscriptionData = {
      name: validatedData.name,
      service_provider: validatedData.service_provider,
      description: validatedData.description,
      category: validatedData.category,
      amount: validatedData.amount,
      currency: validatedData.currency,
      recurrence: validatedData.recurrence,
      start_date: validatedData.start_date,
      end_date: validatedData.end_date,
      is_active: validatedData.is_active,
      roi_expected: validatedData.roi_expected,
      roi_actual: validatedData.roi_actual,
      roi_notes: validatedData.roi_notes,
      updated_at: new Date().toISOString()
    };
    
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      console.error("[SUBSCRIPTION_PATCH]", error);
      return new NextResponse("Database error: " + error.message, { status: 500 });
    }
    
    return NextResponse.json(subscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    
    console.error("[SUBSCRIPTION_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// DELETE /api/subscriptions/[id] - Delete a subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Await params to get the ID
    const { id } = await params;
    
    // Use the proper async pattern for cookies in Next.js 14
    // Note: cookies() is not a Promise in Next.js 14, so we don't actually await it
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Try to get the user ID from various sources
    let userId = '00000000-0000-0000-0000-000000000000'; // Default fallback
    
    // Try to get from auth
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        console.log(`Authenticated user found: ${userId}`);
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
    
    // If we couldn't get a user ID from auth, try to get from request headers or cookies
    if (userId === '00000000-0000-0000-0000-000000000000') {
      // Check headers
      const clientId = request.headers.get('x-client-id') || request.headers.get('client-id');
      if (clientId) {
        userId = clientId;
        console.log(`Using client ID from header: ${userId}`);
      } else {
        // Check cookies - use try/catch to handle potential errors
        try {
          // In Next.js 14, cookies() is not a Promise
          const clientIdCookie = cookieStore.get('client-id');
          if (clientIdCookie) {
            userId = clientIdCookie.value;
            console.log(`Using client ID from cookie: ${userId}`);
          }
        } catch (cookieError) {
          console.error('Error getting client ID from cookie:', cookieError);
        }
      }
    }
    
    console.log(`Deleting subscription ${id} for user ${userId}`);
    
    try {
      // Import the admin client to bypass RLS policies
      const { createAdminSupabaseClient } = await import('@/lib/supabase/admin');
      const supabaseAdmin = createAdminSupabaseClient();
      
      if (!supabaseAdmin) {
        console.error('Failed to create admin Supabase client');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
      
      // First verify the subscription belongs to the user
      const { data: subscription, error: fetchError } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching subscription:', fetchError);
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }
      
      if (!subscription) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }
      
      // Verify ownership if the user is authenticated
      if (userId !== '00000000-0000-0000-0000-000000000000' && subscription.user_id !== userId) {
        console.error(`User ${userId} attempted to delete subscription ${id} belonging to user ${subscription.user_id}`);
        return NextResponse.json({ error: 'You do not have permission to delete this subscription' }, { status: 403 });
      }
      
      // Delete the subscription using admin client to bypass RLS
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting subscription:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    } catch (deleteError) {
      console.error('Error in subscription deletion:', deleteError);
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in DELETE handler:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Note: Helper functions for table creation have been removed
// Tables should be created using migrations or database setup scripts
