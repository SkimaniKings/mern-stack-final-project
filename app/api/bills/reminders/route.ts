import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin, getCurrentUserId } from "@/lib/supabase"

// Schema for bill reminder validation
const reminderSchema = z.object({
  billId: z.string().min(1, "Bill ID is required"),
  reminderDate: z.string().transform(str => new Date(str)),
  reminderType: z.enum(["email", "push", "sms", "in_app"]).default("in_app"),
  message: z.string().optional(),
  isActive: z.boolean().default(true),
})

// GET /api/bills/reminders - Get all bill reminders for the current user
export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bill reminders table exists
    await ensureBillRemindersTableExists()
    
    // Get query parameters for filtering
    const { searchParams } = new URL(req.url)
    const billId = searchParams.get("billId")
    const active = searchParams.get("active")
    const upcoming = searchParams.get("upcoming")
    
    // Start building the query
    let query = supabaseAdmin
      .from('bill_reminders')
      .select('*, bills(id, name, due_date, amount, status)')
      .eq('user_id', userId)
    
    // Apply filters if provided
    if (billId) {
      query = query.eq('bill_id', billId)
    }
    
    if (active === 'true') {
      query = query.eq('is_active', true)
    } else if (active === 'false') {
      query = query.eq('is_active', false)
    }
    
    if (upcoming === 'true') {
      // Get reminders for the next 7 days
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(today.getDate() + 7)
      
      query = query
        .gte('reminder_date', today.toISOString())
        .lte('reminder_date', nextWeek.toISOString())
        .eq('is_active', true)
    }
    
    // Execute the query with ordering
    const { data: reminders, error } = await query.order('reminder_date', { ascending: true })
    
    if (error) {
      console.error("[BILL_REMINDERS_GET]", error)
      
      // If table doesn't exist despite our attempt to create it, return empty array
      if (error.code === "42P01") {
        return NextResponse.json([])
      }
      
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return NextResponse.json(reminders || [])
  } catch (error) {
    console.error("[BILL_REMINDERS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// POST /api/bills/reminders - Create a new bill reminder
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bill reminders table exists
    await ensureBillRemindersTableExists()
    
    const body = await req.json()
    const validatedData = reminderSchema.parse(body)
    
    // Check if bill exists and belongs to user
    const { data: bill, error: billError } = await supabaseAdmin
      .from('bills')
      .select('id, due_date, name')
      .eq('id', validatedData.billId)
      .eq('user_id', userId)
      .single()
    
    if (billError) {
      console.error("[BILL_REMINDERS_POST_CHECK]", billError)
      
      if (billError.code === "PGRST116") {
        return new NextResponse("Bill not found", { status: 404 })
      }
      
      return new NextResponse(`Database error: ${billError.message}`, { status: 500 })
    }
    
    // Generate default message if not provided
    let message = validatedData.message
    if (!message) {
      const dueDate = new Date(bill.due_date).toLocaleDateString()
      message = `Reminder: Your bill "${bill.name}" is due on ${dueDate}.`
    }
    
    // Transform the data to match the database column names
    const reminderData = {
      user_id: userId,
      bill_id: validatedData.billId,
      reminder_date: validatedData.reminderDate,
      reminder_type: validatedData.reminderType,
      message,
      is_active: validatedData.isActive,
      is_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: reminder, error } = await supabaseAdmin
      .from('bill_reminders')
      .insert(reminderData)
      .select()
      .single()
    
    if (error) {
      console.error("[BILL_REMINDERS_POST]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return NextResponse.json(reminder)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[BILL_REMINDERS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// PATCH /api/bills/reminders - Update a bill reminder
export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    const body = await req.json()
    
    if (!body.id) {
      return new NextResponse("Reminder ID is required", { status: 400 })
    }
    
    // Ensure bill reminders table exists
    await ensureBillRemindersTableExists()
    
    // Check if reminder exists and belongs to user
    const { data: existingReminder, error: checkError } = await supabaseAdmin
      .from('bill_reminders')
      .select('id, is_sent')
      .eq('id', body.id)
      .eq('user_id', userId)
      .single()
    
    if (checkError) {
      console.error("[BILL_REMINDERS_PATCH_CHECK]", checkError)
      
      if (checkError.code === "PGRST116") {
        return new NextResponse("Reminder not found", { status: 404 })
      }
      
      return new NextResponse(`Database error: ${checkError.message}`, { status: 500 })
    }
    
    // Don't allow editing reminders that have already been sent
    if (existingReminder.is_sent) {
      return new NextResponse("Cannot modify reminders that have already been sent", { status: 403 })
    }
    
    // Parse and validate the update data
    const validatedData = reminderSchema.parse(body)
    
    // Transform the data to match the database column names
    const reminderData = {
      bill_id: validatedData.billId,
      reminder_date: validatedData.reminderDate,
      reminder_type: validatedData.reminderType,
      message: validatedData.message,
      is_active: validatedData.isActive,
      updated_at: new Date().toISOString()
    }
    
    const { data: reminder, error } = await supabaseAdmin
      .from('bill_reminders')
      .update(reminderData)
      .eq('id', body.id)
      .select()
      .single()
    
    if (error) {
      console.error("[BILL_REMINDERS_PATCH]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return NextResponse.json(reminder)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[BILL_REMINDERS_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// DELETE /api/bills/reminders - Delete a bill reminder
export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const billId = searchParams.get("billId")
    
    if (!id && !billId) {
      return new NextResponse("Either reminder ID or bill ID is required", { status: 400 })
    }
    
    // Ensure bill reminders table exists
    await ensureBillRemindersTableExists()
    
    let query = supabaseAdmin
      .from('bill_reminders')
      .delete()
      .eq('user_id', userId)
    
    if (id) {
      // Delete a specific reminder
      query = query.eq('id', id)
    } else if (billId) {
      // Delete all reminders for a specific bill
      query = query.eq('bill_id', billId)
    }
    
    const { error } = await query
    
    if (error) {
      console.error("[BILL_REMINDERS_DELETE]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[BILL_REMINDERS_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// Helper function to ensure bill reminders table exists
async function ensureBillRemindersTableExists() {
  try {
    // Check if bill_reminders table exists
    const { error } = await supabaseAdmin
      .from('bill_reminders')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (error && error.code === "42P01") {
      console.log("bill_reminders table doesn't exist, creating it...")
      
      // Create bill_reminders table using RPC
      const { error: createError } = await supabaseAdmin.rpc('create_bill_reminders_table')
      
      if (createError) {
        console.error("Error creating bill_reminders table:", createError)
      } else {
        console.log("Successfully created bill_reminders table")
        
        // Ensure bills table exists as well
        await ensureBillsTableExists()
      }
    }
  } catch (error) {
    console.error("Error ensuring bill_reminders table exists:", error)
    // Continue execution even if table creation fails
  }
}

// Helper function to ensure bills table exists
async function ensureBillsTableExists() {
  try {
    // Check if bills table exists
    const { error } = await supabaseAdmin
      .from('bills')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (error && error.code === "42P01") {
      console.log("bills table doesn't exist, creating it...")
      
      // Create bills table using RPC
      const { error: createError } = await supabaseAdmin.rpc('create_bills_table')
      
      if (createError) {
        console.error("Error creating bills table:", createError)
      } else {
        console.log("Successfully created bills table")
      }
    }
  } catch (error) {
    console.error("Error ensuring bills table exists:", error)
    // Continue execution even if table creation fails
  }
}
