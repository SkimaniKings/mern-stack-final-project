import { type BudgetModel } from "@/types/budget"

// Traditional Budget Model (Fixed Percentages)
export function generateTraditionalBudget(monthlyIncome: number): BudgetModel {
  return {
    type: "traditional",
    name: "Traditional Budget",
    description: "A simple percentage-based budget following common guidelines",
    categories: [
      { name: "Housing", percentage: 30, amount: monthlyIncome * 0.3 },
      { name: "Transportation", percentage: 15, amount: monthlyIncome * 0.15 },
      { name: "Food", percentage: 15, amount: monthlyIncome * 0.15 },
      { name: "Utilities", percentage: 10, amount: monthlyIncome * 0.1 },
      { name: "Insurance", percentage: 10, amount: monthlyIncome * 0.1 },
      { name: "Savings", percentage: 10, amount: monthlyIncome * 0.1 },
      { name: "Entertainment", percentage: 5, amount: monthlyIncome * 0.05 },
      { name: "Other", percentage: 5, amount: monthlyIncome * 0.05 },
    ],
    totalBudget: monthlyIncome,
    savingsTarget: monthlyIncome * 0.1,
    riskLevel: "low",
  }
}

// 50/30/20 Budget Model
export function generate503020Budget(monthlyIncome: number): BudgetModel {
  const needs = monthlyIncome * 0.5
  const wants = monthlyIncome * 0.3
  const savings = monthlyIncome * 0.2

  return {
    type: "50-30-20",
    name: "50/30/20 Budget",
    description: "50% needs, 30% wants, 20% savings - a balanced approach to budgeting",
    categories: [
      {
        name: "Needs",
        percentage: 50,
        amount: needs,
        subcategories: [
          { name: "Housing", percentage: 25, amount: monthlyIncome * 0.25 },
          { name: "Groceries", percentage: 10, amount: monthlyIncome * 0.1 },
          { name: "Utilities", percentage: 8, amount: monthlyIncome * 0.08 },
          { name: "Insurance", percentage: 7, amount: monthlyIncome * 0.07 },
        ],
      },
      {
        name: "Wants",
        percentage: 30,
        amount: wants,
        subcategories: [
          { name: "Entertainment", percentage: 10, amount: monthlyIncome * 0.1 },
          { name: "Shopping", percentage: 10, amount: monthlyIncome * 0.1 },
          { name: "Dining Out", percentage: 10, amount: monthlyIncome * 0.1 },
        ],
      },
      {
        name: "Savings",
        percentage: 20,
        amount: savings,
        subcategories: [
          { name: "Emergency Fund", percentage: 10, amount: monthlyIncome * 0.1 },
          { name: "Investments", percentage: 10, amount: monthlyIncome * 0.1 },
        ],
      },
    ],
    totalBudget: monthlyIncome,
    savingsTarget: savings,
    riskLevel: "medium",
  }
}

// Zero-Based Budget Model
export function generateZeroBasedBudget(monthlyIncome: number, expenses: any[]): BudgetModel {
  // Sort expenses by priority and amount
  const sortedExpenses = expenses.sort((a, b) => {
    if (a.priority === b.priority) {
      return b.amount - a.amount
    }
    return a.priority - b.priority
  })

  let remainingIncome = monthlyIncome
  const categories = sortedExpenses.map(expense => {
    const amount = Math.min(expense.amount, remainingIncome)
    remainingIncome -= amount
    return {
      name: expense.name,
      amount,
      percentage: (amount / monthlyIncome) * 100,
      priority: expense.priority,
    }
  })

  // Add any remaining income to savings
  if (remainingIncome > 0) {
    categories.push({
      name: "Additional Savings",
      amount: remainingIncome,
      percentage: (remainingIncome / monthlyIncome) * 100,
      priority: 999,
    })
  }

  return {
    type: "zero-based",
    name: "Zero-Based Budget",
    description: "Every dollar has a job - maximum control over your spending",
    categories,
    totalBudget: monthlyIncome,
    savingsTarget: categories.reduce(
      (acc, cat) => (cat.name.includes("Savings") ? acc + cat.amount : acc),
      0
    ),
    riskLevel: "low",
  }
}

// Envelope System Budget Model
export function generateEnvelopeBudget(
  monthlyIncome: number,
  spendingHistory: any[]
): BudgetModel {
  // Analyze spending history to determine envelope allocations
  const historicalSpending = spendingHistory.reduce((acc, transaction) => {
    const category = transaction.category
    if (!acc[category]) {
      acc[category] = { total: 0, count: 0 }
    }
    acc[category].total += transaction.amount
    acc[category].count++
    return acc
  }, {})

  // Calculate average monthly spending per category
  const envelopes = Object.entries(historicalSpending).map(([category, data]: [string, any]) => {
    const averageMonthly = data.total / (data.count / 12) // Assuming monthly data points
    const suggestedAmount = Math.min(averageMonthly * 1.1, monthlyIncome * 0.3) // Cap at 30% of income
    return {
      name: category,
      amount: suggestedAmount,
      percentage: (suggestedAmount / monthlyIncome) * 100,
      historical: {
        average: averageMonthly,
        frequency: data.count / 12, // Monthly frequency
      },
    }
  })

  // Ensure total allocation doesn't exceed income
  let totalAllocated = envelopes.reduce((sum, env) => sum + env.amount, 0)
  if (totalAllocated > monthlyIncome) {
    const scale = monthlyIncome / totalAllocated
    envelopes.forEach(env => {
      env.amount *= scale
      env.percentage *= scale
    })
    totalAllocated = monthlyIncome
  }

  // Add savings envelope with remaining money
  const remainingForSavings = monthlyIncome - totalAllocated
  if (remainingForSavings > 0) {
    envelopes.push({
      name: "Savings",
      amount: remainingForSavings,
      percentage: (remainingForSavings / monthlyIncome) * 100,
      historical: {
        average: 0,
        frequency: 1, // Monthly
      }
    })
  }

  return {
    type: "envelope",
    name: "Envelope System",
    description: "Physical or digital envelopes for each spending category",
    categories: envelopes,
    totalBudget: monthlyIncome,
    savingsTarget: remainingForSavings,
    riskLevel: "medium",
  }
}

// AI Budget Generator
export async function generateAIBudget(
  monthlyIncome: number,
  spendingHistory: any[],
  financialGoals: any[],
  riskTolerance: "low" | "medium" | "high"
): Promise<BudgetModel> {
  // Analyze spending patterns
  const spendingPatterns = analyzeSpendingPatterns(spendingHistory)
  
  // Calculate optimal budget model based on goals and patterns
  const modelType = determineOptimalModel(spendingPatterns, financialGoals, riskTolerance)
  
  // Generate base budget using selected model
  let budget: BudgetModel
  switch (modelType) {
    case "50-30-20":
      budget = generate503020Budget(monthlyIncome)
      break
    case "zero-based":
      budget = generateZeroBasedBudget(monthlyIncome, spendingPatterns.expenses)
      break
    case "envelope":
      budget = generateEnvelopeBudget(monthlyIncome, spendingHistory)
      break
    default:
      budget = generateTraditionalBudget(monthlyIncome)
  }

  // Adjust allocations based on goals
  budget = adjustForGoals(budget, financialGoals)

  // Add AI-specific insights
  budget.insights = generateInsights(budget, spendingPatterns, financialGoals)
  budget.adjustments = suggestAdjustments(budget, spendingPatterns)
  budget.predictions = generatePredictions(budget, spendingPatterns)

  return budget
}

// Helper functions for AI Budget Generator
function analyzeSpendingPatterns(spendingHistory: any[]) {
  return {
    expenses: spendingHistory.map(transaction => ({
      name: transaction.category,
      amount: transaction.amount,
      priority: determinePriority(transaction),
      frequency: calculateFrequency(transaction),
      trend: calculateTrend(transaction),
    })),
    totalSpent: spendingHistory.reduce((sum, t) => sum + t.amount, 0),
    averageMonthlySpend: 0, // Calculate based on date range
    volatility: 0, // Calculate spending volatility
    seasonality: [], // Identify seasonal patterns
  }
}

function determineOptimalModel(
  patterns: any,
  goals: any[],
  riskTolerance: "low" | "medium" | "high"
): "traditional" | "50-30-20" | "zero-based" | "envelope" {
  // Logic to determine best model based on:
  // 1. Spending volatility
  // 2. Financial goals
  // 3. Risk tolerance
  // 4. Income stability
  // 5. Past budgeting success
  
  if (patterns.volatility > 0.3) {
    return "envelope" // High volatility -> envelope system for better control
  }
  
  if (goals.some(g => g.type === "debt_reduction")) {
    return "zero-based" // Debt reduction -> zero-based for maximum control
  }
  
  if (riskTolerance === "medium" && patterns.volatility < 0.2) {
    return "50-30-20" // Stable income and medium risk -> balanced approach
  }
  
  return "traditional" // Default to traditional for simplicity
}

function adjustForGoals(budget: BudgetModel, goals: any[]): BudgetModel {
  goals.forEach(goal => {
    switch (goal.type) {
      case "savings":
        increaseSavingsAllocation(budget, goal.target)
        break
      case "debt_reduction":
        increaseDebtPaymentAllocation(budget, goal.target)
        break
      case "investment":
        adjustInvestmentAllocation(budget, goal.target)
        break
    }
  })
  return budget
}

function generateInsights(budget: BudgetModel, patterns: any, goals: any[]) {
  return {
    strengths: identifyBudgetStrengths(budget, patterns),
    weaknesses: identifyBudgetWeaknesses(budget, patterns),
    opportunities: identifyOpportunities(budget, patterns, goals),
    risks: identifyRisks(budget, patterns),
  }
}

function suggestAdjustments(budget: BudgetModel, patterns: any) {
  return {
    immediate: generateImmediateAdjustments(budget, patterns),
    shortTerm: generateShortTermAdjustments(budget, patterns),
    longTerm: generateLongTermAdjustments(budget, patterns),
  }
}

function generatePredictions(budget: BudgetModel, patterns: any) {
  return {
    savingsGrowth: predictSavingsGrowth(budget, patterns),
    debtReduction: predictDebtReduction(budget, patterns),
    goalAchievement: predictGoalAchievement(budget, patterns),
    riskFactors: identifyFutureRisks(budget, patterns),
  }
}

// Placeholder functions for helper methods
function determinePriority(transaction: any) { return 1 }
function calculateFrequency(transaction: any) { return "monthly" }
function calculateTrend(transaction: any) { return "stable" }
function increaseSavingsAllocation(budget: BudgetModel, target: number) {}
function increaseDebtPaymentAllocation(budget: BudgetModel, target: number) {}
function adjustInvestmentAllocation(budget: BudgetModel, target: number) {}
function identifyBudgetStrengths(budget: BudgetModel, patterns: any) { return [] }
function identifyBudgetWeaknesses(budget: BudgetModel, patterns: any) { return [] }
function identifyOpportunities(budget: BudgetModel, patterns: any, goals: any[]) { return [] }
function identifyRisks(budget: BudgetModel, patterns: any) { return [] }
function generateImmediateAdjustments(budget: BudgetModel, patterns: any) { return [] }
function generateShortTermAdjustments(budget: BudgetModel, patterns: any) { return [] }
function generateLongTermAdjustments(budget: BudgetModel, patterns: any) { return [] }
function predictSavingsGrowth(budget: BudgetModel, patterns: any) { return {} }
function predictDebtReduction(budget: BudgetModel, patterns: any) { return {} }
function predictGoalAchievement(budget: BudgetModel, patterns: any) { return {} }
function identifyFutureRisks(budget: BudgetModel, patterns: any) { return [] }
