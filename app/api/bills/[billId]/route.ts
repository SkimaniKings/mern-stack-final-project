import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin, getCurrentUserId } from "@/lib/supabase"

// Schema for bill validation
const billSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(0, "Amount must be a positive number"),
  dueDate: z.string().transform(str => new Date(str)),
  isRecurring: z.boolean().default(false),
  frequency: z.string().optional(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  status: z.enum(["pending", "paid", "overdue"]).default("pending"),
  notes: z.string().optional(),
  reminderDays: z.number().min(0).optional(),
  attachments: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

// GET /api/bills/[billId] - Get a specific bill
export async function GET(
  req: Request,
  { params }: { params: { billId: string } }
) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bills table exists
    await ensureBillsTableExists()
    
    const { data: bill, error } = await supabaseAdmin
      .from('bills')
      .select(`
        *,
        payments (
          id,
          amount,
          date,
          status,
          payment_method,
          transaction_id
        )
      `)
      .eq('id', params.billId)
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error("[BILL_GET]", error)
      
      // If table doesn't exist, return not found
      if (error.code === "42P01") {
        return new NextResponse("Bill not found", { status: 404 })
      }
      
      // If no rows found, return not found
      if (error.code === "PGRST116") {
        return new NextResponse("Bill not found", { status: 404 })
      }
      
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    if (!bill) {
      return new NextResponse("Not found", { status: 404 })
    }
    
    // Check if bill is pending but due date has passed, update to overdue
    const dueDate = new Date(bill.due_date)
    const today = new Date()
    
    if (bill.status === 'pending' && dueDate < today) {
      const { data: updatedBill, error: updateError } = await supabaseAdmin
        .from('bills')
        .update({ 
          status: 'overdue',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.billId)
        .select(`
          *,
          payments (
            id,
            amount,
            date,
            status,
            payment_method,
            transaction_id
          )
        `)
        .single()
      
      if (!updateError && updatedBill) {
        return NextResponse.json(updatedBill)
      }
    }
    
    return NextResponse.json(bill)
  } catch (error) {
    console.error("[BILL_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// PATCH /api/bills/[billId] - Update a bill
export async function PATCH(
  req: Request,
  { params }: { params: { billId: string } }
) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bills table exists
    await ensureBillsTableExists()
    
    const body = await req.json()
    const validatedData = billSchema.parse(body)
    
    // Check if bill exists and belongs to user
    const { data: existingBill, error: fetchError } = await supabaseAdmin
      .from('bills')
      .select('id, is_recurring, frequency')
      .eq('id', params.billId)
      .eq('user_id', userId)
      .single()
    
    if (fetchError) {
      console.error("[BILL_PATCH_CHECK]", fetchError)
      
      // If table doesn't exist, return not found
      if (fetchError.code === "42P01") {
        return new NextResponse("Bill not found", { status: 404 })
      }
      
      // If no rows found, return not found
      if (fetchError.code === "PGRST116") {
        return new NextResponse("Bill not found", { status: 404 })
      }
      
      return new NextResponse(`Database error: ${fetchError.message}`, { status: 500 })
    }
    
    if (!existingBill) {
      return new NextResponse("Not found", { status: 404 })
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
    const billData = {
      name: validatedData.name,
      category: validatedData.category,
      amount: validatedData.amount,
      due_date: validatedData.dueDate,
      is_recurring: validatedData.isRecurring,
      frequency: validatedData.frequency,
      payment_method: validatedData.paymentMethod,
      status,
      notes: validatedData.notes,
      reminder_days: validatedData.reminderDays,
      attachments: validatedData.attachments,
      tags: validatedData.tags,
      updated_at: new Date().toISOString()
    }
    
    const { data: bill, error } = await supabaseAdmin
      .from('bills')
      .update(billData)
      .eq('id', params.billId)
      .select()
      .single()
    
    if (error) {
      console.error("[BILL_PATCH]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    // Handle changes to recurring bill settings
    if (existingBill.is_recurring !== validatedData.isRecurring || 
        existingBill.frequency !== validatedData.frequency) {
      
      // If bill is now recurring, schedule next occurrence
      if (validatedData.isRecurring && validatedData.frequency) {
        await scheduleNextRecurringBill(bill, validatedData.frequency)
      }
      
      // If bill is no longer recurring, cancel future occurrences
      if (!validatedData.isRecurring && existingBill.is_recurring) {
        await cancelFutureRecurringBills(params.billId)
      }
    }
    
    return NextResponse.json(bill)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[BILL_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// DELETE /api/bills/[billId] - Delete a bill
export async function DELETE(
  req: Request,
  { params }: { params: { billId: string } }
) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bills table exists
    await ensureBillsTableExists()
    
    // Check if bill exists and belongs to user
    const { data: existingBill, error: fetchError } = await supabaseAdmin
      .from('bills')
      .select('id, is_recurring')
      .eq('id', params.billId)
      .eq('user_id', userId)
      .single()
    
    if (fetchError) {
      console.error("[BILL_DELETE_CHECK]", fetchError)
      
      // If table doesn't exist, return success (nothing to delete)
      if (fetchError.code === "42P01") {
        return new NextResponse(null, { status: 204 })
      }
      
      // If no rows found, return success (nothing to delete)
      if (fetchError.code === "PGRST116") {
        return new NextResponse(null, { status: 204 })
      }
      
      return new NextResponse(`Database error: ${fetchError.message}`, { status: 500 })
    }
    
    if (!existingBill) {
      return new NextResponse("Not found", { status: 404 })
    }
    
    // If bill is recurring, cancel future occurrences
    if (existingBill.is_recurring) {
      await cancelFutureRecurringBills(params.billId)
    }
    
    const { error } = await supabaseAdmin
      .from('bills')
      .delete()
      .eq('id', params.billId)
    
    if (error) {
      console.error("[BILL_DELETE]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[BILL_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
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
        
        // Create payments table if needed
        await ensurePaymentsTableExists()
        
        // Create bill schedules table if needed
        await ensureBillSchedulesTableExists()
      }
    }
  } catch (error) {
    console.error("Error ensuring bills table exists:", error)
    // Continue execution even if table creation fails
  }
}

// Helper function to ensure payments table exists
async function ensurePaymentsTableExists() {
  try {
    // Check if payments table exists
    const { error } = await supabaseAdmin
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (error && error.code === "42P01") {
      console.log("payments table doesn't exist, creating it...")
      
      // Create payments table using RPC
      const { error: createError } = await supabaseAdmin.rpc('create_payments_table')
      
      if (createError) {
        console.error("Error creating payments table:", createError)
      } else {
        console.log("Successfully created payments table")
      }
    }
  } catch (error) {
    console.error("Error ensuring payments table exists:", error)
    // Continue execution even if table creation fails
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
      }
    }
  } catch (error) {
    console.error("Error ensuring bill_schedules table exists:", error)
    // Continue execution even if table creation fails
  }
}

// Helper function to schedule the next recurring bill
async function scheduleNextRecurringBill(bill: any, frequency: string) {
  try {
    const dueDate = new Date(bill.due_date)
    let nextDueDate = new Date(dueDate)
    
    // Calculate next due date based on frequency
    switch (frequency.toLowerCase()) {
      case 'weekly':
        nextDueDate.setDate(dueDate.getDate() + 7)
        break
      case 'biweekly':
        nextDueDate.setDate(dueDate.getDate() + 14)
        break
      case 'monthly':
        nextDueDate.setMonth(dueDate.getMonth() + 1)
        break
      case 'quarterly':
        nextDueDate.setMonth(dueDate.getMonth() + 3)
        break
      case 'biannual':
        nextDueDate.setMonth(dueDate.getMonth() + 6)
        break
      case 'annual':
        nextDueDate.setFullYear(dueDate.getFullYear() + 1)
        break
      default:
        // Default to monthly if frequency is not recognized
        nextDueDate.setMonth(dueDate.getMonth() + 1)
    }
    
    // Create a scheduled bill record
    await supabaseAdmin
      .from('bill_schedules')
      .insert({
        original_bill_id: bill.id,
        user_id: bill.user_id,
        name: bill.name,
        category: bill.category,
        amount: bill.amount,
        due_date: nextDueDate.toISOString(),
        is_recurring: true,
        frequency: frequency,
        payment_method: bill.payment_method,
        status: 'pending',
        notes: bill.notes,
        reminder_days: bill.reminder_days,
        created_at: new Date().toISOString()
      })
      .select()
    
    console.log(`Scheduled next ${frequency} bill for ${bill.name}`)
  } catch (error) {
    console.error("Error scheduling next recurring bill:", error)
  }
}

// Helper function to cancel future recurring bills
async function cancelFutureRecurringBills(billId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('bill_schedules')
      .delete()
      .eq('original_bill_id', billId)
    
    if (error) {
      console.error("Error canceling future recurring bills:", error)
    } else {
      console.log(`Canceled future recurring bills for bill ID ${billId}`)
    }
  } catch (error) {
    console.error("Error canceling future recurring bills:", error)
  }
}