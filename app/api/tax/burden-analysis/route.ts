import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema for tax burden analysis
const taxBurdenAnalysisSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  income_type: z.string().min(1),
  amount: z.number(),
  tax_paid: z.number(),
})

// GET /api/tax/burden-analysis - Get all tax burden analysis data for the user
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
      .from("tax_burden_analysis")
      .select("*")
      .eq("user_id", user.id)
    
    if (year && !isNaN(parseInt(year))) {
      query = query.eq("year", parseInt(year))
    }
    
    const { data, error } = await query.order("year", { ascending: false })

    if (error) {
      console.error("Error fetching tax burden analysis:", error)
      return NextResponse.json({ error: "Failed to fetch tax burden analysis" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/tax/burden-analysis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tax/burden-analysis - Create new tax burden analysis record
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxBurdenAnalysisSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Insert the tax burden analysis
    const { data, error } = await supabase
      .from("tax_burden_analysis")
      .insert({
        user_id: user.id,
        year: result.data.year,
        income_type: result.data.income_type,
        amount: result.data.amount,
        tax_paid: result.data.tax_paid,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating tax burden analysis:", error)
      return NextResponse.json({ error: "Failed to create tax burden analysis" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in POST /api/tax/burden-analysis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/tax/burden-analysis/:id - Update tax burden analysis
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Tax burden analysis ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxBurdenAnalysisSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Verify ownership
    const { data: existingData, error: fetchError } = await supabase
      .from("tax_burden_analysis")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingData) {
      return NextResponse.json({ error: "Tax burden analysis not found" }, { status: 404 })
    }

    // Update the tax burden analysis
    const { data, error } = await supabase
      .from("tax_burden_analysis")
      .update({
        year: result.data.year,
        income_type: result.data.income_type,
        amount: result.data.amount,
        tax_paid: result.data.tax_paid,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating tax burden analysis:", error)
      return NextResponse.json({ error: "Failed to update tax burden analysis" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/tax/burden-analysis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tax/burden-analysis/:id - Delete tax burden analysis
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Tax burden analysis ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existingData, error: fetchError } = await supabase
      .from("tax_burden_analysis")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingData) {
      return NextResponse.json({ error: "Tax burden analysis not found" }, { status: 404 })
    }

    // Delete the tax burden analysis
    const { error } = await supabase
      .from("tax_burden_analysis")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting tax burden analysis:", error)
      return NextResponse.json({ error: "Failed to delete tax burden analysis" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/burden-analysis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
