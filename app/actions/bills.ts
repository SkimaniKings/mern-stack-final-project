"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

// Helper function to calculate next due date based on recurrence pattern
function calculateNextDueDate(currentDueDate: string, recurrencePattern: string): string {
  // By appending T00:00:00, we ensure the date is parsed in the server's local timezone,
  // avoiding UTC conversion issues that can shift the date.
  const date = new Date(`${currentDueDate}T00:00:00`)

  switch (recurrencePattern) {
    case "once":
      break
    case "weekly":
      date.setDate(date.getDate() + 7)
      break
    case "biweekly":
    case "bi_weekly":
      date.setDate(date.getDate() + 14)
      break
    case "monthly":
      date.setMonth(date.getMonth() + 1)
      break
    case "quarterly":
      date.setMonth(date.getMonth() + 3)
      break
    case "semi-annually":
    case "semiannually":
    case "semi_annual":
      date.setMonth(date.getMonth() + 6)
      break
    case "annually":
    case "annual":
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      // Default to monthly for unknown patterns
      date.setMonth(date.getMonth() + 1)
  }

  return date.toISOString().split("T")[0]
}

// Helper function to generate negotiation strategy based on bill type
function generateNegotiationStrategy(bill: any): string {
    const strategies = [
      "Call customer service and mention competitor offers",
      "Ask about loyalty discounts for long-term customers",
      "Request a review of your account for available promotions",
      "Inquire about bundling services for a discount",
      "Mention financial hardship and request temporary rate reduction",
    ]
  
    // Use category to determine best strategy if available
    if (bill.billers?.category) {
      const category = bill.billers.category.toLowerCase()
  
      if (category.includes("internet") || category.includes("phone") || category.includes("cable")) {
        return "Research competitor rates and call to request a price match. Mention you're considering switching providers."
      }
  
      if (category.includes("insurance")) {
        return "Ask about bundling policies, safe driver discounts, or loyalty programs. Consider increasing deductibles to lower monthly premiums."
      }
  
      if (category.includes("subscription") || category.includes("streaming")) {
        return "Check for annual payment options which often come with discounts. Consider family or group plans if applicable."
      }
    }
  
    // Return a random strategy if no specific category match
    return strategies[Math.floor(Math.random() * strategies.length)]
}

export async function getBills() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    // Use the bills table that exists in the database
    const { data: bills, error } = await supabase
      .from("bills")
      .select(
        `
        *,
        category:category_id(id, name, description, icon),
        bill_payments(id, payment_date, amount_paid, payment_method, note)
      `
      )
      .eq("user_id", user.id)
      .order("next_due_date", { ascending: true })

    if (error) {
      console.error("Error fetching bills:", error)
      throw new Error("Failed to fetch bills")
    }

    return bills
  } catch (error) {
    console.error("Error in getBills:", error)
    throw new Error("Failed to fetch bills")
  }
}

export async function getBillById(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    const { data: bill, error } = await supabase
      .from("bills")
      .select(
        `
        *,
        category:category_id(id, name, description, icon)
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching bill:", error)
      throw new Error("Failed to fetch bill")
    }

    // Get bill payment history
    const { data: history, error: historyError } = await supabase
      .from("bill_payments")
      .select("*")
      .eq("bill_id", id)
      .order("created_at", { ascending: false })

    if (historyError) {
      console.error("Error fetching bill history:", historyError)
    }

    return { bill, history: history || [] }
  } catch (error) {
    console.error("Error in getBillById:", error)
    throw new Error("Failed to fetch bill")
  }
}

// Helper function to normalize frequency values
function normalizeFrequency(frequency: string): string {
  const lowerCaseFrequency = frequency.toLowerCase().trim();
  switch (lowerCaseFrequency) {
    case "annually":
      return "annual";
    case "biweekly":
    case "bi-weekly":
    case "bi_weekly":
      return "bi_weekly";
    case "semi-annually":
    case "semiannually":
    case "semi_annual":
      return "semi_annually";
    default:
      return lowerCaseFrequency;
  }
}

export async function createBill(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect("/login");
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client");
    }

    const amountStr = formData.get("amount_due") as string;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      throw new Error("Invalid amount. Please provide a valid number.");
    }

    const rawFormData = {
      name: formData.get("name") as string,
      amount_due: amount,
      due_date: formData.get("due_date") as string,
      frequency: formData.get("frequency") as string,
      is_automatic: formData.get("is_automatic") === "on",
      category_id: formData.get("category_id") as string,
      vendor: formData.get("vendor") as string,
      description: formData.get("description") as string,
      reminder_days: parseInt(formData.get("reminder_days") as string, 10) || 0,
    };

    const dateStr = rawFormData.due_date;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error("Invalid date format. Please use YYYY-MM-DD.");
    }
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date provided");
    }
    if (rawFormData.is_automatic && rawFormData.frequency !== "once") {
      date.setDate(date.getDate() - rawFormData.reminder_days);
    }
    const formattedDate = date.toISOString().split("T")[0];

    const billData = {
      user_id: user.id,
      name: rawFormData.name,
      amount_due: rawFormData.amount_due,
      next_due_date: formattedDate,
      frequency: normalizeFrequency(rawFormData.frequency),
      is_automatic: rawFormData.is_automatic,
      description: rawFormData.description,
      category_id: rawFormData.category_id,
      vendor: rawFormData.vendor,
      reminder_days: rawFormData.reminder_days,
      status: "unpaid",
      currency: "USD",
    };

    const { data: bill, error } = await supabase.from("bills").insert(billData).select().single();

    if (error) {
      console.error("Error creating bill:", error);
      // Throw a more specific error from Supabase if available
      throw new Error(error.message || "Failed to create bill in database.");
    }

    revalidatePath("/bills");
    return bill;
  } catch (error) {
    console.error("Error in createBill:", error);
    if (error instanceof Error) {
      // Re-throw the specific error message to the client
      throw new Error(error.message);
    }
    // Fallback for unexpected error types
    throw new Error("An unexpected error occurred while creating the bill.");
  }
}

export async function updateBill(id: string, formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect("/login");
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client");
    }

    const amountStr = formData.get("amount_due") as string;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      throw new Error("Invalid amount. Please provide a valid number.");
    }

    const rawFormData = {
      name: formData.get("name") as string,
      amount_due: amount,
      due_date: formData.get("due_date") as string,
      frequency: formData.get("frequency") as string,
      is_automatic: formData.get("is_automatic") === "on",
      category_id: formData.get("category_id") as string,
      vendor: formData.get("vendor") as string,
      description: formData.get("description") as string,
      reminder_days: parseInt(formData.get("reminder_days") as string, 10) || 0,
    };

    const { data: currentBill, error: fetchError } = await supabase
      .from("bills")
      .select("amount_due, next_due_date")
      .eq("id", id)
      .single();

    if (fetchError || !currentBill) {
      console.error("Error fetching bill for update:", fetchError);
      throw new Error("Failed to find the bill to update");
    }

    const dateStr = rawFormData.due_date;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error("Invalid date format. Please use YYYY-MM-DD.");
    }
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date provided");
    }
    if (rawFormData.is_automatic && rawFormData.frequency !== "once") {
      date.setDate(date.getDate() - rawFormData.reminder_days);
    }
    const formattedDate = date.toISOString().split("T")[0];

    const billData = {
      name: rawFormData.name,
      amount_due: rawFormData.amount_due,
      next_due_date: formattedDate,
      frequency: normalizeFrequency(rawFormData.frequency),
      is_automatic: rawFormData.is_automatic,
      description: rawFormData.description,
      category_id: rawFormData.category_id,
      vendor: rawFormData.vendor,
      reminder_days: rawFormData.reminder_days,
    };

    const { data: bill, error } = await supabase.from("bills").update(billData).eq("id", id).select().single();

    if (error) {
      console.error("Error updating bill:", error);
      throw new Error(error.message || "Failed to update bill in database.");
    }

    if (currentBill.amount_due !== rawFormData.amount_due) {
      await supabase.from("bill_price_history").insert({
        bill_id: id,
        old_amount: currentBill.amount_due,
        new_amount: rawFormData.amount_due,
        reason: "User updated bill amount",
      });
    }

    revalidatePath("/bills");
    return bill;
  } catch (error) {
    console.error("Error in updateBill:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unexpected error occurred while updating the bill.");
  }
}

export async function deleteBill(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    const { error } = await supabase.from("bills").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      console.error("Error deleting bill:", error)
      throw new Error("Failed to delete bill")
    }

    revalidatePath("/bills")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteBill:", error)
    throw new Error("Failed to delete bill")
  }
}

export async function markBillAsPaid(id: string, formData?: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    const { data: bill, error: billError } = await supabase
      .from("bills")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (billError || !bill) {
      console.error("Error fetching bill or bill not found:", billError)
      throw new Error("Failed to find the bill to mark as paid")
    }

    // Mark the current bill as 'paid' but do not change its due date.
    const { error: updateError } = await supabase
      .from("bills")
      .update({
        status: "paid",
        last_paid_date: new Date().toISOString().split("T")[0]
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error updating bill status:", updateError)
      throw new Error("Failed to update bill status")
    }

    // Create a payment record.
    let paymentMethod = "other"
    if (formData) {
      const methodFromForm = formData.get("payment_method")
      if (typeof methodFromForm === "string") {
        const validMethods = ["credit_card", "debit_card", "bank_transfer", "cash", "other"]
        if (validMethods.includes(methodFromForm)) {
          paymentMethod = methodFromForm
        }
      }
    }

    await supabase.from("bill_payments").insert({
      bill_id: id,
      user_id: user.id,
      amount_paid: bill.amount_due,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: paymentMethod,
      note: "Payment recorded"
    })

    // For recurring bills, create a new bill for the next cycle.
    if (bill.frequency && bill.frequency !== "once") {
      const nextDueDate = calculateNextDueDate(bill.next_due_date, bill.frequency)

      await supabase.from("bills").insert({
        user_id: user.id,
        name: bill.name,
        amount_due: bill.amount_due,
        next_due_date: nextDueDate,
        frequency: bill.frequency,
        is_automatic: bill.is_automatic,
        description: bill.description,
        category_id: bill.category_id,
        vendor: bill.vendor,
        reminder_days: bill.reminder_days,
        status: "unpaid",
        currency: bill.currency || "USD"
      })
    }

    revalidatePath("/bills")
    return { success: true }
  } catch (error) {
    console.error("Error in markBillAsPaid:", error)
    throw new Error("Failed to mark bill as paid")
  }
}

export async function getBillNegotiationOpportunities() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
        throw new Error("Failed to initialize Supabase client")
    }

    const { data: bills, error } = await supabase
      .from("bills")
      .select(
        `
        id,
        name,
        amount_due,
        vendor,
        category:category_id (name)
      `
      )
      .eq("user_id", user.id)
      .eq("frequency", "monthly") // Common for negotiation
      .gt("amount_due", 50) // Only consider bills above $50
      .order("amount_due", { ascending: false })

    if (error) {
      console.error("Error fetching bill negotiation opportunities:", error)
      throw new Error("Failed to fetch bill negotiation opportunities")
    }

    const opportunities = bills.map(bill => {
        const category = bill.category as any;
        let categoryName: string | undefined;

        if (Array.isArray(category)) {
            categoryName = category[0]?.name;
        } else if (category) {
            categoryName = category.name;
        }

        return {
          ...bill,
          potentialSavings: Math.round(bill.amount_due * 0.15 * 100) / 100, // Estimate 15% potential savings
          negotiationStrategy: generateNegotiationStrategy({ billers: { category: categoryName, name: bill.vendor }})
        }
    })

    return opportunities
  } catch (error) {
    console.error("Error in getBillNegotiationOpportunities:", error)
    throw new Error("Failed to fetch bill negotiation opportunities")
  }
}

export async function getUpcomingBills() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
        throw new Error("Failed to initialize Supabase client")
    }

    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { data: bills, error } = await supabase
      .from("bills")
      .select(
        `
        id,
        name,
        amount_due,
        next_due_date,
        frequency,
        is_automatic,
        description,
        vendor,
        reminder_days,
        status,
        currency,
        created_at,
        updated_at,
        category_id,
        category:category_id (name)
      `
      )
      .eq("user_id", user.id)
      .eq("status", "unpaid")
      .gte("next_due_date", new Date().toISOString().split('T')[0])
      .lte("next_due_date", thirtyDaysFromNow.toISOString().split('T')[0])
      .order("next_due_date", { ascending: true })

    if (error) {
      console.error("Error fetching upcoming bills:", error)
      throw new Error("Failed to fetch upcoming bills")
    }

    return bills
  } catch (error) {
    console.error("Error in getUpcomingBills:", error)
    throw new Error("Failed to fetch upcoming bills")
  }
}
