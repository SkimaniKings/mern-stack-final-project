import { NextResponse } from "next/server"
import * as z from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema to match the form fields exactly
const timelineEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  due_date: z.string().min(1, "Due date is required"),
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.string().optional(),
  is_completed: z.boolean().default(false),
})

// Handler for GET requests to fetch a specific timeline item
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Access the id parameter safely
    const id = Array.isArray(context.params.id) ? context.params.id[0] : context.params.id
    
    if (!id) {
      return NextResponse.json({ error: "Timeline item ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Failed to initialize database connection" }, { status: 500 })
    }

    // Get the specific timeline event for the user
    const { data, error } = await supabase
      .from("tax_timeline")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching timeline event:", error)
      return NextResponse.json({ error: "Failed to fetch timeline event" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/tax/timeline/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Handler for PUT requests to update a specific timeline item
export async function PUT(
  request: Request,
  { params }: { params: { id: string | string[] } }
) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Initialize Supabase client
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Failed to initialize database connection" }, { status: 500 })
    }
    
    // Get the ID parameter
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    
    if (!id) {
      return NextResponse.json({ error: "Timeline item ID is required" }, { status: 400 })
    }
    
    // Parse the request body
    const body = await request.json()

    // Create a schema for validation that adapts to database structure
    const updateTimelineSchema = z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
      due_date: z.string().min(1, "Due date is required"),
      is_recurring: z.boolean().default(false),
      recurrence_pattern: z.string().optional(),
      is_completed: z.boolean().optional(), // Make is_completed optional
      status: z.string().optional() // Add status field for compatibility
    })

    // Log the incoming request body for debugging
    console.log("Received timeline update request:", body)
    
    // Validate the request body
    const result = updateTimelineSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ 
        error: "Invalid request data",
        details: result.error.format() 
      }, { status: 400 })
    }

    // Convert is_completed to status if needed
    const updateData = {
      title: result.data.title,
      description: result.data.description,
      due_date: new Date(result.data.due_date),
      is_recurring: result.data.is_recurring,
      recurrence_pattern: result.data.recurrence_pattern,
      status: result.data.is_completed ? "completed" : "pending"
    }

    // If status was provided directly, use that instead
    if (result.data.status) {
      updateData.status = result.data.status
    }

    try {
      // Check if the tax_timeline table has the is_completed column
      const { error: schemaError } = await supabase
        .from("tax_timeline")
        .select("is_completed")
        .limit(1)
      
      // If there's an error with the schema, try to update without the is_completed field
      if (schemaError && schemaError.message.includes("is_completed")) {
        console.log("The tax_timeline table doesn't have the is_completed column, using status field instead")
        
        // Update using only the fields that exist in the current schema
        const { data, error } = await supabase
          .from("tax_timeline")
          .update({
            title: result.data.title,
            description: result.data.description,
            due_date: new Date(result.data.due_date),
            status: result.data.is_completed ? 'completed' : 'pending',
            is_recurring: result.data.is_recurring,
            recurrence_pattern: result.data.recurrence_pattern
          })
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single()
        
        if (error) {
          console.error("Error updating timeline event:", error)
          throw error
        }
        
        return NextResponse.json({
          ...data,
          is_completed: data.status === 'completed'
        })
      } else {
        // Update with all fields including is_completed
        const { data, error } = await supabase
          .from("tax_timeline")
          .update({
            title: result.data.title,
            description: result.data.description,
            due_date: new Date(result.data.due_date),
            status: result.data.is_completed ? 'completed' : 'pending',
            is_recurring: result.data.is_recurring,
            recurrence_pattern: result.data.recurrence_pattern,
            is_completed: result.data.is_completed,
            updated_at: new Date()
          })
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json(data)
      }
    } catch (updateError) {
      console.error("Error updating timeline event:", updateError)
      return NextResponse.json({ error: "Failed to update timeline event" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in PUT /api/tax/timeline/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Handler for DELETE requests to remove a specific timeline item
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Access the id parameter safely
    const id = Array.isArray(context.params.id) ? context.params.id[0] : context.params.id
    
    if (!id) {
      return NextResponse.json({ error: "Timeline item ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Failed to initialize database connection" }, { status: 500 })
    }

    // Delete the timeline event
    const { error } = await supabase
      .from("tax_timeline")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user can only delete their own items

    if (error) {
      console.error("Error deleting timeline event:", error)
      return NextResponse.json({ error: "Failed to delete timeline event" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tax/timeline/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
