import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { getSupabase, handleDatabaseError } from "@/lib/db"
import { z } from "zod"

// Schema for payment validation
const paymentSchema = z.object({
  amount: z.number().min(0, "Amount must be a positive number"),
  date: z.string().transform(str => new Date(str)),
  status: z.enum(["completed", "pending", "failed"]).default("pending"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  transactionId: z.string().optional(),
  subscriptionId: z.string().optional(),
  billId: z.string().optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
})

// GET /api/payments - Get all payments for the current user
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure payments table exists
    await ensurePaymentsTableExists()
    
    const { searchParams } = new URL(req.url)
    const subscriptionId = searchParams.get("subscriptionId")
    const billId = searchParams.get("billId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const status = searchParams.get("status")
    
    const supabase = await getSupabase()
    
    // Start building the query
    let query = supabase
      .from('payments')
      .select('*, subscriptions(*), bills(*)')
      .eq('user_id', user.id)
    
    // Apply filters
    if (subscriptionId) {
      query = query.eq('subscription_id', subscriptionId)
    }
    
    if (billId) {
      query = query.eq('bill_id', billId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (startDate) {
      query = query.gte('date', startDate)
    }
    
    if (endDate) {
      query = query.lte('date', endDate)
    }
    
    // Execute the query
    const { data: payments, error } = await query.order('date', { ascending: false })
    
    if (error) {
      console.error("[PAYMENTS_GET] Database error:", error)
      
      // If table doesn't exist, return empty array
      if (error.code === "42P01") {
        return NextResponse.json([])
      }
      
      return new NextResponse(JSON.stringify(handleDatabaseError(error)), { status: 500 })
    }
    
    return NextResponse.json(payments || [])
  } catch (error) {
    console.error("[PAYMENTS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// POST /api/payments - Create a new payment
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    // Ensure payments table exists
    await ensurePaymentsTableExists()
    
    const body = await req.json()
    const validatedData = paymentSchema.parse(body)
    
    const supabase = await getSupabase()
    
    // Check if subscription or bill exists and belongs to user
    if (validatedData.subscriptionId) {
      try {
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select()
          .eq('id', validatedData.subscriptionId)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (error) {
          // If subscriptions table doesn't exist, create it
          if (error.code === "42P01") {
            await supabase.rpc('create_subscriptions_table')
            return new NextResponse("Subscription not found", { status: 404 })
          }
          
          throw error
        }
        
        if (!subscription) {
          return new NextResponse("Subscription not found", { status: 404 })
        }
      } catch (error) {
        console.error("[PAYMENTS_POST] Subscription check error:", error)
        return new NextResponse("Error checking subscription", { status: 500 })
      }
    }
    
    if (validatedData.billId) {
      try {
        const { data: bill, error } = await supabase
          .from('bills')
          .select()
          .eq('id', validatedData.billId)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (error) {
          // If bills table doesn't exist, create it
          if (error.code === "42P01") {
            await supabase.rpc('create_bills_table')
            return new NextResponse("Bill not found", { status: 404 })
          }
          
          throw error
        }
        
        if (!bill) {
          return new NextResponse("Bill not found", { status: 404 })
        }
      } catch (error) {
        console.error("[PAYMENTS_POST] Bill check error:", error)
        return new NextResponse("Error checking bill", { status: 500 })
      }
    }
    
    // Prepare payment data
    const paymentData = {
      amount: validatedData.amount,
      date: validatedData.date,
      status: validatedData.status,
      payment_method: validatedData.paymentMethod,
      transaction_id: validatedData.transactionId,
      subscription_id: validatedData.subscriptionId,
      bill_id: validatedData.billId,
      notes: validatedData.notes,
      category: validatedData.category,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Create the payment
    const { data: payment, error: createError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single()
    
    if (createError) {
      console.error("[PAYMENTS_POST] Create error:", createError)
      return new NextResponse(JSON.stringify(handleDatabaseError(createError)), { status: 500 })
    }
    
    // Update subscription or bill status if payment is completed
    if (validatedData.status === "completed") {
      if (validatedData.subscriptionId) {
        try {
          // Calculate next billing date based on subscription billing cycle
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('billing_cycle')
            .eq('id', validatedData.subscriptionId)
            .single()
          
          let monthsToAdd = 1 // Default to monthly
          
          if (subscription) {
            switch (subscription.billing_cycle) {
              case 'weekly':
                monthsToAdd = 0.25 // Approximately 1 week
                break
              case 'monthly':
                monthsToAdd = 1
                break
              case 'quarterly':
                monthsToAdd = 3
                break
              case 'biannual':
                monthsToAdd = 6
                break
              case 'annual':
                monthsToAdd = 12
                break
            }
          }
          
          const paymentDate = new Date(validatedData.date)
          const nextBillingDate = new Date(paymentDate)
          
          // Add the appropriate number of months
          nextBillingDate.setMonth(paymentDate.getMonth() + Math.floor(monthsToAdd))
          
          // For weekly billing, add the remaining days
          if (monthsToAdd === 0.25) {
            nextBillingDate.setDate(paymentDate.getDate() + 7)
          }
          
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              next_billing_date: nextBillingDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', validatedData.subscriptionId)
          
          if (updateError) {
            console.error("[PAYMENTS_POST] Subscription update error:", updateError)
          }
        } catch (error) {
          console.error("[PAYMENTS_POST] Error updating subscription:", error)
        }
      }
      
      if (validatedData.billId) {
        try {
          const { error: updateError } = await supabase
            .from('bills')
            .update({
              status: "paid",
              updated_at: new Date().toISOString()
            })
            .eq('id', validatedData.billId)
          
          if (updateError) {
            console.error("[PAYMENTS_POST] Bill update error:", updateError)
          }
        } catch (error) {
          console.error("[PAYMENTS_POST] Error updating bill:", error)
        }
      }
    }
    
    return NextResponse.json(payment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    
    console.error("[PAYMENTS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

// Helper function to ensure payments table exists
async function ensurePaymentsTableExists() {
  try {
    const supabase = await getSupabase()
    
    // Check if payments table exists
    const { error } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (error && error.code === "42P01") {
      console.log("payments table doesn't exist, creating it...")
      
      // Create payments table using RPC
      const { error: createError } = await supabase.rpc('create_payments_table')
      
      if (createError) {
        console.error("Error creating payments table:", createError)
      } else {
        console.log("Successfully created payments table")
        
        // Create payment methods table if needed
        await ensurePaymentMethodsTableExists()
      }
    }
  } catch (error) {
    console.error("Error ensuring payments table exists:", error)
    // Continue execution even if table creation fails
  }
}

// Helper function to ensure payment methods table exists
async function ensurePaymentMethodsTableExists() {
  try {
    const supabase = await getSupabase()
    
    // Check if payment_methods table exists
    const { error } = await supabase
      .from('payment_methods')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (error && error.code === "42P01") {
      console.log("payment_methods table doesn't exist, creating it...")
      
      // Create payment_methods table using RPC
      const { error: createError } = await supabase.rpc('create_payment_methods_table')
      
      if (createError) {
        console.error("Error creating payment_methods table:", createError)
      } else {
        console.log("Successfully created payment_methods table")
        
        // Insert default payment methods
        const defaultPaymentMethods = [
          { name: "Credit Card", icon: "credit_card" },
          { name: "Debit Card", icon: "credit_card" },
          { name: "Bank Transfer", icon: "account_balance" },
          { name: "Cash", icon: "payments" },
          { name: "PayPal", icon: "payment" },
          { name: "Mobile Payment", icon: "smartphone" }
        ]
        
        await supabase
          .from('payment_methods')
          .insert(defaultPaymentMethods)
      }
    }
  } catch (error) {
    console.error("Error ensuring payment_methods table exists:", error)
    // Continue execution even if table creation fails
  }
}