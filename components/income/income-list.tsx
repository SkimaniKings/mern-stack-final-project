"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { IncomeCard } from "@/components/income/income-card"
import { deleteIncome } from "@/app/actions/income"
import type { Income } from "@/app/actions/income"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface IncomeListProps {
  initialIncomes: Income[]
}

export function IncomeList({ initialIncomes }: IncomeListProps) {
  const router = useRouter()
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (!initialIncomes) {
      setLoading(true)
      setError("Error fetching incomes")
      setLoading(false)
    }
  }, [initialIncomes])

  const handleEdit = (id: string) => {
    router.push(`/income/${id}/edit`)
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return

    try {
      await deleteIncome(deleteId)
      setIncomes(incomes.filter((income) => income.id !== deleteId))
    } catch (err) {
      console.error("Error deleting income:", err)
    } finally {
      setIsDeleteDialogOpen(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold tracking-tight">Income Entries</h2>
        <Button onClick={() => router.push("/income/new")}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Income
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => setLoading(true)}>
            Try Again
          </Button>
        </div>
      ) : incomes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="font-medium">No income entries yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first income entry to start tracking your finances.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/income/new")}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Income Entry
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {incomes.map((income) => (
            <IncomeCard key={income.id} income={income} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="animate-in slide-in-from-bottom-10">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this income entry and remove it from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
