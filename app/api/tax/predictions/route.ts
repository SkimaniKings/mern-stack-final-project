import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema for tax impact predictions
const taxImpactPredictionSchema = z.object({
  scenario: z.string().min(1),
  description: z.string().optional(),
  estimated_tax_impact: z.number().optional(),
  difference: z.number().optional(),
  current_tax_burden: z.number().optional(),
  predicted_tax_burden: z.number().optional(),
  notes: z.string().optional(),
});

// GET /api/tax/predictions - Get tax impact predictions
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Failed to initialize database connection" }, { status: 500 })
    }

    const { data, error } = await supabase
      .from("tax_impact_predictions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tax impact predictions:", error)
      return NextResponse.json({ error: "Failed to fetch tax impact predictions" }, { status: 500 })
    }

    // Enhance each record with metadata from the notes JSON so the UI retains the values after refresh
    const enhancedData = (data || []).map((record: any) => {
      let current_tax_burden = 0;
      let predicted_tax_burden = 0;

      if (record.notes && typeof record.notes === 'string' && record.notes.startsWith('{')) {
        try {
          const meta = JSON.parse(record.notes);
          current_tax_burden = meta.current_tax_burden ?? current_tax_burden;
          predicted_tax_burden = meta.predicted_tax_burden ?? predicted_tax_burden;
        } catch (e) {
          // Ignore JSON parse errors – keep defaults
        }
      }

      return {
        ...record,
        current_tax_burden,
        predicted_tax_burden,
        difference: record.estimated_tax_impact // keep same naming convention used elsewhere
      };
    });

    return NextResponse.json(enhancedData)
  } catch (error) {
    console.error("Error in GET /api/tax/predictions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tax/predictions - Create a new tax impact prediction
export async function POST(request: Request) {
  try {
    // Get the current user with better error handling
    let user;
    try {
      user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized", details: "User not authenticated" }, { status: 401 })
      }
    } catch (authError: any) {
      console.error("Authentication error in tax predictions API:", authError)
      // Handle auth session missing error specifically
      if (authError.message?.includes("Auth session missing")) {
        return NextResponse.json({ 
          error: "Authentication error", 
          details: "Your session has expired. Please log in again.",
          code: "AUTH_SESSION_MISSING"
        }, { status: 401 })
      }
      return NextResponse.json({ error: "Authentication error", details: authError.message }, { status: 401 })
    }

    // Initialize Supabase client with better error handling
    let supabase;
    try {
      supabase = await createServerSupabaseClient()
      if (!supabase) {
        return NextResponse.json({ error: "Database error", details: "Failed to initialize database connection" }, { status: 500 })
      }
    } catch (dbError: any) {
      console.error("Database connection error in tax predictions API:", dbError)
      return NextResponse.json({ error: "Database error", details: dbError.message }, { status: 500 })
    }
    
    // Parse and validate request body
    let body;
    try {
      body = await request.json()
    } catch (parseError: any) {
      console.error("Error parsing request body:", parseError)
      return NextResponse.json({ error: "Invalid request", details: "Could not parse request body" }, { status: 400 })
    }

    // Validate request body
    const result = taxImpactPredictionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Prepare data for insertion, storing detailed numbers in a structured 'notes' field
    const { data: validatedData } = result;

    const metadata: Record<string, any> = {
      current_tax_burden: validatedData.current_tax_burden || 0,
      predicted_tax_burden: validatedData.predicted_tax_burden || 0,
    };

    // If there are user-provided notes, add them to the metadata object
    if (validatedData.notes && validatedData.notes.trim() !== '') {
        metadata.user_notes = validatedData.notes;
    }

    const insertData = {
      user_id: user.id,
      financial_decision: validatedData.scenario,
      description: validatedData.description,
      notes: JSON.stringify(metadata), // Store the metadata object as a JSON string
      estimated_tax_impact: validatedData.estimated_tax_impact ?? validatedData.difference,
      prediction_date: new Date().toISOString()
    };

    // Insert the new prediction
    const { data, error } = await supabase
      .from("tax_impact_predictions")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error("Error creating tax impact prediction:", error)
      return NextResponse.json({ error: "Failed to create tax impact prediction" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in POST /api/tax/predictions:", error.message)
    // Provide more detailed error information
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message || "An unexpected error occurred",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// PUT /api/tax/predictions/:id - Update a tax impact prediction
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Prediction ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Failed to initialize database connection" }, { status: 500 })
    }
    
    const body = await request.json()

    // Validate request body
    const result = taxImpactPredictionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Verify ownership
    const { data: existingPrediction, error: fetchError } = await supabase
      .from("tax_impact_predictions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingPrediction) {
      return NextResponse.json({ error: "Prediction not found or unauthorized" }, { status: 404 })
    }

    // Prepare update data
    const updateData = {
      financial_decision: result.data.scenario,
      description: result.data.description,
      notes: result.data.notes,
      estimated_tax_impact: result.data.estimated_tax_impact || result.data.difference,
      updated_at: new Date()
    }

    // Update the prediction
    const { data, error } = await supabase
      .from("tax_impact_predictions")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating tax impact prediction:", error)
      return NextResponse.json({ error: "Failed to update tax impact prediction" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/tax/predictions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tax/predictions/:id - Delete a tax impact prediction
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Prediction ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Failed to initialize database connection" }, { status: 500 })
    }

    // Verify ownership
    const { data: existingPrediction, error: fetchError } = await supabase
      .from("tax_impact_predictions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingPrediction) {
      return NextResponse.json({ error: "Prediction not found or unauthorized" }, { status: 404 })
    }

    // Delete the prediction
    const { error } = await supabase
      .from("tax_impact_predictions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting tax impact prediction:", error)
      return NextResponse.json({ error: "Failed to delete tax impact prediction" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/predictions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
