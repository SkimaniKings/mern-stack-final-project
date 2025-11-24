import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema for yearly tax data
const yearlyTaxDataSchema = z.object({
  tax_year: z.number().int().min(1900).max(2100),
  total_income: z.number().optional(),
  total_deductions: z.number().optional(),
  taxable_income: z.number().optional(),
  total_tax_paid: z.number().optional(),
  refund_or_due: z.number().optional(),
})

// GET /api/tax/yearly-data - Get all yearly tax data for the user
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // Get filter by tax_year if provided
    const url = new URL(request.url)
    const year = url.searchParams.get('year')
    
    let query = supabase
      .from("tax_yearly_data")
      .select("*")
      .eq("user_id", user.id)
    
    if (year && !isNaN(parseInt(year))) {
      query = query.eq("tax_year", parseInt(year))
    }
    
    const { data, error } = await query.order("tax_year", { ascending: false })

    if (error) {
      console.error("Error fetching yearly tax data:", error)
      return NextResponse.json({ error: "Failed to fetch yearly tax data" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/tax/yearly-data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tax/yearly-data - Create new yearly tax data
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = yearlyTaxDataSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Check if a record for this year already exists
    const { data: existingData } = await supabase
      .from("tax_yearly_data")
      .select("id")
      .eq("user_id", user.id)
      .eq("tax_year", result.data.tax_year)
      .single()

    if (existingData) {
      return NextResponse.json({ error: "Data for this tax year already exists" }, { status: 409 })
    }

    // Insert the yearly tax data
    const { data, error } = await supabase
      .from("tax_yearly_data")
      .insert({
        user_id: user.id,
        tax_year: result.data.tax_year,
        total_income: result.data.total_income,
        total_deductions: result.data.total_deductions,
        taxable_income: result.data.taxable_income,
        total_tax_paid: result.data.total_tax_paid,
        refund_or_due: result.data.refund_or_due,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating yearly tax data:", error)
      return NextResponse.json({ error: "Failed to create yearly tax data" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in POST /api/tax/yearly-data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/tax/yearly-data/:id - Update yearly tax data
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Yearly tax data ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = yearlyTaxDataSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Verify ownership
    const { data: existingData, error: fetchError } = await supabase
      .from("tax_yearly_data")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingData) {
      return NextResponse.json({ error: "Yearly tax data not found" }, { status: 404 })
    }

    // Update the yearly tax data
    const { data, error } = await supabase
      .from("tax_yearly_data")
      .update({
        tax_year: result.data.tax_year,
        total_income: result.data.total_income,
        total_deductions: result.data.total_deductions,
        taxable_income: result.data.taxable_income,
        total_tax_paid: result.data.total_tax_paid,
        refund_or_due: result.data.refund_or_due,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating yearly tax data:", error)
      return NextResponse.json({ error: "Failed to update yearly tax data" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/tax/yearly-data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tax/yearly-data/:id - Delete yearly tax data
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Yearly tax data ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existingData, error: fetchError } = await supabase
      .from("tax_yearly_data")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingData) {
      return NextResponse.json({ error: "Yearly tax data not found" }, { status: 404 })
    }

    // Delete the yearly tax data
    const { error } = await supabase
      .from("tax_yearly_data")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting yearly tax data:", error)
      return NextResponse.json({ error: "Failed to delete yearly tax data" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/yearly-data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
