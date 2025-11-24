"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth"
import { getExpenses } from "./expenses"
import { getIncomes } from "./income"

export async function getTransactions() {
  try {
    // Make sure to await the client creation
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to initialize Supabase client")
      return []
    }

    // Get the current user
    const user = await getAuthenticatedUser()

    if (!user) {
      console.log("No authenticated user found")
      return []
    }

    console.log("Fetching transactions for user:", user.id)

    // Query based on the updated transaction.sql schema
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        account:accounts(id, name, account_type, institution)
      `)
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })

    if (error) {
      console.error("Error fetching transactions:", error.message, error.details, error.hint)
      return []
    }

    // Transform data to match the expected format in the application
    const transformedData = data?.map(transaction => {
      // Transform account data if it exists
      const accountData = transaction.account ? {
        ...transaction.account,
        // Map account_type to type for UI compatibility
        type: transaction.account.account_type
      } : null;
      
      return {
        ...transaction,
        date: transaction.transaction_date,
        description: transaction.note || '',
        is_income: transaction.type === 'income',
        account: accountData
      };
    }) || []

    console.log(`Successfully fetched ${transformedData.length} transactions`)
    return transformedData
  } catch (error) {
    console.error("Unexpected error in getTransactions:", error)
    return []
  }
}

export async function getTransactionsByAccount(accountId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to initialize Supabase client")
      return []
    }

    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    // Query transactions for the specific account
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        account:accounts(id, name, account_type, institution),
        category:categories(id, name, color, icon)
      `)
      .eq("account_id", accountId)
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })

    if (error) {
      console.error("Error fetching transactions for account:", error)
      return []
    }

    // Transform data to match the expected format in the application
    const transformedData = data?.map(transaction => {
      // Transform account data if it exists
      const accountData = transaction.account ? {
        ...transaction.account,
        // Map account_type to type for UI compatibility
        type: transaction.account.account_type
      } : null;
      
      return {
        ...transaction,
        date: transaction.transaction_date,
        description: transaction.note || '',
        is_income: transaction.type === 'income',
        account: accountData
      };
    }) || []

    return transformedData
  } catch (error) {
    console.error("Unexpected error in getTransactionsByAccount:", error)
    return []
  }
}

export async function getTransactionById(id: string) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    console.error("Failed to initialize Supabase client")
    return null
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      account:accounts(id, name, account_type, institution)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error) {
    console.error("Error fetching transaction:", error)
    return null
  }

  // Transform data to match the expected format in the application
  if (data) {
    // Transform account data if it exists
    const accountData = data.account ? {
      ...data.account,
      // Map account_type to type for UI compatibility
      type: data.account.account_type
    } : null;
    
    // Log the raw data from the database for debugging
    console.log("Raw transaction data from database:", data);
    
    // Create a completely new object with only the fields we need
    // This ensures no unexpected fields from the database interfere with our UI
    const transformedTransaction = {
      id: data.id,
      user_id: data.user_id,
      account_id: data.account_id,
      category_id: data.category_id || '',
      amount: data.amount,
      currency: data.currency || 'USD',
      // Map note to description for UI
      description: data.note || '',
      // Store the original note as well
      note: data.note || '',
      // Set is_income based on the type field
      is_income: data.type === 'income',
      // Preserve the original type
      type: data.type,
      // Map transaction_date to date for UI
      date: data.transaction_date,
      transaction_date: data.transaction_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Include the account data
      account: accountData,
      // Include category data (required by the Transaction interface)
      category: {
        id: data.category_id || '',
        name: 'Uncategorized',
        color: '#888888',
        is_income: data.type === 'income'
      },
      // Include tags
      tags: data.tags || []
    };
    
    console.log("Transformed transaction for UI:", transformedTransaction);
    
    return transformedTransaction
  }

  return null
}

export async function createTransaction(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  // Extract form data - only include fields that exist in the database
  const note = formData.get("description") as string // Using 'description' from form for 'note' field
  const amount = Number.parseFloat(formData.get("amount") as string)
  const isIncome = formData.get("is_income") === "true"
  const accountId = formData.get("account_id") as string
  const tags = formData.get("tags") ? (formData.get("tags") as string).split(',') : []
  const date = (formData.get("date") as string) || new Date().toISOString()

  // Determine transaction type based on is_income
  const type = isIncome ? 'income' : 'expense'

  // Validate required fields
  if (!note || isNaN(amount) || !accountId) {
    throw new Error("Description, amount, and account are required")
  }

  // Verify account belongs to user
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single()

  if (accountError || !account) {
    throw new Error("Invalid account or account does not belong to user")
  }

  // Create transaction with only the fields that exist in the database
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: accountId,
      transaction_date: date,
      type,
      amount,
      note,
      tags
    })
    .select(`
      *,
      account:accounts(id, name, account_type, institution)
    `)

  if (error) {
    console.error("Error creating transaction:", error)
    throw new Error("Failed to create transaction")
  }

  // Update account balance
  const { error: balanceError } = await supabase.rpc("update_account_balance", {
    p_account_id: accountId,
    p_amount: isIncome ? amount : -amount,
  })

  if (balanceError) {
    console.error("Error updating account balance:", balanceError)
    // Consider rolling back the transaction here
  }

  // Revalidate transactions page
  revalidatePath("/transactions")

  // Transform data to match the expected format in the application
  const transformedData = data?.[0] ? {
    ...data[0],
    date: data[0].transaction_date,
    description: data[0].note || '',
    is_income: data[0].type === 'income',
    // Transform account data if it exists
    account: data[0].account ? {
      ...data[0].account,
      // Map account_type to type for UI compatibility
      type: data[0].account.account_type
    } : null
  } : null

  return transformedData
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  // Get original transaction to calculate balance adjustment
  const { data: originalTransaction, error: fetchError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !originalTransaction) {
    throw new Error("Transaction not found or access denied")
  }

  // Extract form data - use the same approach as createTransaction
  // This ensures consistency between creation and editing
  const description = formData.get("description") as string
  const amountStr = formData.get("amount") as string
  const amount = amountStr ? Number.parseFloat(amountStr) : originalTransaction.amount
  const accountId = formData.get("account_id") as string || originalTransaction.account_id
  const tags = formData.get("tags") ? (formData.get("tags") as string).split(',') : originalTransaction.tags || []
  
  // Get the transaction date from form data with fallback
  const date = formData.get("date") as string || originalTransaction.transaction_date
  
  // Get transaction type directly from the form
  // The type field is the primary source of truth
  let type = formData.get("type") as string
  
  // Log all form data for debugging
  console.log("Form data for transaction update:", {
    type: formData.get("type"),
    is_income: formData.get("is_income"),
    description: formData.get("description"),
    date: formData.get("date")
  })
  
  // Ensure we have a valid type - this is critical
  if (!type || (type !== "income" && type !== "expense")) {
    // If no valid type from form, check is_income as fallback
    const isIncomeStr = formData.get("is_income") as string
    if (isIncomeStr === "true") {
      type = "income"
    } else if (isIncomeStr === "false") {
      type = "expense"
    } else {
      // If still no valid type, use the original transaction type
      type = originalTransaction.type
    }
  }
  
  // Double check that we have a valid type
  if (!type || (type !== "income" && type !== "expense")) {
    type = "expense" // Default fallback
  }
  
  // Log the values for debugging
  console.log("Update transaction values:", { 
    description, 
    amount, 
    accountId, 
    date, 
    type 
  })
  
  // Validate with more helpful error messages
  if (!description) {
    throw new Error("Description is required")
  }

  if (isNaN(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number")
  }

  if (!accountId) {
    throw new Error("Account is required")
  }

  // Check if account changed
  const accountChanged = originalTransaction.account_id !== accountId

  // If account changed, verify new account belongs to user
  if (accountChanged) {
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single()

    if (accountError || !account) {
      throw new Error("Invalid account or account does not belong to user")
    }
  }

  // Calculate balance adjustments
  const originalAmount = originalTransaction.type === 'income'
    ? originalTransaction.amount
    : -originalTransaction.amount

  // Determine if this is an income transaction based on type
  const isIncome = type === 'income'
  const newAmount = isIncome ? amount : -amount

  // Update transaction
  const { data, error } = await supabase
    .from("transactions")
    .update({
      account_id: accountId,
      transaction_date: date,
      type, // Using the type directly from the form
      amount,
      note: description, // Map description to note field in the database
      tags,
      // updated_at will be handled by the trigger function
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(`
      *,
      account:accounts(id, name, account_type, institution)
    `)
    
  // Log the updated data for debugging
  console.log("Updated transaction data from database:", data)

  if (error) {
    console.error("Error updating transaction:", error)
    throw new Error("Failed to update transaction")
  }

  // Update account balances if needed
  if (accountChanged) {
    // Reverse the original transaction from the old account
    const { error: oldAccountError } = await supabase.rpc("update_account_balance", {
      p_account_id: originalTransaction.account_id,
      p_amount: -originalAmount,
    })

    if (oldAccountError) {
      console.error("Error updating old account balance:", oldAccountError)
    }

    // Add the new transaction to the new account
    const { error: newAccountError } = await supabase.rpc("update_account_balance", {
      p_account_id: accountId,
      p_amount: newAmount,
    })

    if (newAccountError) {
      console.error("Error updating new account balance:", newAccountError)
    }
  }

  // Revalidate transactions page
  revalidatePath("/transactions")
  revalidatePath(`/transactions/${id}`)

  return data[0]
}

export async function deleteTransaction(id: string) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  // Get transaction details before deleting
  const { data: transaction, error: fetchError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !transaction) {
    throw new Error("Transaction not found or access denied")
  }

  // Delete the transaction
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("Error deleting transaction:", error)
    throw new Error("Failed to delete transaction")
  }

  // Update account balance - adjust based on transaction type
  const balanceAdjustment = transaction.type === 'income'
    ? -transaction.amount
    : transaction.amount

  const { error: balanceError } = await supabase.rpc("update_account_balance", {
    p_account_id: transaction.account_id,
    p_amount: balanceAdjustment,
  })

  if (balanceError) {
    console.error("Error updating account balance:", balanceError)
  }

  // Revalidate transactions page
  revalidatePath("/transactions")

  return { success: true }
}

export async function getRecentTransactions(limit = 5) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    console.error("Failed to initialize Supabase client")
    return []
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      account:accounts(id, name, account_type, institution)
    `)
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching recent transactions:", error)
    return []
  }

  // Transform data to match the expected format in the application
  const transformedData = data?.map(transaction => {
    // Transform account data if it exists
    const accountData = transaction.account ? {
      ...transaction.account,
      // Map account_type to type for UI compatibility
      type: transaction.account.account_type
    } : null;
    
    return {
      ...transaction,
      date: transaction.transaction_date,
      description: transaction.note || '',
      is_income: transaction.type === 'income',
      account: accountData
    };
  }) || []

  return transformedData
}

export async function getTransactionStats(period: "week" | "month" | "year" = "month") {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    console.error("Failed to initialize Supabase client")
    return {
      totalTransactions: 0,
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      averageTransaction: 0,
      largestIncome: 0,
      largestExpense: 0,
      incomeTransactions: 0,
      expenseTransactions: 0,
      categorySummary: [],
    }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return {
      totalTransactions: 0,
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      averageTransaction: 0,
      largestIncome: 0,
      largestExpense: 0,
      incomeTransactions: 0,
      expenseTransactions: 0,
      categorySummary: [],
    }
  }

  // Calculate date range based on period
  const now = new Date()
  let startDate: Date

  if (period === "week") {
    startDate = new Date(now)
    startDate.setDate(now.getDate() - 7)
  } else if (period === "month") {
    startDate = new Date(now)
    startDate.setMonth(now.getMonth() - 1)
  } else {
    startDate = new Date(now)
    startDate.setFullYear(now.getFullYear() - 1)
  }

  const { data, error } = await supabase
    .from("transactions")
    .select(`*`)
    .eq("user_id", user.id)
    .gte("transaction_date", startDate.toISOString())
    .lte("transaction_date", now.toISOString())

  if (error) {
    console.error("Error fetching transaction stats:", error)
    return {
      totalTransactions: 0,
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      averageTransaction: 0,
      largestIncome: 0,
      largestExpense: 0,
      incomeTransactions: 0,
      expenseTransactions: 0,
      categorySummary: [],
    }
  }

  if (!data || data.length === 0) {
    return {
      totalTransactions: 0,
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      averageTransaction: 0,
      largestIncome: 0,
      largestExpense: 0,
      incomeTransactions: 0,
      expenseTransactions: 0,
      categorySummary: [],
    }
  }

  // Calculate statistics based on transaction type instead of is_income field
  const totalIncome = data
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = data
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const netIncome = totalIncome - totalExpenses
  const totalTransactions = data.length
  const averageTransaction = totalTransactions > 0 ? (totalIncome + totalExpenses) / totalTransactions : 0
  
  // Calculate additional statistics
  const incomeTransactions = data.filter((t) => t.type === 'income').length
  const expenseTransactions = data.filter((t) => t.type === 'expense').length
  
  // Find largest transactions
  const largestIncome = data
    .filter((t) => t.type === 'income')
    .reduce((max, t) => Math.max(max, t.amount), 0)
    
  const largestExpense = data
    .filter((t) => t.type === 'expense')
    .reduce((max, t) => Math.max(max, t.amount), 0)
  
  // Group transactions by tags for category summary
  const categorySummary = data.reduce((acc: Record<string, {tag: string; count: number; amount: number; type: string}>, transaction) => {
    if (transaction.tags && transaction.tags.length > 0) {
      transaction.tags.forEach((tag: string) => {
        if (!acc[tag]) {
          acc[tag] = {
            tag,
            count: 0,
            amount: 0,
            type: transaction.type
          }
        }
        acc[tag].count += 1
        acc[tag].amount += transaction.amount
      })
    }
    return acc
  }, {})

  return {
    totalTransactions,
    totalIncome,
    totalExpenses,
    netIncome,
    averageTransaction,
    largestIncome,
    largestExpense,
    incomeTransactions,
    expenseTransactions,
    categorySummary: Object.values(categorySummary),
  }
}

// Interface for monthly income/expense data
interface MonthlyIncomeExpense {
  month: string;
  income: number;
  expenses: number;
  recurring_income?: number;
  one_time_income?: number;
  recurring_expenses?: number;
  one_time_expenses?: number;
}

// Interface for combined transaction data
interface CombinedTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  is_income: boolean;
  category?: any;
  account?: any;
  source_type: 'transaction' | 'income' | 'expense';
  [key: string]: any; // Allow additional properties
}

// Get monthly income and expense data for the past 12 months
// Get combined transactions from both income sources and expenses
export async function getCombinedTransactions(): Promise<CombinedTransaction[]> {
  try {
    const supabase = await createServerSupabaseClient()

    if (!supabase) {
      console.error("Failed to initialize Supabase client")
      return []
    }

    const [transactions, incomes, expensesResult] = await Promise.all([
      getTransactions(),
      getIncomes(),
      getExpenses(),
    ])
    
    // Handle the expenses result which might be an array or an object with error
    const expenses = Array.isArray(expensesResult) ? expensesResult : []

    // Format transactions - transactions are already transformed in getTransactions()
    const formattedTransactions = transactions.map((transaction) => ({
      ...transaction,
      source_type: "transaction" as const,
    }))

    // Format income sources from the new income schema
    const formattedIncomeSources = incomes.map((income) => ({
      id: income.id,
      description: income.source_name,
      amount: income.amount,
      date: income.start_date,
      is_income: true,
      type: 'income',
      category: {
        name: income.category?.name || "Income",
        color: "#10b981",
        icon: "dollar-sign",
        is_income: true,
      },
      source_type: "income" as const,
    }))

    // Format expenses
    const formattedExpenses = expenses.map((expense: any) => ({
      id: expense.id,
      description: expense.merchant || 'Expense',
      amount: expense.amount,
      date: expense.expense_date,
      is_income: false,
      type: 'expense',
      category: {
        name: expense.categories?.[0]?.name || "Expense",
        color: "#ef4444",
        icon: "credit-card",
        is_income: false,
      },
      source_type: "expense" as const,
    }))

    // Combine and sort by date
    const combinedTransactions = [
      ...formattedTransactions,
      ...formattedIncomeSources,
      ...formattedExpenses,
    ].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    
    return combinedTransactions
  } catch (error) {
    console.error("Error fetching combined transactions:", error)
    return []
  }
}

export async function getMonthlyIncomeExpenseData(): Promise<MonthlyIncomeExpense[]> {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to initialize Supabase client")
      return []
    }

    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    // Calculate date range for the past 12 months
    const today = new Date()
    const startDate = new Date(today)
    startDate.setMonth(today.getMonth() - 11) // 12 months ago
    startDate.setDate(1) // Start of month

    // Get all transactions in the period
    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("transaction_date", startDate.toISOString())
      .lte("transaction_date", today.toISOString())
      .order("transaction_date", { ascending: true })

    if (transactionError) {
      console.error("Error fetching transaction data:", transactionError)
      // Continue with empty transactions array
    }

    // Get income data from the income table
    const { data: incomeData, error: incomeError } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_date", startDate.toISOString())
      .lte("start_date", today.toISOString())
      .order("start_date", { ascending: true })

    if (incomeError) {
      console.error("Error fetching income data:", incomeError)
      // Continue with empty income array
    }

    // Get expense data from the expenses table
    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("expense_date", startDate.toISOString())
      .lte("expense_date", today.toISOString())
      .order("expense_date", { ascending: true })

    if (expenseError) {
      console.error("Error fetching expense data:", expenseError)
      // Continue with empty expense array
    }

    // Create a map of months with income and expense totals
    const monthlyData: { [key: string]: MonthlyIncomeExpense } = {}

    // Initialize the past 12 months with zero values
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(today)
      monthDate.setMonth(today.getMonth() - 11 + i)
      
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`
      const monthName = monthDate.toLocaleString("default", { month: "short" })
      
      monthlyData[monthKey] = {
        month: monthName,
        income: 0,
        expenses: 0,
      }
    }

    // Aggregate transaction data by month
    if (transactionData) {
      transactionData.forEach((transaction) => {
        const date = new Date(transaction.transaction_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

        if (monthlyData[monthKey]) {
          if (transaction.type === 'income') {
            monthlyData[monthKey].income += transaction.amount || 0
          } else if (transaction.type === 'expense') {
            monthlyData[monthKey].expenses += transaction.amount || 0
          }
        }
      })
    }

    // Add income data
    if (incomeData) {
      incomeData.forEach((income) => {
        const date = new Date(income.start_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

        if (monthlyData[monthKey]) {
          // Track recurring and non-recurring income separately
          const isRecurring = income.recurrence && income.recurrence !== 'none';
          
          // Add to the total income
          monthlyData[monthKey].income += income.amount || 0;
          
          // Add recurring flag to the monthly data if not already present
          if (!monthlyData[monthKey].hasOwnProperty('recurring_income')) {
            monthlyData[monthKey].recurring_income = 0;
            monthlyData[monthKey].one_time_income = 0;
          }
          
          // Add to the appropriate category
          if (isRecurring) {
            monthlyData[monthKey].recurring_income += income.amount || 0;
          } else {
            monthlyData[monthKey].one_time_income += income.amount || 0;
          }
        }
      })
    }

    // Add expense data
    if (expenseData) {
      expenseData.forEach((expense) => {
        const date = new Date(expense.expense_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

        if (monthlyData[monthKey]) {
          // Track recurring and non-recurring expenses separately
          const isRecurring = expense.recurrence && expense.recurrence !== 'none';
          
          // Add to the total expenses
          monthlyData[monthKey].expenses += expense.amount || 0;
          
          // Add recurring flag to the monthly data if not already present
          if (!monthlyData[monthKey].hasOwnProperty('recurring_expenses')) {
            monthlyData[monthKey].recurring_expenses = 0;
            monthlyData[monthKey].one_time_expenses = 0;
          }
          
          // Add to the appropriate category
          if (isRecurring) {
            monthlyData[monthKey].recurring_expenses += expense.amount || 0;
          } else {
            monthlyData[monthKey].one_time_expenses += expense.amount || 0;
          }
        }
      })
    }

    // Convert to array and sort by month
    return Object.values(monthlyData)
      .map((value) => ({
        month: value.month,
        income: value.income,
        expenses: value.expenses,
        recurring_income: value.recurring_income || 0,
        one_time_income: value.one_time_income || 0,
        recurring_expenses: value.recurring_expenses || 0,
        one_time_expenses: value.one_time_expenses || 0
      }))
      .sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
      })
  } catch (error) {
    console.error('Error in getMonthlyIncomeExpenseData:', error)
    return []
  }
}

// Interface for financial calendar data
export interface FinancialCalendarData {
  date: string
  income?: number
  expenses?: number
  events?: Array<{
    id: string
    title: string
    amount: number
    type: "income" | "expense"
  }>
}

export async function getFinancialCalendarData(): Promise<FinancialCalendarData[]> {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to initialize Supabase client")
      return []
    }
    
    // Get combined transactions from income sources and expenses
    const combinedTransactions = await getCombinedTransactions()
    
    // Group transactions by date
    const calendarData: Record<string, FinancialCalendarData> = {}
    
    combinedTransactions.forEach(transaction => {
      // Format date as YYYY-MM-DD
      const dateKey = new Date(transaction.date).toISOString().split('T')[0]
      
      // Initialize the date entry if it doesn't exist
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = {
          date: dateKey,
          income: 0,
          expenses: 0,
          events: []
        }
      }
      
      // Add transaction to the appropriate category based on transaction type
      if (transaction.type === 'income' || transaction.is_income) {
        calendarData[dateKey].income = (calendarData[dateKey].income || 0) + transaction.amount
      } else if (transaction.type === 'expense' || (!transaction.is_income && transaction.type !== 'transfer')) {
        calendarData[dateKey].expenses = (calendarData[dateKey].expenses || 0) + transaction.amount
      }
      
      // Add event details
      calendarData[dateKey].events?.push({
        id: transaction.id,
        title: transaction.description || transaction.note || '',
        amount: transaction.amount,
        type: (transaction.type === 'income' || transaction.is_income) ? "income" : "expense"
      })
    })
    
    // Convert to array
    return Object.values(calendarData)
  } catch (error) {
    console.error("Error fetching financial calendar data:", error)
    return []
  }
}
