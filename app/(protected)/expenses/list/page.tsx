"use client"

import { ExpenseList } from "@/components/expenses/expense-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function ExpensesListPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Expenses</h1>
        <Button asChild>
          <Link href="/expenses/new">
            <Plus className="mr-2 h-4 w-4" />
            New Expense
          </Link>
        </Button>
      </div>
      
      <ExpenseList />
    </div>
  )
}
