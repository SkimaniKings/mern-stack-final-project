import { createClient } from "@supabase/supabase-js"
import type { BudgetTemplate, Category, Transaction } from "@/types/budget"
import { LIFE_EVENT_TEMPLATES } from "../templates/life-events"
import { LIFESTYLE_TEMPLATES } from "../templates/lifestyle"

interface SpendingPattern {
  category: string
  average: number
  volatility: number
  trend: "increasing" | "decreasing" | "stable"
}

interface FinancialProfile {
  monthlyIncome: number
  savingsRate: number
  debtToIncome: number
  spendingPatterns: SpendingPattern[]
  riskTolerance: number
  goals: string[]
}

export class BudgetRecommender {
  private supabase
  private templates: BudgetTemplate[]

  constructor() {
    this.supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    this.templates = [...LIFE_EVENT_TEMPLATES, ...LIFESTYLE_TEMPLATES]
  }

  async analyzeTransactions(userId: string, months: number = 6): Promise<SpendingPattern[]> {
    const { data: transactions } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())

    if (!transactions) return []

    const patterns = this.calculateSpendingPatterns(transactions)
    return patterns
  }

  private calculateSpendingPatterns(transactions: Transaction[]): SpendingPattern[] {
    const categoryTotals = new Map<string, number[]>()

    // Group transactions by category and month
    transactions.forEach(transaction => {
      if (!categoryTotals.has(transaction.category)) {
        categoryTotals.set(transaction.category, [])
      }
      const monthlyAmounts = categoryTotals.get(transaction.category)!
      const monthIndex = new Date(transaction.date).getMonth()
      monthlyAmounts[monthIndex] = (monthlyAmounts[monthIndex] || 0) + transaction.amount
    })

    return Array.from(categoryTotals.entries()).map(([category, amounts]) => {
      const average = amounts.reduce((a, b) => a + b, 0) / amounts.length
      const volatility = this.calculateVolatility(amounts)
      const trend = this.analyzeTrend(amounts)

      return {
        category,
        average,
        volatility,
        trend,
      }
    })
  }

  private calculateVolatility(amounts: number[]): number {
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = amounts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / amounts.length
    return Math.sqrt(variance)
  }

  private analyzeTrend(amounts: number[]): "increasing" | "decreasing" | "stable" {
    const slope = this.calculateLinearRegression(amounts)
    if (slope > 0.1) return "increasing"
    if (slope < -0.1) return "decreasing"
    return "stable"
  }

  private calculateLinearRegression(amounts: number[]): number {
    const n = amounts.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = amounts

    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0)
    const sumXX = x.reduce((a, b) => a + b * b, 0)

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  }

  async buildFinancialProfile(userId: string): Promise<FinancialProfile> {
    const [income, savings, debt, spendingPatterns] = await Promise.all([
      this.getMonthlyIncome(userId),
      this.getSavingsRate(userId),
      this.getDebtToIncome(userId),
      this.analyzeTransactions(userId),
    ])

    const goals = await this.inferFinancialGoals(spendingPatterns)
    const riskTolerance = this.calculateRiskTolerance(spendingPatterns, savings, debt)

    return {
      monthlyIncome: income,
      savingsRate: savings,
      debtToIncome: debt,
      spendingPatterns,
      riskTolerance,
      goals,
    }
  }

  private async getMonthlyIncome(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from("income_sources")
      .select("amount, frequency")
      .eq("user_id", userId)

    if (!data) return 0

    return data.reduce((total, source) => {
      switch (source.frequency) {
        case "weekly":
          return total + source.amount * 4
        case "biweekly":
          return total + source.amount * 2
        case "monthly":
          return total + source.amount
        case "annually":
          return total + source.amount / 12
        default:
          return total
      }
    }, 0)
  }

  private async getSavingsRate(userId: string): Promise<number> {
    const monthlyIncome = await this.getMonthlyIncome(userId)
    const { data: transactions } = await this.supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (!transactions || !monthlyIncome) return 0

    const monthlyExpenses = transactions.reduce((total, t) => total + t.amount, 0)
    return (monthlyIncome - monthlyExpenses) / monthlyIncome
  }

  private async getDebtToIncome(userId: string): Promise<number> {
    const monthlyIncome = await this.getMonthlyIncome(userId)
    const { data: debts } = await this.supabase
      .from("debts")
      .select("amount")
      .eq("user_id", userId)

    if (!debts || !monthlyIncome) return 0

    const totalDebt = debts.reduce((total, d) => total + d.amount, 0)
    return totalDebt / (monthlyIncome * 12)
  }

  private async inferFinancialGoals(patterns: SpendingPattern[]): Promise<string[]> {
    const goals: string[] = []

    // Analyze spending patterns to infer goals
    const highVolatilityCategories = patterns.filter(p => p.volatility > 100)
    const increasingCategories = patterns.filter(p => p.trend === "increasing")

    if (highVolatilityCategories.length > 0) {
      goals.push("stabilize_spending")
    }

    if (increasingCategories.some(c => c.category === "debt_payment")) {
      goals.push("debt_reduction")
    }

    if (increasingCategories.some(c => c.category === "investment")) {
      goals.push("wealth_building")
    }

    return goals
  }

  private calculateRiskTolerance(
    patterns: SpendingPattern[],
    savingsRate: number,
    debtToIncome: number
  ): number {
    let score = 50 // Base score

    // Adjust based on savings rate
    if (savingsRate > 0.2) score += 20
    else if (savingsRate > 0.1) score += 10
    else if (savingsRate < 0) score -= 20

    // Adjust based on debt to income
    if (debtToIncome > 0.5) score -= 20
    else if (debtToIncome > 0.3) score -= 10
    else if (debtToIncome < 0.2) score += 10

    // Adjust based on spending volatility
    const avgVolatility = patterns.reduce((sum, p) => sum + p.volatility, 0) / patterns.length
    if (avgVolatility > 50) score -= 10
    else if (avgVolatility < 20) score += 10

    return Math.max(0, Math.min(100, score))
  }

  async recommendTemplate(userId: string): Promise<BudgetTemplate | null> {
    const profile = await this.buildFinancialProfile(userId)
    
    // Score each template based on the financial profile
    const scoredTemplates = this.templates.map(template => ({
      template,
      score: this.scoreTemplate(template, profile),
    }))

    // Sort by score and return the best match
    scoredTemplates.sort((a, b) => b.score - a.score)
    return scoredTemplates[0]?.template || null
  }

  private scoreTemplate(template: BudgetTemplate, profile: FinancialProfile): number {
    let score = 0

    // Check income range
    if (
      profile.monthlyIncome * 12 >= template.recommendedIncome.min &&
      profile.monthlyIncome * 12 <= template.recommendedIncome.max
    ) {
      score += 30
    }

    // Match template type with risk tolerance
    if (
      (template.type === "50-30-20" && profile.riskTolerance < 40) ||
      (template.type === "zero-based" && profile.riskTolerance > 60)
    ) {
      score += 20
    }

    // Match template tags with goals
    const templateTags = new Set(template.tags)
    profile.goals.forEach(goal => {
      if (templateTags.has(goal)) score += 15
    })

    // Consider spending patterns
    profile.spendingPatterns.forEach(pattern => {
      template.categories.forEach(category => {
        if (category.name.toLowerCase().includes(pattern.category.toLowerCase())) {
          if (pattern.trend === "increasing") score += 10
          if (pattern.volatility < 30) score += 5
        }
      })
    })

    return score
  }

  async generateCustomTemplate(userId: string): Promise<BudgetTemplate> {
    const profile = await this.buildFinancialProfile(userId)
    const baseTemplate = await this.recommendTemplate(userId)

    if (!baseTemplate) {
      throw new Error("Could not find a suitable base template")
    }

    // Adjust category allocations based on spending patterns
    const adjustedCategories = this.adjustCategoryAllocations(
      baseTemplate.categories,
      profile.spendingPatterns
    )

    return {
      ...baseTemplate,
      categories: adjustedCategories,
      defaultAllocation: this.calculateDefaultAllocation(adjustedCategories),
    }
  }

  private adjustCategoryAllocations(
    categories: Category[],
    patterns: SpendingPattern[]
  ): Category[] {
    return categories.map(category => {
      const pattern = patterns.find(p =>
        p.category.toLowerCase().includes(category.name.toLowerCase())
      )

      if (pattern) {
        const adjustmentFactor = this.calculateAdjustmentFactor(pattern)
        return {
          ...category,
          percentage: Math.round(category.percentage * adjustmentFactor),
          subcategories: category.subcategories?.map(sub => ({
            ...sub,
            percentage: Math.round(sub.percentage * adjustmentFactor),
          })),
        }
      }

      return category
    })
  }

  private calculateAdjustmentFactor(pattern: SpendingPattern): number {
    let factor = 1

    // Adjust based on trend
    if (pattern.trend === "increasing") factor *= 1.2
    else if (pattern.trend === "decreasing") factor *= 0.8

    // Adjust based on volatility
    if (pattern.volatility > 50) factor *= 1.1
    else if (pattern.volatility < 20) factor *= 0.9

    return factor
  }

  private calculateDefaultAllocation(categories: Category[]): Record<string, number> {
    const allocation: Record<string, number> = {}
    categories.forEach(category => {
      allocation[category.name] = category.percentage
    })
    return allocation
  }
}
