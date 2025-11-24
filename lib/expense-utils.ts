import { Expense } from "@/types/expense"

// Format expense data for display
export function formatExpense(expense: Expense) {
  return {
    ...expense,
    formattedAmount: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(expense.amount),
    formattedDate: new Date(expense.spent_at).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  }
}

// Format expense data for the calendar
export function formatExpenseForCalendar(expense: Expense) {
  const date = new Date(expense.spent_at)
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  
  return {
    id: expense.id,
    title: expense.description,
    date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    amount: expense.amount,
    category: expense.category
  }
}

// Get expense summary by day
export function getExpenseSummaryByDay(expenses: Expense[]) {
  const summary: { [date: string]: number } = {}

  expenses.forEach((expense) => {
    const date = new Date(expense.spent_at)
    const day = date.getDate()
    const month = date.getMonth()
    const year = date.getFullYear()
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

    if (summary[formattedDate]) {
      summary[formattedDate] += expense.amount
    } else {
      summary[formattedDate] = expense.amount
    }
  })

  return summary
}
