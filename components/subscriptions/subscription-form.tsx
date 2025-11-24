"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { 
  Subscription, 
  SubscriptionFormData, 
  SubscriptionCategory, 
  SubscriptionRecurrence,
  OverlappingSubscription
} from "@/types/subscription"

// Form schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  service_provider: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().min(0, "Amount must be a positive number"),
  currency: z.string().default("USD"),
  recurrence: z.string().min(1, "Recurrence is required"),
  start_date: z.date({
    required_error: "Start date is required",
  }),
  end_date: z.date().nullable(),
  is_active: z.boolean().default(true),
  roi_expected: z.coerce.number().nullable(),
  roi_notes: z.string().nullable(),
})

// Categories with icons
const categories: { value: SubscriptionCategory; label: string; icon: string }[] = [
  { value: "entertainment", label: "Entertainment", icon: "🎬" },
  { value: "utilities", label: "Utilities", icon: "🔌" },
  { value: "software", label: "Software", icon: "💻" },
  { value: "health", label: "Health", icon: "🏥" },
  { value: "education", label: "Education", icon: "🎓" },
  { value: "food", label: "Food", icon: "🍔" },
  { value: "transportation", label: "Transportation", icon: "🚗" },
  { value: "housing", label: "Housing", icon: "🏠" },
  { value: "insurance", label: "Insurance", icon: "🛡️" },
  { value: "investments", label: "Investments", icon: "📈" },
  { value: "other", label: "Other", icon: "📦" },
]

// Recurrence options
const recurrenceOptions: { value: SubscriptionRecurrence; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi_weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
  { value: "yearly", label: "Yearly" },
]

// Currency options
const currencies = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "AUD", label: "AUD ($)" },
  { value: "CHF", label: "CHF (Fr)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
  { value: "KES", label: "KES (KSh)" },
]

interface SubscriptionFormProps {
  initialData?: Subscription
  onSubmit: (data: SubscriptionFormData) => Promise<void>
  onCancel: () => void
}

export function SubscriptionForm({
  initialData,
  onSubmit,
  onCancel,
}: SubscriptionFormProps) {
  const [loading, setLoading] = useState(false)
  const [overlappingSubscriptions, setOverlappingSubscriptions] = useState<OverlappingSubscription[]>([])
  
  // Initialize form with default values or initial data
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      service_provider: initialData.service_provider,
      description: initialData.description,
      category: initialData.category,
      amount: initialData.amount,
      currency: initialData.currency,
      recurrence: initialData.recurrence,
      start_date: new Date(initialData.start_date),
      end_date: initialData.end_date ? new Date(initialData.end_date) : null,
      is_active: initialData.is_active,
      roi_expected: initialData.roi_expected,
      roi_notes: initialData.roi_notes,
    } : {
      name: "",
      service_provider: "",
      description: "",
      category: "other",
      amount: 0,
      currency: "USD",
      recurrence: "monthly",
      start_date: new Date(),
      end_date: null,
      is_active: true,
      roi_expected: null,
      roi_notes: "",
    },
  })
  
  // Watch form values for overlap detection
  const serviceProvider = form.watch("service_provider")
  const startDate = form.watch("start_date")
  const endDate = form.watch("end_date")
  
  // Check for overlapping subscriptions when relevant fields change
  useEffect(() => {
    const checkOverlap = async () => {
      if (!serviceProvider) return
      
      try {
        const response = await fetch("/api/subscriptions/overlap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service_provider: serviceProvider,
            start_date: startDate.toISOString(),
            end_date: endDate ? endDate.toISOString() : null,
            current_id: initialData?.id || null,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          setOverlappingSubscriptions(data)
        }
      } catch (error) {
        console.error("Error checking for overlapping subscriptions:", error)
      }
    }
    
    if (serviceProvider && startDate) {
      checkOverlap()
    }
  }, [serviceProvider, startDate, endDate, initialData?.id])
  
  // Handle form submission
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true)
      
      // Convert form data to submission format
      const formData: SubscriptionFormData = {
        name: values.name,
        service_provider: values.service_provider,
        description: values.description,
        category: values.category as SubscriptionCategory,
        amount: values.amount,
        currency: values.currency,
        recurrence: values.recurrence as SubscriptionRecurrence,
        start_date: values.start_date.toISOString(),
        end_date: values.end_date ? values.end_date.toISOString() : null,
        is_active: values.is_active,
        roi_expected: values.roi_expected,
        roi_notes: values.roi_notes,
      }
      
      await onSubmit(formData)
    } catch (error) {
      console.error("Error submitting subscription:", error)
      toast.error("Failed to save subscription")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Overlapping subscriptions warning */}
        {overlappingSubscriptions.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Potential Duplicate Subscription</AlertTitle>
            <AlertDescription>
              You already have {overlappingSubscriptions.length} subscription(s) for this service provider during this time period:
              <ul className="mt-2 list-disc pl-5">
                {overlappingSubscriptions.map((sub) => (
                  <li key={sub.overlapping_id}>
                    {sub.name} ({format(new Date(sub.start_date), "MMM d, yyyy")} - 
                    {sub.end_date ? format(new Date(sub.end_date), "MMM d, yyyy") : "Ongoing"})
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subscription Name</FormLabel>
                <FormControl>
                  <Input placeholder="Netflix, Spotify, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Service Provider */}
          <FormField
            control={form.control}
            name="service_provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Provider</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Netflix, Inc., Spotify AB, etc." 
                    {...field} 
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormDescription>
                  Used for duplicate detection
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <span className="flex items-center">
                          <span className="mr-2">{category.icon}</span>
                          {category.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Currency */}
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Recurrence */}
          <FormField
            control={form.control}
            name="recurrence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Cycle</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select billing cycle" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {recurrenceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Start Date */}
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          if (date) field.onChange(date);
                        }}
                        className="w-full"
                      />
                    </FormControl>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* End Date */}
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date (Optional)</FormLabel>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(date);
                        }}
                        className="w-full"
                        placeholder="No end date"
                      />
                    </FormControl>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <div className="p-2 border-b">
                        <Button 
                          variant="ghost" 
                          onClick={() => field.onChange(null)}
                          size="sm"
                        >
                          Clear
                        </Button>
                      </div>
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < form.getValues("start_date")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <FormDescription>
                  Leave empty for ongoing subscriptions
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Active Status */}
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Subscription</FormLabel>
                <FormDescription>
                  Inactive subscriptions won't be included in reports
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        {/* ROI Section */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-lg font-medium">ROI Calculator</h3>
          <p className="text-sm text-muted-foreground">
            Track the return on investment for this subscription
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expected ROI */}
            <FormField
              control={form.control}
              name="roi_expected"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Return</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      placeholder="0.00"
                      {...field}
                      value={field.value === null ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    The expected monetary value you'll get from this subscription
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* ROI Notes */}
            <FormField
              control={form.control}
              name="roi_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ROI Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notes about expected returns..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional details about this subscription..."
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Subscription" : "Add Subscription"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
