"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CrudInterface } from "@/components/ui/crud-interface"
import { createBudget, updateBudget, deleteBudget } from "@/app/actions/budgets"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Category {
  id: string
  name: string
  color: string
  icon?: string
  is_income: boolean
}

interface Budget {
  id: string
  user_id: string
  model_id?: string
  name: string
  income: number
  start_date: string
  end_date?: string
  is_collaborative: boolean
  created_at: string
  updated_at: string
  budget_category: {
    id: string
    name: string
    amount_allocated: number

    category_id: string
  }
}

interface BudgetsManagerProps {
  initialBudgets: Budget[]
  categories: Category[]
}

export function BudgetsManager({ initialBudgets, categories }: BudgetsManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets)
  const [isLoading, setIsLoading] = useState(false)

  // Filter out income categories for budgets
  const expenseCategories = categories?.filter((category) => !category.is_income) || []

  const columns = [
    {
      header: "Category",
      accessorKey: "budget_category",
      cell: (budget: Budget) => (
        <div className="flex items-center">
          {/* TODO: Add color from categories table */}
          <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: "#888888" }} />
          {budget.budget_category.name}
        </div>
      ),
    },
    {
      header: "Budget",
      accessorKey: "income",
      cell: (budget: Budget) => formatCurrency(budget.income),
    },
    {
      header: "Start Date",
      accessorKey: "start_date",
    },
    {
      header: "End Date",
      accessorKey: "end_date",
      cell: (budget: Budget) => budget.end_date || "Ongoing",
    },
  ]

  const formFields = [
    {
      name: "category_id",
      label: "Category",
      type: "select" as const,
      required: true,
      options: expenseCategories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    },
    {
      name: "amount",
      label: "Budget Amount",
      type: "number" as const,
      placeholder: "0.00",
      required: true,
    },
    {
      name: "start_date",
      label: "Start Date",
      type: "date" as const,
      required: true,
      defaultValue: new Date().toISOString().split("T")[0],
    },
    {
      name: "end_date",
      label: "End Date (leave blank for ongoing)",
      type: "date" as const,
    },
  ]

  const handleCreateBudget = async (data: Record<string, any>) => {
    setIsLoading(true)
    try {
      const formData = new FormData()

      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      const newBudget = await createBudget(formData)

      // Find the category for the new budget
      const budgetWithCategory = {
        ...newBudget,
        budget_category: {
          id: newBudget.category_id,
          name: categories?.find((c) => c.id === newBudget.category_id)?.name || "Unknown",
          amount_allocated: newBudget.amount,

        }
      }

      setBudgets([budgetWithCategory, ...budgets])

      toast({
        title: "Budget created",
        description: "Your budget has been added successfully.",
      })
    } catch (error) {
      console.error("Error creating budget:", error)
      toast({
        title: "Error",
        description: "Failed to create budget. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateBudget = async (id: string, data: Record<string, any>) => {
    setIsLoading(true)
    try {
      const formData = new FormData()

      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      const updatedBudget = await updateBudget(id, formData)

      // Find the category for the updated budget
      const budgetWithCategory = {
        ...updatedBudget,
        budget_category: {
          id: updatedBudget.category_id,
          name: categories?.find((c) => c.id === updatedBudget.category_id)?.name || "Unknown",
          amount_allocated: updatedBudget.amount,

        }
      }

      setBudgets(budgets.map((budget) => (budget.id === id ? budgetWithCategory : budget)))

      toast({
        title: "Budget updated",
        description: "Your budget has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating budget:", error)
      toast({
        title: "Error",
        description: "Failed to update budget. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteBudget = async (id: string) => {
    setIsLoading(true)
    try {
      await deleteBudget(id)

      setBudgets(budgets.filter((budget) => budget.id !== id))

      toast({
        title: "Budget deleted",
        description: "Your budget has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting budget:", error)
      toast({
        title: "Error",
        description: "Failed to delete budget. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CrudInterface
      title="Budgets"
      description="Manage your spending budgets"
      columns={columns}
      data={budgets}
      formFields={formFields}
      idField="id"
      onCreateItem={handleCreateBudget}
      onUpdateItem={handleUpdateBudget}
      onDeleteItem={handleDeleteBudget}
      isLoading={isLoading}
    />
  )
}

