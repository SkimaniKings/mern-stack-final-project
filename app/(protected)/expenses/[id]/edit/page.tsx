import { Suspense } from "react"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ExpenseForm } from "@/components/expenses/expense-form"
import { EXPENSE_CATEGORIES } from "@/lib/constants/categories"
import { getExpenseById } from "@/app/actions/expenses"

export const dynamic = 'force-dynamic'
export const dynamicParams = true

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params
  const expense = await getExpenseById(resolvedParams.id).catch(() => null)
  return {
    title: expense ? `Edit ${expense.description}` : 'Edit Expense',
  }
}

export default async function EditExpensePage({ params }: Props) {
  const resolvedParams = await params
  const expense = await getExpenseById(resolvedParams.id).catch(() => null)

  if (!expense) {
    notFound()
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/expenses">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Expense</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit {expense.description}</CardTitle>
          <CardDescription>Update the details of this expense</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <ExpenseForm 
              categories={EXPENSE_CATEGORIES} 
              expense={expense} 
              isEditing={true} 
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-1/3" />
    </div>
  )
}
