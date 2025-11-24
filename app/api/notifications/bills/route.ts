import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { type Notification } from "@/types/notification"

// This endpoint is designed to be called by a cron job.
export async function POST() {
  try {
    const supabaseAdmin = createAdminSupabaseClient()

    if (!supabaseAdmin) {
      console.error("Failed to create Supabase admin client.")
      return NextResponse.json({ error: "Failed to create Supabase admin client." }, { status: 500 })
    }

    // 1. Get the 'Bill Alert' notification type ID
    const { data: notificationType, error: typeError } = await supabaseAdmin
      .from("notification_types")
      .select("id")
      .eq("name", "Bill Alert")
      .single()

    if (typeError || !notificationType) {
      console.error("Error fetching 'Bill Alert' notification type:", typeError)
      return NextResponse.json({ error: "Could not find 'Bill Alert' notification type." }, { status: 500 })
    }
    const billNotificationTypeId = notificationType.id

    // 2. Define the window for overdue and due soon bills
    const today = new Date()
    const startWindow = new Date(today)
    startWindow.setDate(today.getDate() - 30) // 1 month overdue
    const endWindow = new Date(today)
    endWindow.setDate(today.getDate() + 7) // 7 days due soon

    // 3. Find all unpaid bills within the window
    const { data: relevantBills, error: billsError } = await supabaseAdmin
      .from("bills")
      .select("id, user_id, name, amount_due, next_due_date")
      .not('status','eq','paid')
      .gte("next_due_date", startWindow.toISOString().split('T')[0])
      .lte("next_due_date", endWindow.toISOString().split('T')[0])

    if (billsError) {
      console.error("Error fetching upcoming bills:", billsError)
      return NextResponse.json({ error: "Failed to fetch upcoming bills." }, { status: 500 })
    }

    if (!relevantBills || relevantBills.length === 0) {
      return NextResponse.json({
        message: "No bills in the overdue/due soon window.",
        categories: {
          overdue_1d: [],
          overdue_7d: [],
          overdue_1m: [],
          due_1d: [],
          due_3d: [],
          due_7d: []
        },
        notificationsCreated: 0
      })
    }

    // Categorize bills
    const categories = {
      overdue_1d: [] as any[],
      overdue_7d: [] as any[],
      overdue_1m: [] as any[],
      due_1d: [] as any[],
      due_3d: [] as any[],
      due_7d: [] as any[]
    }
    for (const bill of relevantBills) {
      const dueDate = new Date(bill.next_due_date)
      const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === -1) categories.overdue_1d.push(bill)
      if (diffDays === -7) categories.overdue_7d.push(bill)
      if (diffDays === -30) categories.overdue_1m.push(bill)
      if (diffDays === 1) categories.due_1d.push(bill)
      if (diffDays === 3) categories.due_3d.push(bill)
      if (diffDays === 7) categories.due_7d.push(bill)
    }

    // Continue with notification logic as before
    let notificationsCreated = 0
    const notificationsToInsert: any[] = []
    const billLogData: { user_id: string; bill_id: string; sent_at: string }[] = []

    // 4. Get all user preferences for bill alerts
    const { data: preferences, error: prefError } = await supabaseAdmin
      .from("notification_preferences")
      .select("user_id, bill_alerts")
      .eq("bill_alerts", true)

    if (prefError) {
      console.error("Error fetching user preferences:", prefError)
      return NextResponse.json({ error: "Failed to fetch user preferences." }, { status: 500 })
    }

    const usersWithBillAlerts = new Set(preferences?.map(p => p.user_id))

    // 5. Get all existing bill alert logs to prevent duplicates
    const { data: existingLogs, error: logError } = await supabaseAdmin
      .from("bill_alert_notifications")
      .select("user_id, bill_id, sent_at")
      
    if (logError) {
        console.error("Error fetching existing bill alert logs:", logError)
        return NextResponse.json({ error: "Failed to fetch existing bill alert logs." }, { status: 500 })
    }

    if (!supabaseAdmin) {
      // This check is repeated to satisfy TypeScript's control flow analysis
      return NextResponse.json({ error: "Failed to create Supabase admin client." }, { status: 500 })
    }

    const sentAlerts = new Set(existingLogs?.map(log => `${log.user_id}-${log.bill_id}-${log.sent_at}`))

    for (const bill of relevantBills) {
      const logKey = `${bill.user_id}-${bill.id}-${bill.next_due_date}`

      // Check if user has alerts enabled and if an alert has NOT been sent for this bill's due date
      if (usersWithBillAlerts.has(bill.user_id) && !sentAlerts.has(logKey)) {
        const message = `Your bill, "${bill.name}", for $${bill.amount_due} is due on ${new Date(bill.next_due_date).toLocaleDateString()}`
        
        notificationsToInsert.push({
          user_id: bill.user_id,
          message: message,
          link: `/bills`,
          notification_type: billNotificationTypeId,
          updated_at: new Date().toISOString(),
        })

        billLogData.push({
          user_id: bill.user_id,
          bill_id: bill.id,
          sent_at: bill.next_due_date,
        })

        notificationsCreated++
      }
    }

    // 6. Batch insert notifications and logs if there are any to add
    if (notificationsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("user_notifications")
        .insert(notificationsToInsert)
        .select("notification_id")
      if (insertError) {
        console.error("Error inserting bill notifications:", insertError)
        return NextResponse.json({ error: "Failed to create bill notifications." }, { status: 500 })
      }

      // Build logs with notification_id
      const logsToInsert = inserted!.map((n, idx) => ({
        user_id: billLogData[idx].user_id,
        bill_id: billLogData[idx].bill_id,
        notification_id: n.notification_id,
        sent_at: billLogData[idx].sent_at,
      }))

      const { error: logInsertError } = await supabaseAdmin.from("bill_alert_notifications").insert(logsToInsert)
      if (logInsertError) {
        console.error("Error inserting bill alert logs:", logInsertError)
        // Note: In a real-world scenario, you might want to handle this more gracefully,
        // as notifications were created but not logged.
        return NextResponse.json({ error: "Failed to log bill notifications." }, { status: 500 })
      }
    }

    return NextResponse.json({ message: "Bill alert check completed.", notificationsCreated })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    console.error("Unexpected error in bill alert cron job:", errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
