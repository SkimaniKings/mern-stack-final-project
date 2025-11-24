export interface Debt {
  id: string
  user_id: string
  name: string
  current_balance: number
  interest_rate: number
  minimum_payment: number
  loan_term?: number | null
  due_date: string | null
  created_at: string
  updated_at: string
  type?: string // Type of debt (e.g., credit_card, mortgage, personal_loan)
  isLocal?: boolean // Flag to indicate if debt is stored locally
  original_balance?: number // Original loan amount
  payment_frequency?: 'monthly' | 'bi-weekly' | 'weekly' // How often payments are made
  credit_limit?: number // For credit cards, the total available credit limit
  last_payment_date?: string // Date of the last payment made
  next_payment_date?: string // Date of the next scheduled payment
  extra_payment?: number // Additional payment amount beyond minimum
  credit_utilization?: number // For credit cards, the percentage of credit used
  milestone_targets?: DebtMilestone[] // Milestone targets for debt reduction
}

export interface DebtConsolidation {
  id: string
  user_id: string
  total_debt_balance: number
  interest_rate: number
  loan_term?: number | null
  monthly_payment: number
  created_at: string
  updated_at: string
  included_debts: string[] // IDs of debts included in consolidation
  total_interest_before: number
  total_interest_after: number
  interest_savings: number
  monthly_payment_before: number
  monthly_payment_difference: number
  fees: number // Consolidation fees
  net_savings: number // Total savings minus fees
}

export type DebtRepaymentStrategy = "avalanche" | "snowball" | "hybrid" | "custom"

export interface DebtRepaymentPlan {
  debt_id: string
  debt_name: string
  total_balance: number
  interest_rate: number
  monthly_payment: number
  payoff_date: string
  total_interest_paid: number
  months_to_payoff: number
  payment_schedule: PaymentScheduleItem[]
  order_in_strategy: number
  extra_payment_allocation: number
}

export interface InterestSavingsResult {
  current_interest: number
  refinanced_interest: number
  total_savings: number
  monthly_payment_before: number
  monthly_payment_after: number
  payment_difference: number
  new_payoff_date: string
  time_saved: number // in months
}

export interface DebtToIncomeRatio {
  ratio: number
  total_debt: number
  annual_income: number
  monthly_debt_payments: number
  monthly_income: number
  risk_level: 'low' | 'moderate' | 'high' | 'severe'
  improvement_suggestions: string[]
  target_ratio: number
}

export interface PaymentScheduleItem {
  month: number
  date: string
  payment: number
  principal: number
  interest: number
  remaining_balance: number
  extra_payment?: number
}

export interface DebtPayoffProjection {
  months_to_payoff: number
  total_interest_paid: number
  monthly_payment: number
  payoff_date: string
  payment_schedule: PaymentScheduleItem[]
  debt_free_date: string
  total_payment: number
  interest_saved_with_extra_payments?: number
  time_saved_with_extra_payments?: number
}

export interface DebtMilestone {
  id: string
  debt_id: string
  target_amount: number
  target_date: string
  achieved: boolean
  achieved_date?: string
  name: string
  description?: string
  celebration_message?: string
  icon?: string
}
