"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Search, Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export interface CrudColumn<T> {
  header: string
  accessorKey: keyof T | string
  cell?: (item: T) => React.ReactNode
}

export interface CrudFormField {
  name: string
  label: string
  type: "text" | "number" | "email" | "password" | "date" | "select" | "checkbox" | "color" | "textarea"
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  defaultValue?: any
}

export interface CrudProps<T> {
  title: string
  description?: string
  columns: CrudColumn<T>[]
  data: T[]
  formFields: CrudFormField[]
  idField: keyof T
  onCreateItem: (data: Record<string, any>) => Promise<void>
  onUpdateItem: (id: string, data: Record<string, any>) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  isLoading?: boolean
  onFormDataChange?: (data: Record<string, any>) => Record<string, any>
  prepareFormDataForEdit?: (item: T) => Record<string, any>
}

export function CrudInterface<T>({
  title,
  description,
  columns,
  data,
  formFields,
  idField,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  isLoading = false,
  onFormDataChange,
  prepareFormDataForEdit,
}: CrudProps<T>) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<T | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const itemsPerPage = 10

  // Update filtered data when data changes
  useEffect(() => {
    // Reset to first page when data changes
    setCurrentPage(1)
  }, [data])

  // Filter data based on search term
  const filteredData = data.filter((item) => {
    if (!searchTerm) return true

    // Search through all string properties
    return Object.entries(item as Record<string, any>).some(([key, value]) => {
      if (typeof value === "string") {
        return value.toLowerCase().includes(searchTerm.toLowerCase())
      }
      return false
    })
  })

  // Paginate data
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement

    let updatedFormData = { ...formData }

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      updatedFormData = { ...updatedFormData, [name]: checked }
    } else {
      updatedFormData = { ...updatedFormData, [name]: value }
    }

    // If there's a form data change handler, use it
    if (onFormDataChange) {
      updatedFormData = onFormDataChange(updatedFormData)
    }

    setFormData(updatedFormData)
  }

  const handleSelectChange = (name: string, value: string) => {
    let updatedFormData = { ...formData, [name]: value }

    // If there's a form data change handler, use it
    if (onFormDataChange) {
      updatedFormData = onFormDataChange(updatedFormData)
    }

    setFormData(updatedFormData)
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    let updatedFormData = { ...formData, [name]: checked }

    // If there's a form data change handler, use it
    if (onFormDataChange) {
      updatedFormData = onFormDataChange(updatedFormData)
    }

    setFormData(updatedFormData)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onCreateItem(formData)
      setIsCreateDialogOpen(false)
      setFormData({})
      toast({
        title: "Success",
        description: "Item created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create item",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (currentItem) {
        const id = String(currentItem[idField])
        await onUpdateItem(id, formData)
        setIsUpdateDialogOpen(false)
        setCurrentItem(null)
        setFormData({})
        toast({
          title: "Item updated",
          description: "The item has been updated successfully.",
        })
      }
    } catch (error) {
      console.error("Error updating item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update item. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setIsSubmitting(true)

    try {
      if (currentItem) {
        const id = String(currentItem[idField])
        await onDeleteItem(id)
        setIsDeleteDialogOpen(false)
        setCurrentItem(null)
        toast({
          title: "Item deleted",
          description: "The item has been deleted successfully.",
        })
      }
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete item. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCreateDialog = () => {
    // Initialize form data with default values
    const initialData: Record<string, any> = {}
    formFields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue
      }
    })

    setFormData(initialData)
    setIsCreateDialogOpen(true)
  }

  const openUpdateDialog = (item: T) => {
    setCurrentItem(item)

    // Initialize form data with current item values
    if (prepareFormDataForEdit) {
      // Use the custom preparation function if provided
      setFormData(prepareFormDataForEdit(item))
    } else {
      // Default behavior: map item properties to form fields
      const initialData: Record<string, any> = {}
      formFields.forEach((field) => {
        const key = field.name as keyof T
        const itemValue = (item as any)[key]
        initialData[field.name] = itemValue !== undefined ? itemValue : field.defaultValue
      })

      setFormData(initialData)
    }

    setIsUpdateDialogOpen(true)
  }

  const openDeleteDialog = (item: T) => {
    setCurrentItem(item)
    setIsDeleteDialogOpen(true)
  }

  const renderFormField = (field: CrudFormField) => {
    const value = formData[field.name] ?? field.defaultValue ?? ""

    switch (field.type) {
      case "select":
        return (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Select
              name={field.name}
              value={value}
              onValueChange={(newValue) => {
                const event = {
                  target: {
                    name: field.name,
                    value: newValue,
                    type: "select",
                  },
                } as React.ChangeEvent<HTMLSelectElement>
                handleSelectChange(field.name, newValue)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={value === true}
              onCheckedChange={(checked) => handleCheckboxChange(field.name, checked === true)}
            />
            <Label htmlFor={field.name} className="text-sm text-gray-700">
              {field.label}
            </Label>
          </div>
        )
      case "textarea":
        return (
          <textarea
            id={field.name}
            name={field.name}
            placeholder={field.placeholder}
            value={value}
            onChange={handleInputChange}
            required={field.required}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        )
      default:
        return (
          <Input
            type={field.type}
            id={field.name}
            name={field.name}
            placeholder={field.placeholder}
            value={value}
            onChange={handleInputChange}
            required={field.required}
          />
        )
    }
  }

  const renderFormFields = (fields: CrudFormField[]) => {
    return fields.map((field) => (
      <div key={field.name} className="grid gap-2">
        <Label htmlFor={field.name} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {renderFormField(field)}
      </div>
    ))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Button onClick={() => openCreateDialog()} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead key={index}>{column.header}</TableHead>
                ))}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                    {searchTerm ? "No matching items found." : "No items found."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column, colIndex) => (
                      <TableCell key={colIndex}>
                        {column.cell
                          ? column.cell(item)
                          : typeof column.accessorKey === "function"
                            ? column.accessorKey(item)
                            : String((item as any)[column.accessorKey] || "")}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openUpdateDialog(item)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(item)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedData.length} of {filteredData.length} items
        </div>
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setCurrentPage(pageNum)}
                    isActive={currentPage === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardFooter>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {title.slice(0, -1)}</DialogTitle>
            <DialogDescription>Fill in the details to create a new item.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 py-4">{renderFormFields(formFields)}</div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {title.slice(0, -1)}</DialogTitle>
            <DialogDescription>Update the details of this item.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit}>
            <div className="grid gap-4 py-4">{renderFormFields(formFields)}</div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

