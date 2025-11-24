import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema for tax profile validation
const taxProfileSchema = z.object({
  filing_status: z.enum(['single', 'married_joint', 'married_separate', 'head_of_household']),
  dependents: z.number().int().min(0),
  state: z.string().min(1),
  country: z.string().min(1).default('USA'),
})

// GET /api/tax/profiles - Get user's tax profile
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("tax_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error("Error fetching tax profile:", error)
      return NextResponse.json({ error: "Failed to fetch tax profile" }, { status: 500 })
    }

    return NextResponse.json(data || null)
  } catch (error) {
    console.error("Error in GET /api/tax/profiles:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tax/profiles - Create a new tax profile
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxProfileSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Check if the user already has a profile
    const { data: existingProfile } = await supabase
      .from("tax_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({ error: "User already has a tax profile" }, { status: 409 })
    }

    // Insert the tax profile
    const { data, error } = await supabase
      .from("tax_profiles")
      .insert({
        user_id: user.id,
        filing_status: result.data.filing_status,
        dependents: result.data.dependents,
        state: result.data.state,
        country: result.data.country,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating tax profile:", error)
      return NextResponse.json({ error: "Failed to create tax profile" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in POST /api/tax/profiles:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/tax/profiles - Update the user's tax profile
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxProfileSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Update the tax profile
    const { data, error } = await supabase
      .from("tax_profiles")
      .update({
        filing_status: result.data.filing_status,
        dependents: result.data.dependents,
        state: result.data.state,
        country: result.data.country,
      })
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating tax profile:", error)
      return NextResponse.json({ error: "Failed to update tax profile" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/tax/profiles:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tax/profiles - Delete the user's tax profile
export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from("tax_profiles")
      .delete()
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting tax profile:", error)
      return NextResponse.json({ error: "Failed to delete tax profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/profiles:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
