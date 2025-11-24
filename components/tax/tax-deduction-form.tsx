"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Loader2, DollarSign } from "lucide-react"
import { TaxDeduction } from "./tax-deduction-item"

const deductionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount must be a positive number"),
  max_amount: z.coerce.number().min(0, "Maximum amount must be a positive number").optional(),
  category_id: z.string().optional(),
  tax_year: z.string().min(1, "Tax year is required"),
  notes: z.string().optional(),
})

type DeductionFormValues = z.infer<typeof deductionSchema>

interface TaxCategory {
  id: string
  name: string
  type: string
  color: string
}

interface TaxDeductionFormProps {
  initialData: TaxDeduction | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  categories: TaxCategory[]
}

export function TaxDeductionForm({ 
  initialData, 
  onSubmit, 
  onCancel,
  categories 
}: TaxDeductionFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const currentYear = new Date().getFullYear()
  
  // Generate tax years (current year and 3 previous years)
  const taxYears = Array.from({ length: 4 }, (_, i) => (currentYear - i).toString())

  const form = useForm<DeductionFormValues>({
    resolver: zodResolver(deductionSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      amount: initialData?.amount || 0,
      max_amount: initialData?.max_amount || undefined,
      category_id: initialData?.category_id || undefined,
      tax_year: initialData?.tax_year || currentYear.toString(),
      notes: initialData?.notes || "",
    },
  })

  const handleSubmit = async (values: DeductionFormValues) => {
    setIsLoading(true)
    try {
      // If editing, include the ID
      const dataToSubmit = initialData?.id 
        ? { ...values, id: initialData.id } 
        : values
      
      await onSubmit(dataToSubmit)
    } catch (error) {
      console.error("Error saving deduction:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 bg-card p-6 rounded-lg shadow-sm border border-border">
      <div className="space-y-2">
        <Label htmlFor="name">Deduction Name</Label>
        <Input
          id="name"
          placeholder="e.g., Mortgage Interest"
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of this deduction"
          {...form.register("description")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              className="pl-8"
              {...form.register("amount")}
            />
          </div>
          {form.formState.errors.amount && (
            <p className="text-red-500 text-sm">{form.formState.errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_amount">Maximum Amount (Optional)</Label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="max_amount"
              type="number"
              step="0.01"
              min="0"
              className="pl-8"
              {...form.register("max_amount")}
            />
          </div>
          {form.formState.errors.max_amount && (
            <p className="text-red-500 text-sm">{form.formState.errors.max_amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category_id">Category</Label>
          <Select
            onValueChange={(value) => form.setValue("category_id", value)}
            defaultValue={form.getValues("category_id")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tax_year">Tax Year</Label>
          <Select
            onValueChange={(value) => form.setValue("tax_year", value)}
            defaultValue={form.getValues("tax_year")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tax year" />
            </SelectTrigger>
            <SelectContent>
              {taxYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.tax_year && (
            <p className="text-red-500 text-sm">{form.formState.errors.tax_year.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes about this deduction"
          {...form.register("notes")}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {initialData ? "Updating..." : "Creating..."}
            </>
          ) : (
            initialData ? "Update Deduction" : "Add Deduction"
          )}
        </Button>
      </div>
    </form>
  )
}
