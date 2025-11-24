"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { DebtService } from './debt-service'
import { Debt } from '@/types/debt'

interface DebtContextType {
  debts: Debt[]
  loading: boolean
  error: string | null
  authRequired: boolean
  refreshDebts: () => Promise<void>
  addDebt: (debt: Debt) => void
  updateDebt: (id: string, debt: Partial<Debt>) => void
  removeDebt: (id: string) => void
}

const DebtContext = createContext<DebtContextType | undefined>(undefined)

export function DebtProvider({ children }: { children: ReactNode }) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const debtService = new DebtService()
  
  // Helper function to handle authentication errors
  const handleAuthError = (err: any) => {
    if (err?.message?.includes('Authentication required')) {
      console.log('Authentication required error handled gracefully')
      setError('auth_required')
      setAuthRequired(true)
      // Set empty debts array to prevent UI errors
      setDebts([])
    } else {
      setError(err?.message || 'An error occurred')
    }
  }

  const fetchDebts = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedDebts = await debtService.getDebts()
      console.log('DebtContext: Fetched', fetchedDebts.length, 'debts')
      setDebts(fetchedDebts)
    } catch (err: any) {
      console.error('Error fetching debts:', err)
      handleAuthError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebts()
  }, [])

  const refreshDebts = async () => {
    console.log('DebtContext: Refreshing debts')
    try {
      setLoading(true)
      const debtService = new DebtService()
      const fetchedDebts = await debtService.getDebts()
      console.log('DebtContext: Refreshed', fetchedDebts.length, 'debts')
      
      // Update the debts state with the freshly fetched debts
      setDebts(fetchedDebts)
      
      // Force sync any local debts to the database
      if (fetchedDebts.some(debt => debt.id.startsWith('local-'))) {
        console.log('DebtContext: Found local debts, forcing sync')
        await debtService.forceSync()
        // Fetch again after sync to get the latest data
        const updatedDebts = await debtService.getDebts()
        setDebts(updatedDebts)
      }
    } catch (err: any) {
      console.error('Error refreshing debts:', err)
      handleAuthError(err)
    } finally {
      setLoading(false)
    }
  }

  const addDebt = (debt: Debt) => {
    console.log('DebtContext: Adding debt', debt)
    // Ensure we don't add duplicate debts
    setDebts(prev => {
      // Check if debt already exists
      const exists = prev.some(d => d.id === debt.id)
      if (exists) {
        // If it exists, update it
        return prev.map(d => d.id === debt.id ? debt : d)
      } else {
        // If it doesn't exist, add it to the beginning of the array
        return [debt, ...prev]
      }
    })
    
    // If this is a local debt, trigger a sync in the background
    if (debt.id.startsWith('local-')) {
      setTimeout(async () => {
        try {
          const debtService = new DebtService()
          await debtService.forceSync()
          // Refresh debts after sync
          refreshDebts()
        } catch (err: any) {
          console.error('Error syncing after adding debt:', err)
          handleAuthError(err)
        }
      }, 500)
    }
  }

  const updateDebt = async (id: string, updates: Partial<Debt>) => {
    try {
      setLoading(true)
      console.log('DebtContext: Updating debt', id, updates)
      const updatedDebt = await debtService.updateDebt(id, updates)
      // Check if this update affects calculations (balance, interest, etc.)
      const calculationFields = ['current_balance', 'interest_rate', 'minimum_payment', 'payment_day']
      const hasCalculationChanges = Object.keys(updates).some(key => calculationFields.includes(key))
      
      if (hasCalculationChanges) {
        console.log('DebtContext: Debt update affects calculations, refreshing')
        await refreshDebts() // Refresh from database to ensure we have the latest data
      } else {
        // Just update the local state for non-calculation changes
        setDebts(prevDebts => 
          prevDebts.map(debt => debt.id === id ? { ...debt, ...updates } : debt)
        )
      }
      
      return updatedDebt
    } catch (err: any) {
      console.error('Error updating debt:', err)
      handleAuthError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const removeDebt = (id: string) => {
    console.log('DebtContext: Removing debt', id)
    setDebts(prev => prev.filter(debt => debt.id !== id))
    
    // If this was a local debt, clean up local storage by forcing a sync
    if (id.startsWith('local-')) {
      try {
        // We can't directly access the private method, so we'll use localStorage directly
        const localDebtsKey = 'debts'
        const storedDebts = localStorage.getItem(localDebtsKey)
        if (storedDebts) {
          const debts = JSON.parse(storedDebts)
          const updatedDebts = debts.filter((d: any) => d.id !== id)
          localStorage.setItem(localDebtsKey, JSON.stringify(updatedDebts))
          console.log('Removed debt from localStorage:', id)
        }
      } catch (err) {
        console.error('Error cleaning up local debt:', err)
      }
    }
  }

  return (
    <DebtContext.Provider value={{
      debts,
      loading,
      error,
      authRequired,
      refreshDebts,
      addDebt,
      updateDebt,
      removeDebt
    }}>
      {children}
    </DebtContext.Provider>
  )
}

export function useDebtContext() {
  const context = useContext(DebtContext)
  if (context === undefined) {
    throw new Error('useDebtContext must be used within a DebtProvider')
  }
  return context
}
