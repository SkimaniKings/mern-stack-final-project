"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getExpenses } from '@/app/actions/expenses'

// Define the shape of our expense data
export interface ExpenseData {
  id: string
  merchant: string
  amount: number
  expense_date: string
  recurrence?: string
  categories?: any[]
  splits?: any[]
  location_name?: string
  notes?: string
  [key: string]: any // Allow for additional properties
}

// Define the context shape
interface ExpenseContextType {
  expenses: ExpenseData[]
  loading: boolean
  error: Error | null
  refreshExpenses: () => Promise<void>
  lastUpdated: Date | null
}

// Create the context with default values
const ExpenseContext = createContext<ExpenseContextType>({
  expenses: [],
  loading: true,
  error: null,
  refreshExpenses: async () => {},
  lastUpdated: null
})

// Hook to use the expense context
export const useExpenses = () => useContext(ExpenseContext)

// Provider component
export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Function to fetch expenses
  const refreshExpenses = async () => {
    try {
      setLoading(true)
      const data = await getExpenses()
      
      // Ensure data is an array
      const expensesArray = Array.isArray(data) 
        ? data 
        : (data && 'data' in data && Array.isArray(data.data)) 
          ? data.data 
          : []
      
      console.log(`Loaded ${expensesArray.length} expenses into context`)
      setExpenses(expensesArray)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error('Error fetching expenses:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch expenses'))
    } finally {
      setLoading(false)
    }
  }

  // Load expenses when the component mounts
  useEffect(() => {
    refreshExpenses()
  }, [])

  // Set up event listeners for expense changes
  useEffect(() => {
    // Function to handle storage events (for cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'expense_added' || e.key === 'expense_updated' || e.key === 'expense_deleted') {
        console.log('Expense change detected via storage event, refreshing data')
        refreshExpenses()
      }
    }
    
    // Function to handle custom events (for same-window updates)
    const handleCustomEvent = () => {
      console.log('Expense change detected via custom event, refreshing data')
      refreshExpenses()
    }
    
    // Add event listeners
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('expense_updated', handleCustomEvent)
    window.addEventListener('expense_added', handleCustomEvent)
    window.addEventListener('expense_deleted', handleCustomEvent)
    
    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('expense_updated', handleCustomEvent)
      window.removeEventListener('expense_added', handleCustomEvent)
      window.removeEventListener('expense_deleted', handleCustomEvent)
    }
  }, [])

  return (
    <ExpenseContext.Provider value={{ expenses, loading, error, refreshExpenses, lastUpdated }}>
      {children}
    </ExpenseContext.Provider>
  )
}
