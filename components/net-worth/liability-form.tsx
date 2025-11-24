"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addLiability, updateLiability } from "@/app/actions/net-worth"
import { toast } from "sonner"

const liabilityFormSchema = z.object({
  id: z.string().optional(),
  liability_type: z.string().min(1, "Liability type is required"),
  amount_due: z.coerce.number().min(0, "Amount must be a positive number"),
  interest_rate: z.coerce.number().min(0, "Interest rate must be a positive number").optional(),
  due_date: z.string().optional(),
  description: z.string().optional(),
})

type LiabilityFormValues = z.infer<typeof liabilityFormSchema>

const defaultValues: Partial<LiabilityFormValues> = {
  liability_type: "",
  amount_due: 0,
  interest_rate: undefined,
  due_date: "",
  description: "",
}

const liabilityTypes = [
  { value: "mortgage", label: "Mortgage" },
  { value: "student_loan", label: "Student Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "auto_loan", label: "Auto Loan" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "business_debt", label: "Business Debt" },
  { value: "other", label: "Other Liability" },
]

interface LiabilityFormProps {
  liability?: {
    id: string
    liability_type: string
    amount_due: number
    interest_rate?: number
    due_date?: string
    description?: string
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function LiabilityForm({ liability, onSuccess, onCancel }: LiabilityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const isEditMode = !!liability?.id

  const form = useForm<LiabilityFormValues>({
    resolver: zodResolver(liabilityFormSchema),
    defaultValues: liability || defaultValues,
  })

  async function onSubmit(data: LiabilityFormValues) {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      
      if (isEditMode && liability?.id) {
        formData.append("id", liability.id)
      }
      
      formData.append("type", data.liability_type)
      formData.append("amount", data.amount_due.toString())
      
      if (data.interest_rate !== undefined) {
        formData.append("interest_rate", data.interest_rate.toString())
      }
      
      if (data.due_date) {
        formData.append("due_date", data.due_date)
      }
      
      if (data.description) {
        formData.append("description", data.description)
      }

      if (isEditMode) {
        await updateLiability(formData)
        toast.success("Liability updated successfully")
      } else {
        await addLiability(formData)
        toast.success("Liability added successfully")
      }

      router.refresh()
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Error submitting liability form:", error)
      toast.error(isEditMode ? "Failed to update liability" : "Failed to add liability")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        
        <FormField
          control={form.control}
          name="liability_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Liability Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a liability type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {liabilityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Type that best describes this liability
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="amount_due"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount Due</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={0} 
                  step="0.01" 
                  placeholder="0.00" 
                  {...field} 
                  value={field.value === null || field.value === undefined ? '' : field.value}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormDescription>
                Current amount owed for this liability
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="interest_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interest Rate % (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={0} 
                  step="0.01" 
                  placeholder="0.00" 
                  {...field} 
                  value={field.value === undefined ? '' : field.value}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormDescription>
                Annual interest rate for this liability
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  placeholder="When is this liability due?" 
                  {...field} 
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                The date when this liability is due
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any additional details about this liability" 
                  {...field} 
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditMode ? "Update Liability" : "Add Liability"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
