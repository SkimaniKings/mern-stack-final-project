import { createServerSupabaseClient } from "@/lib/supabase/server"

interface Transaction {
  amount: number
  date: string
}

interface SpendingPattern {
  category_id: string
  category_name: string
  average_amount: number
  frequency: number
  typical_day_of_month?: number
  transactions?: Transaction[]
}

interface BudgetRecommendation {
  model_type: "traditional" | "zero-based" | "50-30-20" | "envelope"
  total_budget: number
  categories: {
    id: string
    name: string
    recommended_amount: number
    confidence_score: number // 0-1
    reasoning: string
  }[]
  savings_target: number
  risk_level: "low" | "medium" | "high"
  adjustments: string[]
}

export async function analyzePastSpending(userId: string, months: number = 3): Promise<SpendingPattern[]> {
  const supabase = await createServerSupabaseClient()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  interface TransactionWithCategory {
    amount: number
    date: string
    category: {
      id: string
      name: string
    } | null
  }

  const { data: rawTransactions, error } = await supabase
    .from("transactions")
    .select(`
      amount,
      date,
      category:categories(id, name)
    `)
    .eq("user_id", userId)
    .gte("date", startDate.toISOString())
    .order("date", { ascending: false })

  // Convert raw data to typed data
  const transactions: TransactionWithCategory[] = (rawTransactions || []).map(t => ({
    amount: Number(t.amount),
    date: String(t.date),
    category: t.category?.[0] ? {
      id: String(t.category[0].id),
      name: String(t.category[0].name)
    } : null
  }))

  if (error) {
    console.error("Error analyzing spending:", error)
    return []
  }

  const patterns = new Map<string, SpendingPattern>()

  transactions.forEach((transaction: TransactionWithCategory) => {
    const category = transaction.category
    if (!category) return

    const key = category.id
    const existing = patterns.get(key) || {
      category_id: category.id,
      category_name: category.name,
      average_amount: 0,
      frequency: 0,
      transactions: [] as Transaction[]
    }

    existing.transactions = existing.transactions || []
    existing.transactions.push({
      amount: transaction.amount,
      date: transaction.date
    })

    patterns.set(key, existing)
  })

  // Calculate averages and frequencies
  const result: SpendingPattern[] = []
  patterns.forEach(pattern => {
    const transactions = pattern.transactions || []
    const totalAmount = transactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0)
    
    // Calculate average amount
    pattern.average_amount = totalAmount / transactions.length

    // Calculate frequency (transactions per month)
    pattern.frequency = transactions.length / months

    // Try to detect typical day of month for recurring expenses
    if (transactions.length >= 2) {
      const days = transactions.map((t: Transaction) => new Date(t.date).getDate())
      const dayFrequency = new Map<number, number>()
      days.forEach((day: number) => {
        dayFrequency.set(day, (dayFrequency.get(day) || 0) + 1)
      })
      
      let maxFreq = 0
      let typicalDay = undefined
      dayFrequency.forEach((freq, day) => {
        if (freq > maxFreq) {
          maxFreq = freq
          typicalDay = day
        }
      })

      // Only set typical day if it occurs in at least 50% of months
      if (maxFreq >= months * 0.5) {
        pattern.typical_day_of_month = typicalDay
      }
    }

    delete pattern.transactions // Clean up before returning
    result.push(pattern)
  })

  return result
}

export async function generateBudgetRecommendation(
  userId: string,
  monthlyIncome: number,
  modelType: "traditional" | "zero-based" | "50-30-20" | "envelope"
): Promise<BudgetRecommendation> {
  // Get spending patterns
  const patterns = await analyzePastSpending(userId)
  
  // Calculate total monthly spending
  const totalSpending = patterns.reduce((sum: number, p: SpendingPattern) => sum + (p.average_amount * p.frequency), 0)
  
  // Calculate savings potential
  const savingsPotential = monthlyIncome - totalSpending
  const savingsTarget = Math.max(monthlyIncome * 0.2, savingsPotential) // Target at least 20% savings

  // Initialize recommendation
  const recommendation: BudgetRecommendation = {
    model_type: modelType,
    total_budget: monthlyIncome - savingsTarget,
    categories: [],
    savings_target: savingsTarget,
    risk_level: "medium",
    adjustments: []
  }

  // Generate category recommendations based on model type
  switch (modelType) {
    case "50-30-20":
      // 50% needs, 30% wants, 20% savings
      const needs = patterns.filter(p => isNeedCategory(p.category_name))
      const wants = patterns.filter(p => !isNeedCategory(p.category_name))
      
      const needsBudget = monthlyIncome * 0.5
      const wantsBudget = monthlyIncome * 0.3

      // Allocate needs budget
      needs.forEach(pattern => {
        const ratio = pattern.average_amount * pattern.frequency / totalSpending
        recommendation.categories.push({
          id: pattern.category_id,
          name: pattern.category_name,
          recommended_amount: needsBudget * ratio,
          confidence_score: calculateConfidenceScore(pattern),
          reasoning: generateReasoning(pattern, "need")
        })
      })

      // Allocate wants budget
      wants.forEach(pattern => {
        const ratio = pattern.average_amount * pattern.frequency / totalSpending
        recommendation.categories.push({
          id: pattern.category_id,
          name: pattern.category_name,
          recommended_amount: wantsBudget * ratio,
          confidence_score: calculateConfidenceScore(pattern),
          reasoning: generateReasoning(pattern, "want")
        })
      })
      break

    case "zero-based":
      // Allocate every dollar with priority on essential expenses
      let remainingBudget = monthlyIncome - savingsTarget
      const prioritizedPatterns = [...patterns].sort((a, b) => 
        (isNeedCategory(b.category_name) ? 1 : 0) - (isNeedCategory(a.category_name) ? 1 : 0)
      )

      prioritizedPatterns.forEach(pattern => {
        const monthlyAmount = pattern.average_amount * pattern.frequency
        const allocated = Math.min(monthlyAmount, remainingBudget)
        remainingBudget -= allocated

        recommendation.categories.push({
          id: pattern.category_id,
          name: pattern.category_name,
          recommended_amount: allocated,
          confidence_score: calculateConfidenceScore(pattern),
          reasoning: generateReasoning(pattern, "zero-based")
        })
      })
      break

    case "envelope":
      // Similar to zero-based but with more emphasis on discretionary spending control
      patterns.forEach((pattern: SpendingPattern) => {
        const monthlyAmount = pattern.average_amount * pattern.frequency
        const recommended = pattern.typical_day_of_month
          ? monthlyAmount // Keep consistent amount for recurring expenses
          : monthlyAmount * 0.9 // Reduce discretionary spending by 10%

        recommendation.categories.push({
          id: pattern.category_id,
          name: pattern.category_name,
          recommended_amount: recommended,
          confidence_score: calculateConfidenceScore(pattern),
          reasoning: generateReasoning(pattern, "envelope")
        })
      })
      break

    default: // traditional
      // Base recommendations on historical spending with some optimization
      patterns.forEach((pattern: SpendingPattern) => {
        const monthlyAmount = pattern.average_amount * pattern.frequency
        const recommended = monthlyAmount * 0.95 // Suggest 5% reduction as a starting point

        recommendation.categories.push({
          id: pattern.category_id,
          name: pattern.category_name,
          recommended_amount: recommended,
          confidence_score: calculateConfidenceScore(pattern),
          reasoning: generateReasoning(pattern, "traditional")
        })
      })
  }

  // Add adjustment recommendations
  if (savingsPotential < 0) {
    recommendation.risk_level = "high"
    recommendation.adjustments.push("Current spending exceeds income. Consider reducing discretionary expenses.")
  } else if (savingsPotential < monthlyIncome * 0.2) {
    recommendation.risk_level = "medium"
    recommendation.adjustments.push("Savings rate below target. Look for opportunities to optimize spending.")
  }

  // Look for potential optimizations
  patterns.forEach(pattern => {
    if (pattern.average_amount * pattern.frequency > monthlyIncome * 0.3) {
      recommendation.adjustments.push(
        `${pattern.category_name} spending is over 30% of income. Consider ways to reduce this expense.`
      )
    }
  })

  return recommendation
}

function isNeedCategory(categoryName: string): boolean {
  const needCategories = [
    "rent", "mortgage", "utilities", "groceries", "healthcare",
    "insurance", "transportation", "debt payments"
  ]
  return needCategories.some(need => 
    categoryName.toLowerCase().includes(need.toLowerCase())
  )
}

function calculateConfidenceScore(pattern: SpendingPattern): number {
  let score = 0.5 // Base score

  // Higher confidence for recurring expenses
  if (pattern.typical_day_of_month !== undefined) {
    score += 0.3
  }

  // Higher confidence for consistent frequency
  if (pattern.frequency >= 0.9) { // Almost monthly
    score += 0.2
  }

  return Math.min(score, 1)
}

function generateReasoning(
  pattern: SpendingPattern,
  modelContext: "need" | "want" | "zero-based" | "envelope" | "traditional"
): string {
  const monthly = pattern.average_amount * pattern.frequency
  const isRecurring = pattern.typical_day_of_month !== undefined

  if (isRecurring) {
    return `Regular expense occurring around day ${pattern.typical_day_of_month} of each month. Historical average: ${monthly.toFixed(2)}`
  }

  switch (modelContext) {
    case "need":
      return `Essential expense with monthly average of ${monthly.toFixed(2)}`
    case "want":
      return `Discretionary expense with monthly average of ${monthly.toFixed(2)}`
    case "zero-based":
      return `Historical monthly spending: ${monthly.toFixed(2)}`
    case "envelope":
      return `Suggested envelope amount based on ${pattern.frequency.toFixed(1)} transactions per month`
    default:
      return `Based on historical average of ${monthly.toFixed(2)} per month`
  }
}
