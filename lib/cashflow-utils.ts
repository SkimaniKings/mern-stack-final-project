import { createServerSupabaseClient } from "@/lib/supabase/server"

export interface CashflowForecast {
  projectedIncome: number
  projectedExpenses: number
  netCashflow: number
  savingsRate: number
  monthlyTrend: {
    month: string
    income: number
    expenses: number
    net: number
  }[]
  monthOverMonth?: {
    income: number
    expenses: number
  }
}

export async function getCashflowForecast(userId: string): Promise<CashflowForecast> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    throw new Error("Failed to create Supabase client")
  }
  
  // Get the last 3 months of data to establish trends
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  
  // Get expenses with proper type for category
  interface ExpenseWithCategory {
    amount: number
    spent_at: string
    category: {
      is_income: boolean
    } | null
  }

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, spent_at, category:categories(is_income)")
    .eq("user_id", userId)
    .gte("spent_at", threeMonthsAgo.toISOString())
    .order("spent_at", { ascending: true }) as { data: ExpenseWithCategory[] | null }

  // Get recurring income sources from the new income schema
  // Only include incomes that are recurring (not one-time) and haven't reached their end date
  const { data: incomes } = await supabase
    .from("incomes")
    .select("*, category:income_categories(id, name), deductions:income_deductions(*), hustles:income_hustles(*)")
    .eq("user_id", userId)
    .neq("recurrence", "none") // Exclude one-time payments
    .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`) // Only include active incomes

  // Group transactions by month
  const monthlyData = expenses?.reduce((acc: any, expense) => {
    const month = new Date(expense.spent_at).toISOString().slice(0, 7)
    if (!acc[month]) {
      acc[month] = { income: 0, expenses: 0 }
    }
    if (expense.category?.is_income) {
      acc[month].income += expense.amount
    } else {
      acc[month].expenses += expense.amount
    }
    return acc
  }, {}) || {}

  // Add recurring income to monthly data using the new income schema
  incomes?.forEach(income => {
    // Calculate total deductions
    let totalDeductions = 0;
    if (income.deductions && Array.isArray(income.deductions)) {
      totalDeductions = income.deductions.reduce((sum: number, deduction: any) => {
        return sum + (deduction.amount || 0);
      }, 0);
    }
    
    // Calculate total side hustles
    let totalHustles = 0;
    if (income.hustles && Array.isArray(income.hustles)) {
      totalHustles = income.hustles.reduce((sum: number, hustle: any) => {
        return sum + (hustle.hustle_amount || 0);
      }, 0);
    }
    
    // Calculate adjusted amount with deductions and side hustles
    const adjustedAmount = income.amount - totalDeductions + totalHustles;
    
    // Use the monthly_equivalent_amount that's already calculated by the database
    // If not available, calculate it based on the adjusted amount
    const monthlyAmount = income.monthly_equivalent_amount || normalizeToMonthlyAmount(adjustedAmount, income.recurrence);
    
    // Add to each month's income
    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].income += monthlyAmount;
    });
  });

  // Calculate monthly trends
  const monthlyTrend = Object.entries(monthlyData)
    .map(([month, data]: [string, any]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Calculate month-over-month changes
  const monthOverMonth = {
    income: 0,
    expenses: 0
  }

  if (monthlyTrend.length >= 2) {
    const currentMonth = monthlyTrend[monthlyTrend.length - 1]
    const previousMonth = monthlyTrend[monthlyTrend.length - 2]

    monthOverMonth.income = previousMonth.income > 0
      ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100
      : 0

    monthOverMonth.expenses = previousMonth.expenses > 0
      ? ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100
      : 0
  }

  // Calculate projections based on trends and recurring incomes
  let projectedIncome = 0;
  
  // If we have recurring incomes, use their sum as the projected income
  if (incomes && incomes.length > 0) {
    projectedIncome = incomes.reduce((sum, income) => {
      return sum + (income.monthly_equivalent_amount || 0);
    }, 0);
  } else {
    // Fallback to trend-based projection if no recurring incomes
    projectedIncome = calculateProjection(monthlyTrend.map(m => m.income));
  }
  
  const projectedExpenses = calculateProjection(monthlyTrend.map(m => m.expenses));
  const netCashflow = projectedIncome - projectedExpenses;
  const savingsRate = projectedIncome > 0 ? (netCashflow / projectedIncome) * 100 : 0;

  return {
    projectedIncome,
    projectedExpenses,
    netCashflow,
    savingsRate,
    monthlyTrend,
    monthOverMonth: {
      income: Math.round(monthOverMonth.income),
      expenses: Math.round(monthOverMonth.expenses)
    }
  }
}

function normalizeToMonthlyAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case "annually":
      return amount / 12
    case "quarterly":
      return amount / 3
    case "bi-weekly":
      return amount * 2.17 // Average bi-weekly periods in a month
    case "weekly":
      return amount * 4.33 // Average weeks in a month
    case "daily":
      return amount * 30.42 // Average days in a month
    default:
      return amount // Monthly
  }
}

function calculateProjection(values: number[]): number {
  if (values.length === 0) return 0
  
  // Simple linear regression
  const n = values.length
  const indices = Array.from({ length: n }, (_, i) => i)
  
  const sumX = indices.reduce((a, b) => a + b, 0)
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0)
  const sumXX = indices.reduce((sum, x) => sum + x * x, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  // Project next month
  const nextMonth = n
  const projection = slope * nextMonth + intercept
  
  return Math.max(0, projection) // Ensure non-negative
}
