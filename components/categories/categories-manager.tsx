"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CrudInterface } from "@/components/ui/crud-interface"
import { createCategory, updateCategory, deleteCategory } from "@/app/actions/categories"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface Category {
  id: string
  name: string
  color: string
  icon?: string
  is_income: boolean

  created_at: string
  updated_at: string
}

interface CategoriesManagerProps {
  initialCategories: Category[]
}

export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [isLoading, setIsLoading] = useState(false)

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
      cell: (category: Category) => (
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
          {category.name}
        </div>
      ),
    },
    {
      header: "Type",
      accessorKey: "is_income",
      cell: (category: Category) => (
        <Badge variant={category.is_income ? "success" : "default"}>{category.is_income ? "Income" : "Expense"}</Badge>
      ),
    },

  ]

  const formFields = [
    {
      name: "name",
      label: "Category Name",
      type: "text" as const,
      placeholder: "Enter category name",
      required: true,
    },
    {
      name: "is_income",
      label: "Income Category",
      type: "checkbox" as const,
      defaultValue: false,
    },
    {
      name: "color",
      label: "Color",
      type: "color" as const,
      required: true,
      defaultValue: "#3b82f6",
    },
    {
      name: "icon",
      label: "Icon",
      type: "text" as const,
      placeholder: "Enter icon name (optional)",
    },

  ]

  const handleCreateCategory = async (data: Record<string, any>) => {
    setIsLoading(true)
    try {
      const formData = new FormData()

      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      const newCategory = await createCategory(formData)

      setCategories([newCategory, ...categories])

      toast({
        title: "Category created",
        description: "Your category has been added successfully.",
      })
    } catch (error) {
      console.error("Error creating category:", error)
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateCategory = async (id: string, data: Record<string, any>) => {
    setIsLoading(true)
    try {
      const formData = new FormData()

      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      const updatedCategory = await updateCategory(id, formData)

      setCategories(categories.map((category) => (category.id === id ? updatedCategory : category)))

      toast({
        title: "Category updated",
        description: "Your category has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    setIsLoading(true)
    try {
      await deleteCategory(id)

      setCategories(categories.filter((category) => category.id !== id))

      toast({
        title: "Category deleted",
        description: "Your category has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CrudInterface
      title="Categories"
      description="Manage your transaction categories"
      columns={columns}
      data={categories}
      formFields={formFields}
      idField="id"
      onCreateItem={handleCreateCategory}
      onUpdateItem={handleUpdateCategory}
      onDeleteItem={handleDeleteCategory}
      isLoading={isLoading}
    />
  )
}

