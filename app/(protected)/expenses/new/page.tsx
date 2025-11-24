import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpenseForm } from "@/components/expenses/expense-form"
import { EXPENSE_CATEGORIES } from "@/lib/constants/categories"

// Force static rendering to prevent switching between static and dynamic
export const dynamic = 'force-static';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default function NewExpensePage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/expenses">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Expense</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
          <CardDescription>Record a new expense</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm categories={EXPENSE_CATEGORIES} />
        </CardContent>
      </Card>
    </div>
  )
}