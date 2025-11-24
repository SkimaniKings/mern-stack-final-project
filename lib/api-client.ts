/**
 * API client functions for fetching recurring financial data
 */

/**
 * Fetches recurring income sources (excluding one-time payments)
 * @returns Array of recurring income sources
 */
export async function getRecurringIncome() {
  try {
    const response = await fetch('/api/income-sources/recurring')
    
    if (!response.ok) {
      throw new Error(`Error fetching recurring income: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch recurring income:', error)
    return [] // Return empty array as fallback
  }
}

/**
 * Fetches recurring expense patterns
 * @returns Array of recurring expense patterns
 */
export async function getRecurringExpenses() {
  try {
    const response = await fetch('/api/recurring-patterns')
    
    if (!response.ok) {
      throw new Error(`Error fetching recurring expenses: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch recurring expenses:', error)
    return [] // Return empty array as fallback
  }
}

/**
 * Fetches combined transactions (income and expenses)
 * @returns Array of transactions
 */
export async function getCombinedTransactions() {
  try {
    const response = await fetch('/api/transactions')
    
    if (!response.ok) {
      throw new Error(`Error fetching transactions: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return [] // Return empty array as fallback
  }
}
