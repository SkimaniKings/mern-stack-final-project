"use client"

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"

interface Expense {
  id: string
  merchant: string
  category: string
  amount: number
  latitude: number
  longitude: number
  date: string
  description: string
}

interface ExpenseMapProps {
  expenses: Expense[]
}

export function ExpenseMap({ expenses }: ExpenseMapProps) {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    // Dynamically import Leaflet
    const L = require('leaflet')
    
    if (!mapContainerRef.current) return
    
    // Initialize map
    const map = L.map(mapContainerRef.current).setView([0, 0], 2)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    // Add markers for each expense
    const validExpenses = expenses.filter(expense => 
      expense.latitude && expense.longitude && 
      !isNaN(expense.latitude) && !isNaN(expense.longitude)
    )
    
    if (validExpenses.length > 0) {
      validExpenses.forEach((expense) => {
        L.marker([expense.latitude, expense.longitude])
          .addTo(map)
          .bindPopup(`<b>${expense.merchant}</b><br>${expense.category}<br>$${expense.amount.toFixed(2)}`)
      })
      
      // Fit bounds to show all markers
      const bounds = L.latLngBounds(validExpenses.map(expense => [expense.latitude, expense.longitude]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }

    mapRef.current = map

    return () => {
      map.remove()
    }
  }, [expenses])

  return <div ref={mapContainerRef} className="h-full w-full" />
}

