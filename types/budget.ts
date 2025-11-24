export type BudgetModelType = "traditional" | "zero_based" | "fifty_thirty_twenty" | "envelope" | "custom"
export type RiskLevel = "low" | "medium" | "high"
export type BudgetRole = "owner" | "editor" | "viewer"

// Database schema interfaces
export interface Budget {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  model: BudgetModelType;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_template?: boolean;
  template_id?: string;
  categories?: BudgetCategory[];
  total_allocated?: number;
  categories_count?: number;
  income?: number;
  amount: number;
}

export interface BudgetCategory {
  id: string;
  budget_id: string;
  category_id: string;
  parent_category_id: string | null;
  amount_allocated: number;
  name?: string;
  color?: string;
  subcategories?: BudgetCategory[];
  items?: BudgetItem[];
}

export interface BudgetItem {
  id?: string
  category_id: string
  amount: number
  actual_amount?: number
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface SharedBudget {
  id: string
  budget_id: string
  user_id: string
  role: BudgetRole
  created_at?: string
  updated_at?: string
}

export interface BudgetScenario {
  id: string
  budget_id: string
  name: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface BudgetAdjustment {
  id: string
  item_id: string
  amount_change: number
  reason?: string
  created_at?: string
  updated_at?: string
}

export interface BudgetTemplate {
  id: string
  name: string
  description?: string
  model: BudgetModelType
  is_default: boolean
  created_at?: string
  updated_at?: string
  // Additional fields for UI
  categories?: BudgetCategory[]
  defaultAllocation?: {
    [key: string]: number // category name -> percentage
  }
  recommendedIncome?: {
    min: number
    max: number
  }
  timeline?: string
  tags?: string[]
}

// UI models
export interface BudgetModel {
  type: BudgetModelType
  name: string
  description: string
  categories: BudgetCategory[]
  totalBudget: number
  savingsTarget: number
  riskLevel: RiskLevel
  insights?: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    risks: string[]
  }
  adjustments?: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }
  predictions?: {
    savingsGrowth: any
    debtReduction: any
    goalAchievement: any
    riskFactors: string[]
  }
}

export interface FinancialGoal {
  type: "savings" | "debt_reduction" | "investment"
  target: number
  deadline?: Date
  priority: number
  currentProgress: number
}
