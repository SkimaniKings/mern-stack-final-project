import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin, getCurrentUserId } from "@/lib/supabase"

// Schema for bill schedule validation
const scheduleSchema = z.object({
  originalBillId: z.string().min(1, "Original bill ID is required"),
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(0, "Amount must be a positive number"),
  dueDate: z.string().transform(str => new Date(str)),
  frequency: z.string().min(1, "Frequency is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  status: z.enum(["pending", "paid", "overdue"]).default("pending"),
  notes: z.string().optional(),
  reminderDays: z.number().min(0).optional(),
})

// GET /api/bills/schedules - Get all scheduled bills for the current user
export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bill schedules table exists
    await ensureBillSchedulesTableExists()
    
    // Get query parameters for filtering
    const { searchParams } = new URL(req.url)
    const originalBillId = searchParams.get("originalBillId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    
    // Start building the query
    let query = supabaseAdmin
      .from('bill_schedules')
      .select('*')
      .eq('user_id', userId)
    
    // Apply filters if provided
    if (originalBillId) {
      query = query.eq('original_bill_id', originalBillId)
    }
    
    if (startDate) {
      query = query.gte('due_date', startDate)
    }
    
    if (endDate) {
      query = query.lte('due_date', endDate)
    }
    
    // Execute the query with ordering
    const { data: schedules, error } = await query.order('due_date', { ascending: true })
    
    if (error) {
      console.error("[BILL_SCHEDULES_GET]", error)
      
      // If table doesn't exist despite our attempt to create it, return empty array
      if (error.code === "42P01") {
        return NextResponse.json([])
      }
      
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return NextResponse.json(schedules || [])
  } catch (error) {
    console.error("[BILL_SCHEDULES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// POST /api/bills/schedules - Create a new scheduled bill
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bill schedules table exists
    await ensureBillSchedulesTableExists()
    
    const body = await req.json()
    const validatedData = scheduleSchema.parse(body)
    
    // Check if original bill exists and belongs to user
    const { data: originalBill, error: billError } = await supabaseAdmin
      .from('bills')
      .select('id')
      .eq('id', validatedData.originalBillId)
      .eq('user_id', userId)
      .single()
    
    if (billError) {
      console.error("[BILL_SCHEDULES_POST_CHECK]", billError)
      
      if (billError.code === "PGRST116") {
        return new NextResponse("Original bill not found", { status: 404 })
      }
      
      return new NextResponse(`Database error: ${billError.message}`, { status: 500 })
    }
    
    // Check due date and set status accordingly
    const dueDate = new Date(validatedData.dueDate)
    const today = new Date()
    let status = validatedData.status
    
    // If status is pending but due date has passed, set to overdue
    if (status === 'pending' && dueDate < today) {
      status = 'overdue'
    }
    
    // Transform the data to match the database column names
    const scheduleData = {
      user_id: userId,
      original_bill_id: validatedData.originalBillId,
      name: validatedData.name,
      category: validatedData.category,
      amount: validatedData.amount,
      due_date: validatedData.dueDate,
      frequency: validatedData.frequency,
      payment_method: validatedData.paymentMethod,
      status,
      notes: validatedData.notes,
      reminder_days: validatedData.reminderDays || 3, // Default to 3 days reminder
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: schedule, error } = await supabaseAdmin
      .from('bill_schedules')
      .insert(scheduleData)
      .select()
      .single()
    
    if (error) {
      console.error("[BILL_SCHEDULES_POST]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return NextResponse.json(schedule)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[BILL_SCHEDULES_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// PATCH /api/bills/schedules - Update a scheduled bill
export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    const body = await req.json()
    
    if (!body.id) {
      return new NextResponse("Schedule ID is required", { status: 400 })
    }
    
    // Ensure bill schedules table exists
    await ensureBillSchedulesTableExists()
    
    // Check if schedule exists and belongs to user
    const { data: existingSchedule, error: checkError } = await supabaseAdmin
      .from('bill_schedules')
      .select('id')
      .eq('id', body.id)
      .eq('user_id', userId)
      .single()
    
    if (checkError) {
      console.error("[BILL_SCHEDULES_PATCH_CHECK]", checkError)
      
      if (checkError.code === "PGRST116") {
        return new NextResponse("Schedule not found", { status: 404 })
      }
      
      return new NextResponse(`Database error: ${checkError.message}`, { status: 500 })
    }
    
    // Parse and validate the update data
    const validatedData = scheduleSchema.parse(body)
    
    // Check due date and set status accordingly
    const dueDate = new Date(validatedData.dueDate)
    const today = new Date()
    let status = validatedData.status
    
    // If status is pending but due date has passed, set to overdue
    if (status === 'pending' && dueDate < today) {
      status = 'overdue'
    }
    
    // Transform the data to match the database column names
    const scheduleData = {
      name: validatedData.name,
      category: validatedData.category,
      amount: validatedData.amount,
      due_date: validatedData.dueDate,
      frequency: validatedData.frequency,
      payment_method: validatedData.paymentMethod,
      status,
      notes: validatedData.notes,
      reminder_days: validatedData.reminderDays,
      updated_at: new Date().toISOString()
    }
    
    const { data: schedule, error } = await supabaseAdmin
      .from('bill_schedules')
      .update(scheduleData)
      .eq('id', body.id)
      .select()
      .single()
    
    if (error) {
      console.error("[BILL_SCHEDULES_PATCH]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return NextResponse.json(schedule)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[BILL_SCHEDULES_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// DELETE /api/bills/schedules - Delete a scheduled bill
export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const originalBillId = searchParams.get("originalBillId")
    
    if (!id && !originalBillId) {
      return new NextResponse("Either schedule ID or original bill ID is required", { status: 400 })
    }
    
    // Ensure bill schedules table exists
    await ensureBillSchedulesTableExists()
    
    let query = supabaseAdmin
      .from('bill_schedules')
      .delete()
      .eq('user_id', userId)
    
    if (id) {
      // Delete a specific scheduled bill
      query = query.eq('id', id)
    } else if (originalBillId) {
      // Delete all scheduled bills for a specific original bill
      query = query.eq('original_bill_id', originalBillId)
    }
    
    const { error } = await query
    
    if (error) {
      console.error("[BILL_SCHEDULES_DELETE]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[BILL_SCHEDULES_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// Helper function to ensure bill schedules table exists
async function ensureBillSchedulesTableExists() {
  try {
    // Check if bill_schedules table exists
    const { error } = await supabaseAdmin
      .from('bill_schedules')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (error && error.code === "42P01") {
      console.log("bill_schedules table doesn't exist, creating it...")
      
      // Create bill_schedules table using RPC
      const { error: createError } = await supabaseAdmin.rpc('create_bill_schedules_table')
      
      if (createError) {
        console.error("Error creating bill_schedules table:", createError)
      } else {
        console.log("Successfully created bill_schedules table")
        
        // Ensure bills table exists as well
        await ensureBillsTableExists()
      }
    }
  } catch (error) {
    console.error("Error ensuring bill_schedules table exists:", error)
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
