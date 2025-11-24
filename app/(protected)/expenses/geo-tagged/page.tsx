"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ExpenseMap } from "@/components/expenses/expense-map"
import { TransactionForm } from "@/components/expenses/transaction-form"

export default function GeoTaggedExpensesPage() {
  const [expenses, setExpenses] = useState([
    {
      id: "1",
      merchant: "Coffee Shop",
      category: "Food",
      amount: 5.5,
      latitude: 34.0522,
      longitude: -118.2437,
      date: new Date().toISOString(),
      description: "Coffee",
    },
    {
      id: "2",
      merchant: "Grocery Store",
      category: "Food",
      amount: 50.0,
      latitude: 37.7749,
      longitude: -122.4194,
      date: new Date().toISOString(),
      description: "Groceries",
    },
    {
      id: "3",
      merchant: "Gas Station",
      category: "Transportation",
      amount: 40.0,
      latitude: 40.7128,
      longitude: -74.006,
      date: new Date().toISOString(),
      description: "Gas",
    },
  ])

  const addExpense = (newExpense) => {
    setExpenses([...expenses, newExpense])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Geo-Tagged Expenses</h1>
          <p className="text-muted-foreground mt-2">Visualize your spending patterns by location</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/expenses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Expenses
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
          <CardDescription>Manually add a new expense</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm onAdd={addExpense} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Expense Map</CardTitle>
          <CardDescription>Visualize your spending patterns by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]">
            <ExpenseMap expenses={expenses} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

