"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, EditIcon, TrashIcon } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getExpenseById, deleteExpense } from "@/app/actions/expenses"

interface ExpenseDetailPageProps {
  params: {
    id: string
  }
}

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const router = useRouter()
  const [expense, setExpense] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch expense data
  useState(() => {
    const fetchExpense = async () => {
      try {
        const data = await getExpenseById(params.id)
        setExpense(data)
      } catch (err) {
        setError("Failed to load expense details")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchExpense()
  })

  // Handle expense deletion
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteExpense(params.id)
      router.push("/expenses")
      router.refresh()
    } catch (err) {
      console.error("Error deleting expense:", err)
      setError("Failed to delete expense")
      setIsDeleteDialogOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return <ExpenseSkeleton />
  }

  if (error || !expense) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/expenses">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Expense Details</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <p className="text-muted-foreground">{error || "Expense not found"}</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/expenses">Back to Expenses</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/expenses">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Expense Details</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{expense.description}</CardTitle>
              <CardDescription>
                {expense.merchant_name && `${expense.merchant_name} • `}
                {format(new Date(expense.date), "MMMM d, yyyy")}
              </CardDescription>
            </div>
            <div className="text-2xl font-bold">
              ${expense.amount.toFixed(2)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
              <p>{expense.category?.name || "Uncategorized"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Account</h3>
              <p>{expense.account?.name || "Unknown Account"}</p>
            </div>
            {expense.location_name && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                <p>{expense.location_name}</p>
              </div>
            )}
            {expense.time_of_day && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Time of Day</h3>
                <p>{expense.time_of_day}</p>
              </div>
            )}
            {expense.notes && (
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
                <p>{expense.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href={`/expenses/${params.id}/edit`}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this expense and remove it from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ExpenseSkeleton() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    </div>
  )
}
