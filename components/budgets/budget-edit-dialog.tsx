"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Pencil, Loader2 } from "lucide-react"
import { BudgetForm } from "./budget-form"

interface BudgetCategory {
  id: string
  name: string
  amount_allocated: number
  percentage?: number
  parent_id?: string | null
  color?: string
}

interface Budget {
  id: string
  name: string
  start_date: string
  end_date?: string | null
  budget_categories?: BudgetCategory[]
  is_collaborative?: boolean
  total_allocated?: number
  categories?: {
    id: string
    name: string
    amount?: number
    items?: any[]
    subcategories?: any[]
  }[]
}

interface BudgetEditDialogProps {
  budget: Budget
  onSuccess?: () => void
}

export function BudgetEditDialog({ budget, onSuccess: onSuccessProp }: BudgetEditDialogProps) {
  const [open, setOpen] = useState(false)

  // Format budget data for the form
  const formattedBudget = {
    ...budget,
    categories: [] as Array<{
      id: string
      name: string
      amount: number
      percentage: number
      color?: string
      subcategories?: Array<{
        id: string
        name: string
        amount: number
        percentage: number
      }>
    }>
  }
  
  // Process categories and subcategories
  if (budget.budget_categories && budget.budget_categories.length > 0) {
    // First, separate parent categories and subcategories
    const parentCategories = budget.budget_categories.filter(cat => !cat.parent_id)
    const subcategories = budget.budget_categories.filter(cat => cat.parent_id)
    
    // Group subcategories by parent_id
    const subcategoriesByParent: Record<string, BudgetCategory[]> = {}
    subcategories.forEach(subcat => {
      if (!subcategoriesByParent[subcat.parent_id || '']) {
        subcategoriesByParent[subcat.parent_id || ''] = []
      }
      subcategoriesByParent[subcat.parent_id || ''].push(subcat)
    })
    
    // Format parent categories with their subcategories
    formattedBudget.categories = parentCategories.map(cat => {
      const catAmount = cat.amount_allocated || 0
      
      // Calculate total budget amount from all categories
      const totalBudget = budget.total_allocated || budget.budget_categories?.reduce(
        (sum, category) => sum + (category.amount_allocated || 0), 0
      ) || 0
      
      const catPercentage = totalBudget > 0 ? (catAmount / totalBudget) * 100 : 0
      
      return {
        id: cat.id,
        name: cat.name,
        amount: catAmount,
        percentage: catPercentage, // Calculate percentage from amount
        // color is only used in UI, not stored in database
        subcategories: (subcategoriesByParent[cat.id] || []).map(subcat => {
          const subcatAmount = subcat.amount_allocated || 0
          const subcatPercentage = catAmount > 0 ? (subcatAmount / catAmount) * 100 : 0
          
          return {
            id: subcat.id,
            name: subcat.name,
            amount: subcatAmount,
            percentage: subcatPercentage // Calculate percentage from amount
          }
        })
      }
    })
  }

  const handleSuccess = () => {
    setOpen(false)
    onSuccessProp?.()
    toast.success("Budget updated successfully")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
          <DialogDescription>
            Update your budget details and allocations
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <BudgetForm 
            budget={formattedBudget} 
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
