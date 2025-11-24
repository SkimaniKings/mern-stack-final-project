"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExpensesWithLocation } from "@/app/actions/expenses"
import { Skeleton } from "@/components/ui/skeleton"
import { useTheme } from "next-themes"

// Import the Leaflet library dynamically to avoid SSR issues
import dynamic from "next/dynamic"

// Dynamic import of the Map component to avoid SSR issues
const MapWithNoSSR = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-muted flex items-center justify-center">
      <Skeleton className="h-[400px] w-full" />
    </div>
  ),
})

interface LocationHeatmapProps {
  className?: string
}

export function LocationHeatmap({ className }: LocationHeatmapProps) {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true)
      try {
        const data = await getExpensesWithLocation()
        setExpenses(data)
      } catch (error) {
        console.error("Error fetching expenses with location:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()

    // Set up a listener for when new expenses are added
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'expense_added' || e.key === 'expense_updated') {
        fetchExpenses()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Format data for the heatmap
  const heatmapData = expenses.map(expense => {
    // Extract coordinates from the PostGIS Point format
    // The format is typically "POINT(longitude latitude)"
    let lat = 0
    let lng = 0
    
    if (expense.location) {
      // If it's a string, parse it
      if (typeof expense.location === 'string') {
        const match = expense.location.match(/POINT\(([^ ]+) ([^)]+)\)/)
        if (match) {
          lng = parseFloat(match[1])
          lat = parseFloat(match[2])
        }
      } 
      // If it's an object with coordinates
      else if (expense.location.coordinates) {
        lng = expense.location.coordinates[0]
        lat = expense.location.coordinates[1]
      }
    }
    
    return {
      lat,
      lng,
      intensity: expense.amount, // Use the expense amount as intensity
      expense: {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.spent_at,
        isImpulse: expense.isImpulse
      }
    }
  })

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Spending Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <MapWithNoSSR 
              heatmapData={heatmapData} 
              darkMode={theme === 'dark'} 
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
