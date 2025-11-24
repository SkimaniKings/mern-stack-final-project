import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema for deduction opportunity map
const deductionOpportunitySchema = z.object({
  category: z.string().min(1),
  eligible_amount: z.number(),
  claimed_amount: z.number(),
  potential_savings: z.number(),
  year: z.number().int().min(1900).max(2100),
})

// GET /api/tax/deduction-opportunities - Get all deduction opportunities for the user
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // Get filter by year if provided
    const url = new URL(request.url)
    const year = url.searchParams.get('year')
    
    let query = supabase
      .from("deduction_opportunity_map")
      .select("*")
      .eq("user_id", user.id)
    
    if (year && !isNaN(parseInt(year))) {
      query = query.eq("year", parseInt(year))
    }
    
    const { data, error } = await query.order("potential_savings", { ascending: false })

    if (error) {
      console.error("Error fetching deduction opportunities:", error)
      return NextResponse.json({ error: "Failed to fetch deduction opportunities" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/tax/deduction-opportunities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tax/deduction-opportunities - Create new deduction opportunity
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = deductionOpportunitySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Insert the deduction opportunity
    const { data, error } = await supabase
      .from("deduction_opportunity_map")
      .insert({
        user_id: user.id,
        category: result.data.category,
        eligible_amount: result.data.eligible_amount,
        claimed_amount: result.data.claimed_amount,
        potential_savings: result.data.potential_savings,
        year: result.data.year,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating deduction opportunity:", error)
      return NextResponse.json({ error: "Failed to create deduction opportunity" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in POST /api/tax/deduction-opportunities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/tax/deduction-opportunities/:id - Update deduction opportunity
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Deduction opportunity ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = deductionOpportunitySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Verify ownership
    const { data: existingData, error: fetchError } = await supabase
      .from("deduction_opportunity_map")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingData) {
      return NextResponse.json({ error: "Deduction opportunity not found" }, { status: 404 })
    }

    // Update the deduction opportunity
    const { data, error } = await supabase
      .from("deduction_opportunity_map")
      .update({
        category: result.data.category,
        eligible_amount: result.data.eligible_amount,
        claimed_amount: result.data.claimed_amount,
        potential_savings: result.data.potential_savings,
        year: result.data.year,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating deduction opportunity:", error)
      return NextResponse.json({ error: "Failed to update deduction opportunity" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/tax/deduction-opportunities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tax/deduction-opportunities/:id - Delete deduction opportunity
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Deduction opportunity ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existingData, error: fetchError } = await supabase
      .from("deduction_opportunity_map")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingData) {
      return NextResponse.json({ error: "Deduction opportunity not found" }, { status: 404 })
    }

    // Delete the deduction opportunity
    const { error } = await supabase
      .from("deduction_opportunity_map")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting deduction opportunity:", error)
      return NextResponse.json({ error: "Failed to delete deduction opportunity" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/deduction-opportunities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
