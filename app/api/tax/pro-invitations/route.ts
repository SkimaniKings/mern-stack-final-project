import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { v4 as uuidv4 } from 'uuid'

// Schema for tax pro invitations
const taxProInvitationSchema = z.object({
  pro_email: z.string().email(),
  access_level: z.enum(['view', 'edit']),
})

// GET /api/tax/pro-invitations - Get all tax pro invitations for the user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("tax_pro_invitations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tax pro invitations:", error)
      return NextResponse.json({ error: "Failed to fetch tax pro invitations" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/tax/pro-invitations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tax/pro-invitations - Create a new tax pro invitation
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxProInvitationSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Generate a unique token for the invitation
    const token = uuidv4()

    // Insert the tax pro invitation
    const { data, error } = await supabase
      .from("tax_pro_invitations")
      .insert({
        user_id: user.id,
        pro_email: result.data.pro_email,
        access_level: result.data.access_level,
        token: token,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating tax pro invitation:", error)
      return NextResponse.json({ error: "Failed to create tax pro invitation" }, { status: 500 })
    }

    // Here you would typically send an email to the tax professional with the invitation link
    // containing the token, but that's outside the scope of this implementation

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in POST /api/tax/pro-invitations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/tax/pro-invitations/:id - Update a tax pro invitation (e.g., change access level or deactivate)
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Invitation ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // We'll allow updating just the access_level and is_active fields
    const updateSchema = z.object({
      access_level: z.enum(['view', 'edit']).optional(),
      is_active: z.boolean().optional(),
    })

    // Validate request body
    const result = updateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Verify ownership
    const { data: existingInvitation, error: fetchError } = await supabase
      .from("tax_pro_invitations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingInvitation) {
      return NextResponse.json({ error: "Tax pro invitation not found" }, { status: 404 })
    }

    // Build update object with only the fields that were provided
    const updateData: any = {}
    if (result.data.access_level !== undefined) {
      updateData.access_level = result.data.access_level
    }
    if (result.data.is_active !== undefined) {
      updateData.is_active = result.data.is_active
    }

    // Update the tax pro invitation
    const { data, error } = await supabase
      .from("tax_pro_invitations")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating tax pro invitation:", error)
      return NextResponse.json({ error: "Failed to update tax pro invitation" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/tax/pro-invitations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tax/pro-invitations/:id - Delete a tax pro invitation
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Invitation ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existingInvitation, error: fetchError } = await supabase
      .from("tax_pro_invitations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingInvitation) {
      return NextResponse.json({ error: "Tax pro invitation not found" }, { status: 404 })
    }

    // Delete the tax pro invitation
    const { error } = await supabase
      .from("tax_pro_invitations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting tax pro invitation:", error)
      return NextResponse.json({ error: "Failed to delete tax pro invitation" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/pro-invitations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
