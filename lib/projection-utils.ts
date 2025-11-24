import { createServerSupabaseClient } from "@/lib/supabase/server"

export interface ProjectedFinances {
  projectedIncome: number
  projectedExpenses: number
  netCashflow: number
  savingsRate: number
  projectedIncomeBreakdown: ProjectedIncomeSource[]
  projectedExpensesBreakdown: ProjectedExpense[]
  monthlyTrend: {
    month: string
    income: number
    expenses: number
    net: number
  }[]
}

export interface ProjectedIncomeSource {
  id: string
  name: string
  amount: number
  sourceType: string
  frequency: string
  nextPaymentDate: string | null
  totalDeductions?: number
  totalHustles?: number
  adjustedAmount?: number
}

export interface ProjectedExpense {
  id: string
  title: string
  amount: number
  originalAmount: number
  category: string
  frequency: string
  frequencyText: string
  nextDueDate: string | null
}

/**
 * Get projected income and expenses for the dashboard
 * @param userId User ID to get projections for
 * @returns Projected finances including income, expenses, and trends
 */
export async function getProjectedFinances(userId: string): Promise<ProjectedFinances> {
  // Default return object with empty/zero values
  const defaultFinances: ProjectedFinances = {
    projectedIncome: 0,
    projectedExpenses: 0,
    netCashflow: 0,
    savingsRate: 0,
    projectedIncomeBreakdown: [],
    projectedExpensesBreakdown: [],
    monthlyTrend: []
  };
  
  // Validate userId
  if (!userId || userId === '') {
    console.error("No user ID provided to getProjectedFinances");
    return defaultFinances;
  }
  
  let supabase;
  try {
    supabase = await createServerSupabaseClient();
    if (!supabase) {
      console.error("Failed to create Supabase client");
      return defaultFinances;
    }
  } catch (error) {
    console.error("Error creating Supabase client:", error);
    return defaultFinances;
  }
  
  // Get recurring income sources from the new income schema
  // Only include incomes that are recurring (not one-time) and haven't reached their end date
  let incomeSources: any[] = [];
  try {
    const today = new Date().toISOString();
    const { data, error } = await supabase
      .from("incomes")
      .select("*, category:income_categories(id, name), deductions:income_deductions(*), hustles:income_hustles(*)")
      .eq("user_id", userId)
      .neq("recurrence", "none") // Exclude one-time payments
      .or(`end_date.is.null,end_date.gte.${today}`) // Only include active incomes
    
    if (error) {
      console.error("Error fetching incomes:", error);
    } else {
      incomeSources = data || [];
    }
  } catch (err) {
    console.error("Exception when fetching incomes:", err);
    // Continue execution with empty income sources
  }

  // Get recurring expenses - these will be auto-populated as projected expenses
  let recurringExpenses: any[] = [];
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        id,
        merchant,
        amount,
        expense_date,
        recurrence,
        categories:expense_categories(id, name, parent_id)
      `)
      .eq("user_id", userId)
      .neq("recurrence", "none")
      .order("expense_date", { ascending: false })
    
    if (error) {
      console.error("Error fetching recurring expenses:", error);
    } else {
      recurringExpenses = data || [];
    }
  } catch (err) {
    console.error("Exception when fetching recurring expenses:", err);
    // Continue execution with empty recurring expenses
  }

  // Calculate projected monthly income using the monthly_equivalent_amount from the new schema
  const projectedIncomeBreakdown = (incomeSources || []).map(source => {
    try {
      // Calculate total deductions
      let totalDeductions = 0;
      if (source.deductions && Array.isArray(source.deductions)) {
        totalDeductions = source.deductions.reduce((sum: number, deduction: any) => {
          return sum + (deduction.amount || 0);
        }, 0);
      }
      
      // Calculate total side hustles
      let totalHustles = 0;
      if (source.hustles && Array.isArray(source.hustles)) {
        totalHustles = source.hustles.reduce((sum: number, hustle: any) => {
          return sum + (hustle.hustle_amount || 0);
        }, 0);
      }
      
      // Calculate adjusted amount with deductions and side hustles
      const adjustedAmount = source.amount - totalDeductions + totalHustles;
      
      // Use the monthly_equivalent_amount that's already calculated by the database
      // If not available, calculate it based on the adjusted amount
      const monthlyAmount = source.monthly_equivalent_amount || normalizeToMonthlyAmount(adjustedAmount, source.recurrence)
      const nextPaymentDate = calculateNextPaymentDate(source)
      
      return {
        id: source.id || 'unknown',
        name: source.source_name || 'Unnamed Income',
        amount: monthlyAmount || 0,
        sourceType: source.category?.name || 'Income',
        frequency: source.recurrence || 'monthly',
        nextPaymentDate,
        // Add additional fields for UI display
        totalDeductions,
        totalHustles,
        adjustedAmount
      }
    } catch (err) {
      console.error("Error processing income source:", err);
      // Return a default object if there's an error processing this income source
      return {
        id: source.id || 'error',
        name: 'Error Processing Income',
        amount: 0,
        sourceType: 'Income',
        frequency: 'monthly',
        nextPaymentDate: null,
        totalDeductions: 0,
        totalHustles: 0,
        adjustedAmount: 0
      };
    }
  })

  // Calculate projected monthly expenses
  const projectedExpensesBreakdown = (recurringExpenses || []).map(expense => {
    try {
      // Get the category name from the joined data
      const category = expense.categories?.name || 'Uncategorized'
      
      // Get the monthly equivalent amount based on recurrence pattern
      const monthlyAmount = normalizeToMonthlyAmount(expense.amount || 0, expense.recurrence || 'monthly')
      
      return {
        id: expense.id || 'unknown',
        title: expense.merchant || 'Unnamed Expense',
        amount: monthlyAmount,
        originalAmount: expense.amount || 0,
        category,
        frequency: expense.recurrence || 'monthly',
        frequencyText: getFrequencyDisplayText(expense.recurrence || 'monthly'),
        nextDueDate: null // We'll calculate this later if needed
      }
    } catch (err) {
      console.error("Error processing expense:", err);
      // Return a default object if there's an error processing this expense
      return {
        id: expense.id || 'error',
        title: 'Error Processing Expense',
        amount: 0,
        originalAmount: 0,
        category: 'Uncategorized',
        frequency: 'monthly',
        frequencyText: 'Monthly',
        nextDueDate: null
      };
    }
  })

  // Calculate total projected income and expenses
  const projectedIncome = projectedIncomeBreakdown.reduce((sum, income) => sum + (Number(income.amount) || 0), 0)
  const projectedExpenses = projectedExpensesBreakdown.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
  const netCashflow = projectedIncome - projectedExpenses
  const savingsRate = projectedIncome > 0 ? (netCashflow / projectedIncome) * 100 : 0
  
  // Generate monthly trend data for the next 6 months
  const today = new Date()
  const monthlyTrend = []
  
  try {
    for (let i = 0; i < 6; i++) {
      const month = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const monthName = month.toLocaleString('default', { month: 'short' })
      
      // For now, we'll just use the same projected values for each month
      // In a future enhancement, we could calculate more accurate projections
      // based on the specific payment dates of each income and expense
      monthlyTrend.push({
        month: monthName,
        income: projectedIncome,
        expenses: projectedExpenses,
        net: netCashflow
      })
    }
  } catch (err) {
    console.error("Error generating monthly trend data:", err);
    // Add at least one month of data to avoid UI errors
    monthlyTrend.push({
      month: 'Forecast',
      income: projectedIncome,
      expenses: projectedExpenses,
      net: netCashflow
    });
  }
  
  // Return the final object with all calculated values
  return {
    projectedIncome,
    projectedExpenses,
    netCashflow,
    savingsRate,
    projectedIncomeBreakdown,
    projectedExpensesBreakdown,
    monthlyTrend
  }
}

/**
 * Normalize an amount to a monthly value based on recurrence frequency
 * This matches the calculation in the income.sql schema
 */
function normalizeToMonthlyAmount(amount: number, frequency: string): number {
  switch (frequency?.toLowerCase()) {
    case 'none':
      return amount // One-time payment
    case 'weekly':
      return amount * 52 / 12 // Weekly to monthly conversion
    case 'bi_weekly':
      return amount * 26 / 12 // Bi-weekly to monthly conversion
    case 'monthly':
      return amount // Already monthly
    case 'quarterly':
      return amount / 3 // Quarterly to monthly
    case 'semi_annual':
      return amount / 6 // Semi-annual to monthly
    case 'annual':
      return amount / 12 // Annual to monthly
    default:
      return amount
  }
}

/**
 * Get a human-readable display text for frequency
 */
function getFrequencyDisplayText(frequency: string): string {
  switch (frequency?.toLowerCase()) {
    case 'none':
      return 'One-time'
    case 'weekly':
      return 'Weekly'
    case 'bi_weekly':
      return 'Bi-weekly'
    case 'monthly':
      return 'Monthly'
    case 'quarterly':
      return 'Quarterly'
    case 'semi_annual':
      return 'Semi-annually'
    case 'annual':
      return 'Annually'
    default:
      return frequency || 'Unknown'
  }
}

/**
 * Calculate the next payment date for an income source based on the new income schema
 * and its recurrence pattern
 */
function calculateNextPaymentDate(source: any): string | null {
  if (!source.start_date) {
    return null
  }

  const startDate = new Date(source.start_date)
  const today = new Date()
  let nextPayment: Date
  
  // Calculate next payment date based on recurrence pattern
  switch (source.recurrence) {
    case 'weekly':
      // Find the next occurrence of the same day of week
      nextPayment = new Date(today)
      const dayDiff = startDate.getDay() - today.getDay()
      nextPayment.setDate(today.getDate() + (dayDiff >= 0 ? dayDiff : dayDiff + 7))
      // If today is the day but time has passed, move to next week
      if (nextPayment.toDateString() === today.toDateString()) {
        nextPayment.setDate(nextPayment.getDate() + 7)
      }
      break
      
    case 'bi_weekly':
      // Similar to weekly but with 2-week intervals
      nextPayment = new Date(today)
      const startDay = startDate.getDay()
      const todayDay = today.getDay()
      
      // Calculate days since the start date
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const weeksFromStart = Math.floor(daysSinceStart / 7)
      
      if (weeksFromStart % 2 === 0 && startDay >= todayDay) {
        // We're in a payment week and the payment day hasn't passed
        nextPayment.setDate(today.getDate() + (startDay - todayDay))
      } else if (weeksFromStart % 2 === 0) {
        // We're in a payment week but the payment day has passed
        nextPayment.setDate(today.getDate() + (startDay - todayDay) + 14)
      } else {
        // We're in a non-payment week
        nextPayment.setDate(today.getDate() + (startDay - todayDay) + (7 - ((weeksFromStart % 2) * 7)))
      }
      break
      
    case 'monthly':
      // Use the same day of month
      const paymentDay = startDate.getDate()
      nextPayment = new Date(today.getFullYear(), today.getMonth(), paymentDay)
      
      // If the payment day has passed this month, move to next month
      if (nextPayment < today) {
        nextPayment.setMonth(nextPayment.getMonth() + 1)
      }
      break
      
    case 'quarterly':
      // Every 3 months on the same day
      const quarterPaymentDay = startDate.getDate()
      const startMonth = startDate.getMonth()
      
      // Calculate which month in the quarter this payment falls
      const monthInQuarter = startMonth % 3
      
      // Calculate the next quarter month
      let nextQuarterMonth = today.getMonth()
      while ((nextQuarterMonth % 3) !== monthInQuarter || 
             (nextQuarterMonth === today.getMonth() && quarterPaymentDay < today.getDate())) {
        nextQuarterMonth++
      }
      
      nextPayment = new Date(today.getFullYear(), nextQuarterMonth, quarterPaymentDay)
      break
      
    case 'semi_annual':
      // Every 6 months on the same day
      const semiAnnualPaymentDay = startDate.getDate()
      const semiAnnualStartMonth = startDate.getMonth()
      
      // Calculate which month in the half-year this payment falls
      const monthInHalfYear = semiAnnualStartMonth % 6
      
      // Calculate the next half-year month
      let nextHalfYearMonth = today.getMonth()
      while ((nextHalfYearMonth % 6) !== monthInHalfYear || 
             (nextHalfYearMonth === today.getMonth() && semiAnnualPaymentDay < today.getDate())) {
        nextHalfYearMonth++
      }
      
      nextPayment = new Date(today.getFullYear(), nextHalfYearMonth, semiAnnualPaymentDay)
      break
      
    case 'annual':
      // Once a year on the same month and day
      const annualMonth = startDate.getMonth()
      const annualDay = startDate.getDate()
      
      nextPayment = new Date(today.getFullYear(), annualMonth, annualDay)
      
      // If this year's date has passed, move to next year
      if (nextPayment < today) {
        nextPayment.setFullYear(nextPayment.getFullYear() + 1)
      }
      break
      
    default:
      // Default to monthly behavior
      const defaultPaymentDay = startDate.getDate()
      nextPayment = new Date(today.getFullYear(), today.getMonth(), defaultPaymentDay)
      
      if (nextPayment < today) {
        nextPayment.setMonth(nextPayment.getMonth() + 1)
      }
  }
  
  // If there's an end_date and the next payment is after it, return null
  if (source.end_date && new Date(source.end_date) < nextPayment) {
    return null
  }
  
  return nextPayment.toISOString()
}

/**
 * Calculate the next due date for a recurring expense
 * Note: This function is kept for reference but no longer used as we're getting
 * the next expected date directly from the recurring_patterns table
 */
function calculateNextExpenseDate(expense: any): string | null {
  if (!expense.recurring_frequency) {
    return null
  }

  const today = new Date()
  const lastSpent = new Date(expense.spent_at)
  let nextDue = new Date(lastSpent)
  
  switch (expense.recurring_frequency.toLowerCase()) {
    case 'daily':
      nextDue.setDate(lastSpent.getDate() + 1)
      break
    case 'weekly':
      nextDue.setDate(lastSpent.getDate() + 7)
      break
    case 'biweekly':
      nextDue.setDate(lastSpent.getDate() + 14)
      break
    case 'monthly':
      nextDue.setMonth(lastSpent.getMonth() + 1)
      break
    case 'quarterly':
      nextDue.setMonth(lastSpent.getMonth() + 3)
      break
    case 'annually':
      nextDue.setFullYear(lastSpent.getFullYear() + 1)
      break
    default:
      return null
  }
  
  // If the next due date has passed, keep adding the frequency until we get a future date
  while (nextDue < today) {
    switch (expense.recurring_frequency.toLowerCase()) {
      case 'daily':
        nextDue.setDate(nextDue.getDate() + 1)
        break
      case 'weekly':
        nextDue.setDate(nextDue.getDate() + 7)
        break
      case 'biweekly':
        nextDue.setDate(nextDue.getDate() + 14)
        break
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1)
        break
      case 'quarterly':
        nextDue.setMonth(nextDue.getMonth() + 3)
        break
      case 'annually':
        nextDue.setFullYear(nextDue.getFullYear() + 1)
        break
    }
  }
  
  return nextDue.toISOString()
}
