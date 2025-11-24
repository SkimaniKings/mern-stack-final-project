export interface IncomeSource {
  id: string
  user_id: string
  name: string
  type: "salary" | "bonus" | "freelance" | "rental" | "investment" | "passive" | "other"
  amount: number
  frequency: "weekly" | "bi-weekly" | "monthly" | "annually" | "one-time"
  currency: string
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  is_active?: boolean
}

export interface IncomeEvent {
  id: string
  user_id: string
  income_source_id: string | null
  name: string
  type: "raise" | "bonus" | "commission" | "promotion" | "other"
  amount: number
  percentage: number | null
  date: string
  is_recurring: boolean
  recurrence_pattern: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Deduction {
  id: string
  user_id: string
  income_source_id: string | null
  name: string
  type: "pre-tax" | "post-tax"
  category: string
  amount: number
  is_percentage: boolean
  frequency: "per-paycheck" | "monthly" | "annually"
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TaxBracket {
  id: string
  user_id: string
  tax_year: number
  filing_status: "single" | "married-joint" | "married-separate" | "head-of-household"
  bracket_order: number
  income_threshold: number
  tax_rate: number
  created_at: string
  updated_at: string
}

export interface IncomeGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  start_date: string
  target_date: string | null
  is_completed: boolean
  category: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SideHustleActivity {
  id: string
  user_id: string
  income_source_id: string | null
  date: string
  hours_worked: number | null
  amount_earned: number
  expenses: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CurrencyRate {
  id: string
  base_currency: string
  target_currency: string
  rate: number
  as_of_date: string
  created_at: string
  updated_at: string
}

export interface IncomeDiversificationScore {
  overall_score: number
  source_count: number
  primary_dependency: number
  stability_score: number
  growth_potential: number
  breakdown: {
    source_id: string
    source_name: string
    percentage: number
    score_contribution: number
  }[]
}

export interface TaxCalculation {
  gross_income: number
  taxable_income: number
  total_tax: number
  effective_tax_rate: number
  marginal_tax_rate: number
  breakdown: {
    bracket: number
    amount: number
    tax: number
  }[]
  deductions: {
    name: string
    amount: number
    impact: number
  }[]
  optimization_suggestions: string[]
}

export interface IncomeProjection {
  timeline: {
    date: string
    amount: number
    events: IncomeEvent[]
  }[]
  annual_totals: {
    year: number
    amount: number
    growth_rate: number
  }[]
  cumulative_growth: number
}
