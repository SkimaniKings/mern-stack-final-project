import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema for tax advantaged accounts validation
const taxAdvantagedAccountSchema = z.object({
  account_type: z.enum(['401k', 'IRA', 'HSA', '529', 'Roth IRA', 'SEP IRA', 'FSA']),
  reason: z.string().optional(),
  estimated_tax_savings: z.number().optional(),
  recommended_contribution: z.number().optional(),
})

// GET /api/tax/advantaged-accounts - Get all tax advantaged accounts for the user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("tax_advantaged_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("account_type")

    if (error) {
      console.error("Error fetching tax advantaged accounts:", error)
      return NextResponse.json({ error: "Failed to fetch tax advantaged accounts" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/tax/advantaged-accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tax/advantaged-accounts - Create a new tax advantaged account
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxAdvantagedAccountSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Insert the tax advantaged account
    const { data, error } = await supabase
      .from("tax_advantaged_accounts")
      .insert({
        user_id: user.id,
        account_type: result.data.account_type,
        reason: result.data.reason,
        estimated_tax_savings: result.data.estimated_tax_savings,
        recommended_contribution: result.data.recommended_contribution,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating tax advantaged account:", error)
      return NextResponse.json({ error: "Failed to create tax advantaged account" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in POST /api/tax/advantaged-accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/tax/advantaged-accounts/:id - Update a tax advantaged account
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxAdvantagedAccountSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Verify ownership
    const { data: existingAccount, error: fetchError } = await supabase
      .from("tax_advantaged_accounts")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingAccount) {
      return NextResponse.json({ error: "Tax advantaged account not found" }, { status: 404 })
    }

    // Update the tax advantaged account
    const { data, error } = await supabase
      .from("tax_advantaged_accounts")
      .update({
        account_type: result.data.account_type,
        reason: result.data.reason,
        estimated_tax_savings: result.data.estimated_tax_savings,
        recommended_contribution: result.data.recommended_contribution,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating tax advantaged account:", error)
      return NextResponse.json({ error: "Failed to update tax advantaged account" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/tax/advantaged-accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tax/advantaged-accounts/:id - Delete a tax advantaged account
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = new URL(request.url).pathname.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existingAccount, error: fetchError } = await supabase
      .from("tax_advantaged_accounts")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingAccount) {
      return NextResponse.json({ error: "Tax advantaged account not found" }, { status: 404 })
    }

    // Delete the tax advantaged account
    const { error } = await supabase
      .from("tax_advantaged_accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting tax advantaged account:", error)
      return NextResponse.json({ error: "Failed to delete tax advantaged account" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/advantaged-accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
