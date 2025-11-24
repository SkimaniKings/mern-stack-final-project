import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin, getCurrentUserId } from "@/lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { SubscriptionCategory, SubscriptionRecurrence } from "@/types/subscription"

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
  roi_notes: z.string().nullable()
})

// GET /api/subscriptions - Get all subscriptions for the current user
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
        console.log(`Found authenticated user: ${userId}`);
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
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure subscriptions table exists
    await ensureSubscriptionsTableExists()
    
    const { data: subscriptions, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true })
    
    if (error) {
      console.error("[SUBSCRIPTIONS_GET]", error)
      
      // If table doesn't exist despite our attempt to create it, return empty array
      if (error.code === "42P01") {
        return NextResponse.json([])
      }
      
      return new NextResponse("Database error", { status: 500 })
    }
    
    return NextResponse.json(subscriptions || [])
  } catch (error) {
    console.error("[SUBSCRIPTIONS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// POST /api/subscriptions - Create a new subscription
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure subscriptions table exists
    await ensureSubscriptionsTableExists()
    
    const body = await req.json()
    const validatedData = subscriptionSchema.parse(body)
    
    // Transform the data to match the database column names
    const subscriptionData = {
      user_id: userId,
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
      roi_notes: validatedData.roi_notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single()
    
    if (error) {
      console.error("[SUBSCRIPTIONS_POST]", error)
      return new NextResponse("Database error: " + error.message, { status: 500 })
    }
    
    return NextResponse.json(subscription)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[SUBSCRIPTIONS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// Helper function to ensure subscriptions table exists
async function ensureSubscriptionsTableExists() {
  try {
    // Check if subscriptions table exists
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (error && error.code === "42P01") {
      console.log("subscriptions table doesn't exist, creating it...")
      
      // Create subscriptions table using RPC
      const { error: createError } = await supabaseAdmin.rpc('create_subscriptions_table')
      
      if (createError) {
        console.error("Error creating subscriptions table:", createError)
      } else {
        console.log("Successfully created subscriptions table")
        
        // Create sample subscription categories if needed
        await createSampleCategories()
      }
    }
  } catch (error) {
    console.error("Error ensuring subscriptions table exists:", error)
    // Continue execution even if table creation fails
  }
}

// Helper function to create sample subscription categories
async function createSampleCategories() {
  try {
    // Check if subscription_categories table exists
    const { error: checkError } = await supabaseAdmin
      .from('subscription_categories')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (checkError && checkError.code === "42P01") {
      // Create subscription_categories table
      await supabaseAdmin.rpc('create_subscription_categories_table')
      
      // Sample categories
      const sampleCategories = [
        { name: "Streaming", color: "#E50914", icon: "video" },
        { name: "Software", color: "#0066FF", icon: "code" },
        { name: "Music", color: "#1DB954", icon: "music" },
        { name: "News", color: "#000000", icon: "newspaper" },
        { name: "Cloud Storage", color: "#00A4EF", icon: "cloud" },
        { name: "Fitness", color: "#FF2B63", icon: "dumbbell" },
        { name: "Gaming", color: "#107C10", icon: "gamepad" },
        { name: "Productivity", color: "#7719AA", icon: "briefcase" }
      ]
      
      // Insert sample categories
      await supabaseAdmin
        .from('subscription_categories')
        .insert(sampleCategories)
      
      console.log("Created sample subscription categories")
    }
  } catch (error) {
    console.error("Error creating sample categories:", error)
  }
}