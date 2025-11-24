export type RecurrenceFrequency = 'none' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface Expense {
  id: string;
  user_id: string;
  budget_item_id?: string | null;
  merchant: string;
  amount: number;
  currency: string;
  expense_date: string;
  location_name?: string | null;
  location_geo?: { type: string; coordinates: number[] } | null;
  receipt_url?: string | null;
  warranty_expiration_date?: string | null;
  recurrence: RecurrenceFrequency;
  is_impulse: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Relations
  categories?: ExpenseCategory[];
  splits?: SplitExpense[];
}

export interface ExpenseFormData {
  merchant: string;
  amount: number;
  currency?: string;
  expense_date: string;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  receipt_url?: string | null;
  warranty_expiration_date?: string | null;
  recurrence?: RecurrenceFrequency;
  is_impulse?: boolean;
  notes?: string | null;
  budget_item_id?: string | null;
  categories?: string[];
  split_with?: SplitExpenseInput[];
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
  // UI helpers
  children?: ExpenseCategory[];
}

export interface ExpenseCategoryLink {
  expense_id: string;
  category_id: string;
}

export interface SplitExpense {
  id: string;
  expense_id: string;
  shared_with_user: string;
  shared_with_name?: string;
  amount: number;
  note?: string | null;
  created_at?: string;
}

export interface SplitExpenseInput {
  user_id: string;
  amount: number;
  note?: string | null;
}

// Default categories for UI
export const DefaultExpenseCategories = [
  "Food", 
  "Transportation", 
  "Housing", 
  "Entertainment", 
  "Utilities", 
  "Shopping", 
  "Health", 
  "Travel", 
  "Education", 
  "Other"
] as const;

export type DefaultExpenseCategory = typeof DefaultExpenseCategories[number];
