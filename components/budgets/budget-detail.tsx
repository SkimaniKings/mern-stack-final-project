"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils/formatting"
import { createBudgetCategory, updateBudgetCategory, deleteBudgetCategory } from "@/app/actions/budgets"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

interface Category {
  id: string
  name: string
  color: string
  icon: string
  is_income: boolean
}

interface BudgetCategory {
  id: string
  budget_id: string
  category_id: string
  amount_allocated: number
  categories?: Category
}

interface Budget {
  id: string
  user_id: string
  name: string
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string | null
  budget_categories: (BudgetCategory & { categories?: Category })[] | null
}

interface BudgetDetailProps {
  budget: Budget
  categories: Category[]
}

export function BudgetDetail({ budget, categories }: BudgetDetailProps) {
  // Recursive renderer for JSONB nested categories
  function renderJsonCategories(jsonCategories: any[], level = 0) {
    if (!Array.isArray(jsonCategories) || jsonCategories.length === 0) return null;
    return (
      <div className={level === 0 ? "space-y-3" : "ml-4 pl-2 border-l space-y-2 mt-2"}>
        {jsonCategories.map((cat, idx) => (
          <div key={cat.id || idx}>
            <div className="flex justify-between items-center">
              <span className="font-medium">{cat.name}</span>
              <span className="font-mono text-sm">{formatCurrency(cat.amount)}</span>
            </div>
            {cat.subcategories && cat.subcategories.length > 0 && renderJsonCategories(cat.subcategories, level + 1)}
          </div>
        ))}
      </div>
    );
  }
  const router = useRouter()
  const { toast } = useToast()
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false)
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null)
  const [formData, setFormData] = useState<{ category_id?: string; amount_allocated: number }>({ amount_allocated: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [displayedCategories, setDisplayedCategories] = useState<BudgetCategory[]>(budget.budget_categories || [])

  const availableCategories = categories.filter(
    (category) =>
      !category.is_income &&
      !displayedCategories.some((bc) => bc.category_id === category.id)
  )

  const hasJsonCategories = Array.isArray((budget as any).categories) && (budget as any).categories.length > 0;

  // Recursively sum amounts in JSONB categories
  function sumJsonCategories(categories: any[]): number {
    if (!Array.isArray(categories)) return 0;
    return categories.reduce(
      (sum, cat) =>
        sum + (Number(cat.amount) || 0) + (cat.subcategories ? sumJsonCategories(cat.subcategories) : 0),
      0
    );
  }

  // Compute total allocated amount for this budget
  const totalAllocated = hasJsonCategories
    ? sumJsonCategories((budget as any).categories)
    : displayedCategories.reduce((sum, cat) => sum + (cat.amount_allocated || 0), 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: name === "amount_allocated" ? parseFloat(value) || 0 : value })
  }

  const handleSelectChange = (value: string) => {
    setFormData({ ...formData, category_id: value })
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category_id) return

    setIsSubmitting(true)
    try {
      const newCategory = await createBudgetCategory({
        budget_id: budget.id,
        category_id: formData.category_id,
        amount_allocated: formData.amount_allocated,
      })
      setDisplayedCategories([...displayedCategories, newCategory])
      toast({ title: "Category added", description: "The category has been added to the budget." })
      setIsAddCategoryDialogOpen(false)
      setFormData({ amount_allocated: 0, category_id: undefined })
    } catch (error) {
      console.error("Error adding category:", error)
      toast({ title: "Error", description: "Failed to add category. Please try again.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return

    setIsSubmitting(true)
    try {
      const updatedCategory = await updateBudgetCategory(selectedCategory.id, {
        amount_allocated: formData.amount_allocated,
      })
      setDisplayedCategories(
        displayedCategories.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
      )
      toast({ title: "Category updated", description: "The category allocation has been updated." })
      setIsEditCategoryDialogOpen(false)
      setSelectedCategory(null)
    } catch (error) {
      console.error("Error updating category:", error)
      toast({ title: "Error", description: "Failed to update category. Please try again.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return

    setIsSubmitting(true)
    try {
      await deleteBudgetCategory(selectedCategory.id)
      setDisplayedCategories(displayedCategories.filter((c) => c.id !== selectedCategory.id))
      toast({ title: "Category removed", description: "The category has been removed from the budget." })
      setIsDeleteCategoryDialogOpen(false)
      setSelectedCategory(null)
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({ title: "Error", description: "Failed to remove category. Please try again.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (category: BudgetCategory) => {
    setSelectedCategory(category)
    setFormData({ amount_allocated: category.amount_allocated })
    setIsEditCategoryDialogOpen(true)
  }

  const openDeleteDialog = (category: BudgetCategory) => {
    setSelectedCategory(category)
    setIsDeleteCategoryDialogOpen(true)
  }


  // Recursively sum amounts in JSONB categories
  function sumJsonCategories(categories: any[]): number {
    if (!Array.isArray(categories)) return 0;
    return categories.reduce(
      (sum, cat) =>
        sum + (Number(cat.amount) || 0) + (cat.subcategories ? sumJsonCategories(cat.subcategories) : 0),
      0
    );
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{budget.name}</h1>
        <p className="text-muted-foreground mt-2">
          Budget period: {formatDate(new Date(budget.start_date))} to {budget.end_date ? formatDate(new Date(budget.end_date)) : 'Present'}
        </p>
      </div>

      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
          <CardDescription>Total amount allocated across all categories.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Total Allocated</span>
            <span className="font-bold">{formatCurrency(totalAllocated)}</span>
          </div>
          <Progress value={budget.amount ? (totalAllocated / budget.amount) * 100 : 0} />
          <div className="mt-6">
            <Button onClick={() => setIsAddCategoryDialogOpen(true)} variant="outline">
              Add Category Allocation
            </Button>
          </div>
          <div className="mt-8">
            <h3 className="font-semibold mb-2">Category Breakdown</h3>
            {hasJsonCategories ? (
              renderJsonCategories((budget as any).categories)
            ) : (
              displayedCategories.length > 0 ? (
                <div className="space-y-3">
                  {displayedCategories.map((cat) => (
                    <div key={cat.id} className="flex justify-between items-center">
                      <span>{cat.categories?.name || categories.find(c => c.id === cat.category_id)?.name}</span>
                      <span className="font-mono text-sm">{formatCurrency(cat.amount_allocated)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground">No categories defined for this budget.</div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayedCategories.map((budgetCategory) => {
          const categoryInfo = budgetCategory.categories || categories.find((c) => c.id === budgetCategory.category_id)
          const percentage = totalAllocated > 0 ? (budgetCategory.amount_allocated / totalAllocated) * 100 : 0

          return (
            <Card key={budgetCategory.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{categoryInfo?.name || "Unnamed Category"}</CardTitle>
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: categoryInfo?.color || "#ccc" }}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(budgetCategory.amount_allocated)}</div>
                <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of total allocated</p>
                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(budgetCategory)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(budgetCategory)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category to Budget</DialogTitle>
            <DialogDescription>Select a category and allocate an amount.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="category-select" className="text-sm font-medium">
                  Category
                </label>
                <Select onValueChange={handleSelectChange} required>
                  <SelectTrigger id="category-select">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="add-amount" className="text-sm font-medium">
                  Amount
                </label>
                <Input
                  id="add-amount"
                  name="amount_allocated"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount_allocated}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddCategoryDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.category_id}>
                {isSubmitting ? "Adding..." : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category Allocation</DialogTitle>
            <DialogDescription>Update the amount allocated to this category.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCategory}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Category</label>
                <p className="font-semibold">{selectedCategory?.categories?.name || categories.find(c => c.id === selectedCategory?.category_id)?.name}</p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-amount" className="text-sm font-medium">
                  Amount
                </label>
                <Input
                  id="edit-amount"
                  name="amount_allocated"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount_allocated}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditCategoryDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this category from the budget?
              {selectedCategory && (
                <div className="mt-2 font-medium">
                  {(selectedCategory.categories?.name || categories.find(c => c.id === selectedCategory.category_id)?.name)} - {formatCurrency(selectedCategory.amount_allocated)}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
