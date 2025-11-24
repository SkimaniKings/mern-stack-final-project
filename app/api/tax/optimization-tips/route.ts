import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema for tax optimization tips validation
const taxOptimizationTipSchema = z.object({
  tip: z.string().min(1),
  category: z.string().min(1),
  impact_estimate: z.number().optional(),
  is_implemented: z.boolean().default(false),
})

// GET /api/tax/optimization-tips - Get all tax optimization tips for the user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("tax_optimization_tips")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tax optimization tips:", error)
      return NextResponse.json({ error: "Failed to fetch tax optimization tips" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/tax/optimization-tips:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tax/optimization-tips - Create a new tax optimization tip
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxOptimizationTipSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Insert the tax optimization tip
    const { data, error } = await supabase
      .from("tax_optimization_tips")
      .insert({
        user_id: user.id,
        tip: result.data.tip,
        category: result.data.category,
        impact_estimate: result.data.impact_estimate,
        is_implemented: result.data.is_implemented,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating tax optimization tip:", error)
      return NextResponse.json({ error: "Failed to create tax optimization tip" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in POST /api/tax/optimization-tips:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/tax/optimization-tips/:id - Update a tax optimization tip
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Tip ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxOptimizationTipSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Verify ownership
    const { data: existingTip, error: fetchError } = await supabase
      .from("tax_optimization_tips")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingTip) {
      return NextResponse.json({ error: "Tax optimization tip not found" }, { status: 404 })
    }

    // Update the tax optimization tip
    const { data, error } = await supabase
      .from("tax_optimization_tips")
      .update({
        tip: result.data.tip,
        category: result.data.category,
        impact_estimate: result.data.impact_estimate,
        is_implemented: result.data.is_implemented,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating tax optimization tip:", error)
      return NextResponse.json({ error: "Failed to update tax optimization tip" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/tax/optimization-tips:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tax/optimization-tips/:id - Delete a tax optimization tip
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Tip ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existingTip, error: fetchError } = await supabase
      .from("tax_optimization_tips")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingTip) {
      return NextResponse.json({ error: "Tax optimization tip not found" }, { status: 404 })
    }

    // Delete the tax optimization tip
    const { error } = await supabase
      .from("tax_optimization_tips")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting tax optimization tip:", error)
      return NextResponse.json({ error: "Failed to delete tax optimization tip" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/optimization-tips:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
