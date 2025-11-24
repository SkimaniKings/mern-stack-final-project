"use server"

import { createNotification } from "@/app/actions/notifications"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

/**
 * Utility function to create notifications for various events in the application
 */
export async function notify({
  type,
  message,
  link
}: {
  type: string;
  message: string;
  link?: string;
}) {
  try {
    // First, ensure the database structure is set up
    try {
      await fetch(`/api/database/notifications-setup`)
    } catch (setupError) {
      console.error("Error setting up notification database structure:", setupError)
    }

    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, error: "Database connection error" }
    }
    
    // Get current user
    const { data, error: userError } = await supabase.auth.getUser()
    const user = data?.user
    
    if (userError || !user) {
      console.error("Error getting user:", userError)
      return { success: false, error: "User not authenticated" }
    }
    
    // Create admin client to bypass RLS
    const adminClient = await createAdminSupabaseClient()
    
    if (!adminClient) {
      console.error("Failed to create admin client")
      return { success: false, error: "Could not create notification" }
    }

    // Create notification directly using admin client
    const { data: notification, error } = await adminClient
      .from("user_notifications")
      .insert({
        user_id: user.id,
        notification_type: type,
        message,
        link,
        is_read: false
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating notification:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, notification }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false, error: "Failed to create notification" }
  }
}

/**
 * Create a watchlist notification when a price target is reached
 */
export async function notifyWatchlistAlert({
  ticker,
  companyName,
  currentPrice,
  targetPrice,
  isAboveTarget
}: {
  ticker: string;
  companyName: string;
  currentPrice: number;
  targetPrice: number;
  isAboveTarget: boolean;
}) {
  return notify({
    type: "Watchlist Alert",
    message: `${companyName} (${ticker}) is now ${isAboveTarget ? "above" : "below"} your target price of $${targetPrice.toFixed(2)} at $${currentPrice.toFixed(2)}.`,
    link: "/watchlist"
  })
}

/**
 * Create a budget notification when a budget is over or approaching limit
 */
export async function notifyBudgetAlert({
  category,
  budgetAmount,
  spentAmount,
  percentage,
  isOverBudget
}: {
  category: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  isOverBudget: boolean;
}) {
  return notify({
    type: "Budget Alert",
    message: isOverBudget
      ? `You've spent $${spentAmount.toFixed(2)} on ${category}, which is $${(spentAmount - budgetAmount).toFixed(2)} over your budget of $${budgetAmount.toFixed(2)}.`
      : `You've spent $${spentAmount.toFixed(2)} on ${category}, which is ${percentage}% of your budget of $${budgetAmount.toFixed(2)}.`,
    link: "/budgets"
  })
}

/**
 * Create an expense reminder notification
 */
export async function notifyExpenseReminder({
  expenseName,
  dueDate,
  amount,
  isDue,
  daysUntilDue
}: {
  expenseName: string;
  dueDate: string;
  amount: number;
  isDue: boolean;
  daysUntilDue?: number;
}) {
  return notify({
    type: "Expense Reminder",
    message: isDue
      ? `Your payment of $${amount.toFixed(2)} for ${expenseName} is due today.`
      : `Your payment of $${amount.toFixed(2)} for ${expenseName} is due in ${daysUntilDue} days on ${new Date(dueDate).toLocaleDateString()}.`,
    link: "/expenses"
  })
}

/**
 * Create a bill reminder notification
 */
export async function notifyBillReminder({
  billName,
  dueDate,
  amount,
  isDue,
  daysUntilDue
}: {
  billName: string;
  dueDate: string;
  amount: number;
  isDue: boolean;
  daysUntilDue?: number;
}) {
  return notify({
    type: "Bill Reminder",
    message: isDue
      ? `Your bill of $${amount.toFixed(2)} for ${billName} is due today.`
      : `Your bill of $${amount.toFixed(2)} for ${billName} is due in ${daysUntilDue} days on ${new Date(dueDate).toLocaleDateString()}.`,
    link: "/bills"
  })
}

/**
 * Create an investment update notification
 */
export async function notifyInvestmentUpdate({
  investmentName,
  type,
  amount,
  percentageChange,
  isPositive
}: {
  investmentName: string;
  type: "dividend" | "performance";
  amount: number;
  percentageChange?: number;
  isPositive?: boolean;
}) {
  if (type === "dividend") {
    return notify({
      type: "Investment Update",
      message: `You've received a dividend payment of $${amount.toFixed(2)} from ${investmentName}.`,
      link: "/investments"
    })
  } else {
    return notify({
      type: "Investment Update",
      message: `Your investment in ${investmentName} has ${isPositive ? "increased" : "decreased"} by ${percentageChange}% (${isPositive ? "+" : "-"}$${amount.toFixed(2)}).`,
      link: "/investments"
    })
  }
}
