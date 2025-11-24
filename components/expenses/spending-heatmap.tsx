"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExpenses } from "@/app/actions/expenses"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"

interface SpendingHeatmapProps {
  className?: string
}

interface DayData {
  date: Date
  amount: number
  count: number
  expenses?: any[] // Array of expenses for this day
}

export function SpendingHeatmap({ className }: SpendingHeatmapProps) {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayData, setDayData] = useState<DayData[]>([])
  const [maxAmount, setMaxAmount] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDayExpenses, setSelectedDayExpenses] = useState<any[]>([])

  // Extract fetchExpenses function outside useEffect to reuse it
  const fetchExpenses = async () => {
    // Only show loading indicator on initial load, not on refreshes
    const isInitialLoad = expenses.length === 0
    if (isInitialLoad) {
      setLoading(true)
    }
    
    try {
      const data = await getExpenses()
      // Ensure data is an array
      const expensesArray = Array.isArray(data) ? data : (data && 'data' in data && Array.isArray(data.data)) ? data.data : []
      setExpenses(expensesArray)
      
      // Process data for heatmap
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      const days = eachDayOfInterval({ start, end })
      
      const processedData = days.map(day => {
        // Filter expenses for this day by comparing expense_date
        const dayExpenses = expensesArray.filter(expense => 
          isSameDay(new Date(expense.expense_date), day)
        )
        
        // Calculate total amount spent on this day
        const amount = dayExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
        
        return {
          date: day,
          amount,
          count: dayExpenses.length,
          expenses: dayExpenses // Store the actual expenses for this day
        }
      })
      
      setDayData(processedData)
      
      // Calculate max amount for color intensity
      const newMaxAmount = Math.max(...processedData.map(d => d.amount), 1)
      setMaxAmount(newMaxAmount)
      
      // Update selected day expenses if a date is selected
      if (selectedDate) {
        const selectedDayData = processedData.find(d => isSameDay(d.date, selectedDate))
        if (selectedDayData) {
          setSelectedDayExpenses(selectedDayData.expenses || [])
        }
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }
  
  // Effect for initial load and month changes
  useEffect(() => {
    fetchExpenses()
  }, [currentMonth])
  
  // Separate effect for handling expense changes
  useEffect(() => {
    // Set up listeners for expense changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'expense_added' || e.key === 'expense_updated' || e.key === 'expense_deleted') {
        fetchExpenses()
      }
    }
    
    // Also listen for direct events (for same-window updates)
    const handleCustomEvent = () => {
      fetchExpenses()
    }
    
    // Add event listeners
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('expense_updated', handleCustomEvent)
    window.addEventListener('expense_added', handleCustomEvent)
    window.addEventListener('expense_deleted', handleCustomEvent)
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('expense_updated', handleCustomEvent)
      window.removeEventListener('expense_added', handleCustomEvent)
      window.removeEventListener('expense_deleted', handleCustomEvent)
    }
  }, [currentMonth])

  const getIntensityClass = (amount: number) => {
    if (amount === 0) return "bg-gray-100"
    
    const intensity = Math.min(amount / maxAmount, 1)
    
    if (intensity < 0.2) return "bg-blue-100"
    if (intensity < 0.4) return "bg-blue-200"
    if (intensity < 0.6) return "bg-blue-300"
    if (intensity < 0.8) return "bg-blue-400"
    return "bg-blue-500"
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const handleDayClick = (day: DayData) => {
    // If clicking the same day again, deselect it
    if (selectedDate && isSameDay(selectedDate, day.date)) {
      setSelectedDate(null)
      setSelectedDayExpenses([])
    } else {
      // Select the new day
      setSelectedDate(day.date)
      // Set the selected day's expenses for display
      setSelectedDayExpenses(day.expenses || [])
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentMonth(newDate)
    setSelectedDate(null)
  }

  const getDayName = (date: Date) => {
    return format(date, 'EEE')[0]
  }

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Spending Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Spending Heatmap</CardTitle>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigateMonth('prev')}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <span className="font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
          <button 
            onClick={() => navigateMonth('next')}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dayData.map((day, i) => (
            <div 
              key={i} 
              className={cn(
                "aspect-square rounded-sm cursor-pointer transition-all",
                getIntensityClass(day.amount),
                selectedDate && isSameDay(day.date, selectedDate) && "ring-2 ring-blue-600"
              )}
              onClick={() => handleDayClick(day)}
              title={`${format(day.date, 'MMM d')}: ${formatCurrency(day.amount)} (${day.count} transactions)`}
            >
              <div className="h-full flex items-center justify-center text-xs">
                {day.amount > 0 && format(day.date, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        {selectedDate && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <h3 className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h3>
            <div className="mt-1">
              <p>Total spent: {formatCurrency(dayData.find(d => isSameDay(d.date, selectedDate))?.amount || 0)}</p>
              <p>Transactions: {dayData.find(d => isSameDay(d.date, selectedDate))?.count || 0}</p>
            </div>
            
            {selectedDayExpenses.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <h4 className="text-sm font-medium mb-2">Expenses on this day:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedDayExpenses.map((expense, index) => (
                    <div key={index} className="text-xs p-2 bg-slate-100 dark:bg-slate-800 rounded border text-black dark:text-white shadow-sm">
                      <div className="font-medium">{expense.description}</div>
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-700 dark:text-slate-300">{expense.merchant_name || 'Unknown merchant'}</span>
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">${parseFloat(expense.amount).toFixed(2)}</span>
                      </div>
                      {expense.category && (
                        <div className="text-slate-600 dark:text-slate-400 mt-1">{expense.category}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-end text-xs text-gray-500">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-100 mr-1"></div>
            <span>No spending</span>
          </div>
          <div className="flex items-center ml-2">
            <div className="w-3 h-3 bg-blue-100 mr-1"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center ml-2">
            <div className="w-3 h-3 bg-blue-300 mr-1"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center ml-2">
            <div className="w-3 h-3 bg-blue-500 mr-1"></div>
            <span>High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 