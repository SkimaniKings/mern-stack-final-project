import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema for tax professionals
const taxProfessionalSchema = z.object({
  name: z.string().min(1),
  firm: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

// GET /api/tax/professionals - Get tax professionals
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("tax_professionals")
      .select("*")
      .eq("user_id", user.id)
      .order("name")

    if (error) {
      console.error("Error fetching tax professionals:", error)
      return NextResponse.json({ error: "Failed to fetch tax professionals" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/tax/professionals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tax/professionals - Create a new tax professional
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxProfessionalSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Insert the professional
    const { data, error } = await supabase
      .from("tax_professionals")
      .insert({
        user_id: user.id,
        name: result.data.name,
        firm: result.data.firm,
        email: result.data.email,
        phone: result.data.phone,
        specialties: result.data.specialties,
        notes: result.data.notes,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating tax professional:", error)
      return NextResponse.json({ error: "Failed to create tax professional" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in POST /api/tax/professionals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 