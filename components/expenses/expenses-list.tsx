"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, AlertTriangle } from "lucide-react"

interface ExpensesListProps {
  expenses: any[]
  error?: string
}

export function ExpensesList({ expenses, error }: ExpensesListProps) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Link href="/expenses/new" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          New Expense
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Expenses</h2>
          {Array.isArray(expenses) && expenses.length > 0 ? (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{expense.merchant}</h3>
                    <p className="text-sm text-gray-500">${expense.amount}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Link
                      href={`/expenses/${expense.id}/edit`}
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/expenses/${expense.id}/delete`}
                      className="text-sm font-medium text-destructive hover:text-destructive/80"
                    >
                      Delete
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No expenses found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
