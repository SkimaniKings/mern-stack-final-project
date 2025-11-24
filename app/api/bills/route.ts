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

// GET /api/bills - Get all bills for the current user
export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bills table exists
    await ensureBillsTableExists()
    
    // Get query parameters for filtering
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const isRecurring = searchParams.get("isRecurring")
    
    // Start building the query
    let query = supabaseAdmin
      .from('bills')
      .select('*')
      .eq('user_id', userId)
    
    // Apply filters if provided
    if (status) {
      query = query.eq('status', status)
    }
    
    if (category) {
      query = query.eq('category', category)
    }
    
    if (startDate) {
      query = query.gte('due_date', startDate)
    }
    
    if (endDate) {
      query = query.lte('due_date', endDate)
    }
    
    if (isRecurring === 'true') {
      query = query.eq('is_recurring', true)
    } else if (isRecurring === 'false') {
      query = query.eq('is_recurring', false)
    }
    
    // Execute the query with ordering
    const { data: bills, error } = await query.order('due_date', { ascending: true })
    
    if (error) {
      console.error("[BILLS_GET]", error)
      
      // If table doesn't exist despite our attempt to create it, return empty array
      if (error.code === "42P01") {
        return NextResponse.json([])
      }
      
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    // Check for upcoming bills that should be marked as overdue
    const today = new Date()
    const updatedBills = await Promise.all(bills.map(async (bill) => {
      const dueDate = new Date(bill.due_date)
      
      // If bill is pending and due date has passed, mark as overdue
      if (bill.status === 'pending' && dueDate < today) {
        const { data: updatedBill, error: updateError } = await supabaseAdmin
          .from('bills')
          .update({ status: 'overdue', updated_at: new Date().toISOString() })
          .eq('id', bill.id)
          .select()
          .single()
        
        if (!updateError && updatedBill) {
          return updatedBill
        }
      }
      
      return bill
    }))
    
    return NextResponse.json(updatedBills)
  } catch (error) {
    console.error("[BILLS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// POST /api/bills - Create a new bill
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure bills table exists
    await ensureBillsTableExists()
    
    const body = await req.json()
    const validatedData = billSchema.parse(body)
    
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
      user_id: userId,
      name: validatedData.name,
      category: validatedData.category,
      amount: validatedData.amount,
      due_date: validatedData.dueDate,
      is_recurring: validatedData.isRecurring,
      frequency: validatedData.frequency,
      payment_method: validatedData.paymentMethod,
      status,
      notes: validatedData.notes,
      reminder_days: validatedData.reminderDays || 3, // Default to 3 days reminder
      attachments: validatedData.attachments || [],
      tags: validatedData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: bill, error } = await supabaseAdmin
      .from('bills')
      .insert(billData)
      .select()
      .single()
    
    if (error) {
      console.error("[BILLS_POST]", error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }
    
    // If bill is recurring, schedule the next occurrence
    if (validatedData.isRecurring && validatedData.frequency) {
      await scheduleNextRecurringBill(bill, validatedData.frequency)
    }
    
    return NextResponse.json(bill)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[BILLS_POST]", error)
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
        
        // Create bill categories if needed
        await ensureBillCategoriesExist()
      }
    }
  } catch (error) {
    console.error("Error ensuring bills table exists:", error)
    // Continue execution even if table creation fails
  }
}

// Helper function to ensure bill categories exist
async function ensureBillCategoriesExist() {
  try {
    // Check if bill_categories table exists
    const { error: checkError } = await supabaseAdmin
      .from('bill_categories')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (checkError && checkError.code === "42P01") {
      // Create bill_categories table
      await supabaseAdmin.rpc('create_bill_categories_table')
      
      // Sample categories
      const sampleCategories = [
        { name: "Utilities", color: "#3b82f6", icon: "bolt" },
        { name: "Rent/Mortgage", color: "#ef4444", icon: "home" },
        { name: "Insurance", color: "#10b981", icon: "shield" },
        { name: "Internet", color: "#6366f1", icon: "wifi" },
        { name: "Phone", color: "#f59e0b", icon: "phone" },
        { name: "Groceries", color: "#84cc16", icon: "shopping-cart" },
        { name: "Transportation", color: "#8b5cf6", icon: "car" },
        { name: "Entertainment", color: "#ec4899", icon: "tv" }
      ]
      
      // Insert sample categories
      await supabaseAdmin
        .from('bill_categories')
        .insert(sampleCategories)
      
      console.log("Created sample bill categories")
    }
  } catch (error) {
    console.error("Error creating bill categories:", error)
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