// This file provides mock data for components that would normally fetch data from the database
// It's used as a temporary replacement while authentication is disabled

export const mockUser = {
  id: "mock-user-id",
  email: "demo@example.com",
  name: "Demo User",
  created_at: new Date().toISOString(),
}

export const mockTransactions = [
  {
    id: "tx-1",
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    description: "Grocery Store",
    amount: -78.52,
    category: "Food",
  },
  {
    id: "tx-2",
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    description: "Salary Deposit",
    amount: 2500.0,
    category: "Income",
  },
  {
    id: "tx-3",
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    description: "Electric Bill",
    amount: -145.3,
    category: "Utilities",
  },
  {
    id: "tx-4",
    date: new Date(Date.now() - 86400000 * 7).toISOString(),
    description: "Restaurant",
    amount: -65.2,
    category: "Food",
  },
  {
    id: "tx-5",
    date: new Date(Date.now() - 86400000 * 10).toISOString(),
    description: "Gas Station",
    amount: -48.75,
    category: "Transportation",
  },
]

export const mockBudgets = [
  {
    id: "budget-1",
    category: "Food",
    amount: 500,
    spent: 320.45,
    period: "monthly",
  },
  {
    id: "budget-2",
    category: "Transportation",
    amount: 200,
    spent: 150.25,
    period: "monthly",
  },
  {
    id: "budget-3",
    category: "Entertainment",
    amount: 150,
    spent: 87.99,
    period: "monthly",
  },
  {
    id: "budget-4",
    category: "Utilities",
    amount: 300,
    spent: 290.3,
    period: "monthly",
  },
]

export const mockNetWorth = {
  total: 35420.75,
  assets: 42500.0,
  liabilities: 7079.25,
  history: [
    { date: new Date(Date.now() - 86400000 * 180).toISOString(), value: 28500.0 },
    { date: new Date(Date.now() - 86400000 * 150).toISOString(), value: 29750.0 },
    { date: new Date(Date.now() - 86400000 * 120).toISOString(), value: 31200.0 },
    { date: new Date(Date.now() - 86400000 * 90).toISOString(), value: 32100.0 },
    { date: new Date(Date.now() - 86400000 * 60).toISOString(), value: 33450.0 },
    { date: new Date(Date.now() - 86400000 * 30).toISOString(), value: 34200.0 },
    { date: new Date().toISOString(), value: 35420.75 },
  ],
}

export const mockFinancialHealth = {
  score: 78,
  savingsRate: 15,
  debtToIncome: 22,
  emergencyFund: 3.5,
  investmentRate: 12,
}

// Add more mock data as needed for other components

