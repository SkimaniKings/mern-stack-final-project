export interface Transaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  type: "income" | "expense"
  account: string
  latitude?: number
  longitude?: number
  merchant_name?: string
  is_recurring?: boolean
  recurrence_pattern?: string
  time_of_day?: string
  is_split?: boolean
}

