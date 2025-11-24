import { NextResponse } from "next/server"
import * as z from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema for tax recommendations
const recommendationSchema = z.object({
  type: z.string().min(1, "Type is required"),
  priority: z.string().min(1, "Priority is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  potential_savings: z.coerce.number().min(0, "Potential savings must be a positive number").optional(),
  action_items: z.array(z.string()).optional(),
  deadline: z.string().optional(),
  is_completed: z.boolean().default(false),
})

// GET /api/tax/recommendations/:id - Get a specific recommendation
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: "Recommendation ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Get the specific recommendation
    const { data, error } = await supabase
      .from("tax_recommendations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error || !data) {
      console.error("Error fetching tax recommendation:", error)
      return NextResponse.json({ error: "Tax recommendation not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/tax/recommendations/:id:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/tax/recommendations/:id - Update a recommendation
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: "Recommendation ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = recommendationSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Verify ownership
    const { data: existingRecommendation, error: fetchError } = await supabase
      .from("tax_recommendations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingRecommendation) {
      return NextResponse.json({ error: "Tax recommendation not found" }, { status: 404 })
    }

    // Update the recommendation
    const { data, error } = await supabase
      .from("tax_recommendations")
      .update({
        type: result.data.type,
        priority: result.data.priority,
        title: result.data.title,
        description: result.data.description,
        potential_savings: result.data.potential_savings,
        action_items: result.data.action_items,
        deadline: result.data.deadline,
        is_completed: result.data.is_completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating tax recommendation:", error)
      return NextResponse.json({ error: "Failed to update tax recommendation" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/tax/recommendations/:id:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tax/recommendations/:id - Delete a recommendation
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: "Recommendation ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existingRecommendation, error: fetchError } = await supabase
      .from("tax_recommendations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingRecommendation) {
      return NextResponse.json({ error: "Tax recommendation not found" }, { status: 404 })
    }

    // Delete the recommendation
    const { error } = await supabase
      .from("tax_recommendations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting tax recommendation:", error)
      return NextResponse.json({ error: "Failed to delete tax recommendation" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/recommendations/:id:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
