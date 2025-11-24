export interface Category {
  id: string
  user_id: string
  name: string
  description?: string
  parent_category_id?: string
  is_temporary?: boolean
  color?: string
  icon?: string
  is_income?: boolean
  is_system?: boolean

  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: string
  balance: number
  currency: string
  is_active: boolean
  institution: string | null
  account_number: string | null
  notes: string | null
  color: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string
  date: string
  amount: number
  description: string
  is_income: boolean
  // Advanced tracking fields
  latitude: number | null
  longitude: number | null
  merchant_name: string | null
  is_recurring: boolean
  recurrence_pattern: string | null
  time_of_day: string | null
  is_split: boolean
  created_at: string
  updated_at: string
}

export interface Receipt {
  id: string
  transaction_id: string
  image_url: string
  ocr_text: string | null
  has_warranty: boolean
  warranty_end_date: string | null
  created_at: string
  updated_at: string
}

export interface SplitTransaction {
  id: string
  transaction_id: string
  amount: number
  description: string | null
  participant_name: string
  is_settled: boolean
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  name: string
  amount: number
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

export interface BudgetCategory {
  id: string
  budget_id: string
  category_id: string
  amount: number
  created_at: string
  updated_at: string
}

export interface FinancialGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  description: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface MerchantAnalytics {
  id: string
  merchant_name: string
  visit_count: number
  average_spend: number
  last_visit_date: string
  common_categories: string[]
  created_at: string
  updated_at: string
}

