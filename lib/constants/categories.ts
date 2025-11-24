export interface Category {
  id: string
  name: string
  description?: string
  parent_category_id?: string
  is_temporary?: boolean
  color?: string
  icon?: string
  is_income?: boolean
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Food & Dining", color: "#FF6B6B", is_income: false, icon: "utensils" },
  { id: "00000000-0000-0000-0000-000000000002", name: "Shopping", color: "#4ECDC4", is_income: false, icon: "shopping-bag" },
  { id: "00000000-0000-0000-0000-000000000003", name: "Transportation", color: "#45B7D1", is_income: false, icon: "car" },
  { id: "00000000-0000-0000-0000-000000000004", name: "Entertainment", color: "#96CEB4", is_income: false, icon: "film" },
  { id: "00000000-0000-0000-0000-000000000005", name: "Travel", color: "#FFEEAD", is_income: false, icon: "plane" },
  { id: "00000000-0000-0000-0000-000000000006", name: "Health & Fitness", color: "#D4A5A5", is_income: false, icon: "heart" },
  { id: "00000000-0000-0000-0000-000000000007", name: "Groceries", color: "#9DE0AD", is_income: false, icon: "shopping-cart" },
  { id: "00000000-0000-0000-0000-000000000008", name: "Bills & Utilities", color: "#FF9999", is_income: false, icon: "file-text" },
  { id: "00000000-0000-0000-0000-000000000009", name: "Personal Care", color: "#A8E6CF", is_income: false, icon: "user" },
  { id: "00000000-0000-0000-0000-000000000010", name: "Education", color: "#DCD6F7", is_income: false, icon: "book" },
  { id: "00000000-0000-0000-0000-000000000011", name: "Gifts & Donations", color: "#FFB6B9", is_income: false, icon: "gift" },
  { id: "00000000-0000-0000-0000-000000000012", name: "Home", color: "#B5EAD7", is_income: false, icon: "home" },
  { id: "00000000-0000-0000-0000-000000000013", name: "Auto", color: "#C7CEEA", is_income: false, icon: "car" },
  { id: "00000000-0000-0000-0000-000000000014", name: "Taxes", color: "#E2F0CB", is_income: false, icon: "calculator" },
  { id: "00000000-0000-0000-0000-000000000015", name: "Other", color: "#B5B5B5", is_income: false, icon: "more" },
]

export const INCOME_CATEGORIES: Category[] = [
  { id: "00000000-0000-0000-0000-000000000101", name: "Salary", color: "#4CAF50", is_income: true, icon: "briefcase" },
  { id: "00000000-0000-0000-0000-000000000102", name: "Freelance", color: "#2196F3", is_income: true, icon: "laptop" },
  { id: "00000000-0000-0000-0000-000000000103", name: "Investments", color: "#9C27B0", is_income: true, icon: "trending-up" },
  { id: "00000000-0000-0000-0000-000000000104", name: "Rental Income", color: "#FF9800", is_income: true, icon: "home" },
  { id: "00000000-0000-0000-0000-000000000105", name: "Business", color: "#795548", is_income: true, icon: "briefcase" },
  { id: "00000000-0000-0000-0000-000000000106", name: "Gifts", color: "#E91E63", is_income: true, icon: "gift" },
  { id: "00000000-0000-0000-0000-000000000107", name: "Other Income", color: "#607D8B", is_income: true, icon: "more" },
]

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] 