"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, MapPinIcon, ReceiptIcon, UsersIcon } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { createTransaction, updateTransaction } from "@/app/actions/transactions"
import type { Transaction, Account, Category } from "@/types/finance"
import { cn } from "@/lib/utils"
import { ALL_CATEGORIES } from "@/lib/constants/categories"

// Define the form schema with Zod
const formSchema = z.object({
  account_id: z.string().min(1, { message: "Please select an account" }),
  category_id: z.string().min(1, { message: "Please select a category" }),
  date: z.date(),
  amount: z.coerce.number().positive({ message: "Amount must be positive" }),
  description: z.string().min(1, { message: "Description is required" }),
  is_income: z.boolean().default(false),
  merchant_name: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.string().optional(),
  time_of_day: z.string().optional(),
  is_split: z.boolean().default(false),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  has_warranty: z.boolean().default(false),
  warranty_end_date: z.date().optional(),
  location_name: z.string().optional(),
  is_impulse: z.boolean().default(false),
  notes: z.string().optional(),
})

type TransactionFormProps = {
  accounts: Account[]
  categories?: Category[]
  transaction?: Transaction
  isEdit?: boolean
}

export function TransactionForm({ accounts, categories = ALL_CATEGORIES, transaction, isEdit = false }: TransactionFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [splitParticipants, setSplitParticipants] = useState<
    Array<{ name: string; amount: number; description: string }>
  >([])
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)

  // Initialize form with default values or existing transaction data
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_id: transaction?.account_id || "",
      category_id: transaction?.category_id || "",
      date: transaction ? new Date(transaction.date) : new Date(),
      amount: transaction?.amount || 0,
      description: transaction?.description || "",
      is_income: transaction ? Boolean(transaction.is_income) : false,
      merchant_name: transaction?.merchant_name || "",
      is_recurring: transaction?.is_recurring || false,
      recurrence_pattern: transaction?.recurrence_pattern || "",
      time_of_day: transaction?.time_of_day || "",
      is_split: transaction?.is_split || false,
      latitude: transaction?.latitude || undefined,
      longitude: transaction?.longitude || undefined,
      has_warranty: false,
      warranty_end_date: undefined,
      location_name: transaction?.location_name || "",
      is_impulse: transaction?.is_impulse || false,
      notes: transaction?.notes || "",
    },
  })

  // Get location if user opts in
  useEffect(() => {
    if (useCurrentLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue("latitude", position.coords.latitude)
          form.setValue("longitude", position.coords.longitude)
        },
        (error) => {
          console.error("Error getting location:", error)
          setUseCurrentLocation(false)
        },
      )
    } else if (!transaction?.latitude) {
      form.setValue("latitude", undefined)
      form.setValue("longitude", undefined)
    }
  }, [useCurrentLocation, form, transaction])

  // Handle receipt file selection
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setReceiptFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (event) => {
        setReceiptPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Add split participant
  const addSplitParticipant = () => {
    setSplitParticipants([...splitParticipants, { name: "", amount: 0, description: "" }])
  }

  // Remove split participant
  const removeSplitParticipant = (index: number) => {
    const updated = [...splitParticipants]
    updated.splice(index, 1)
    setSplitParticipants(updated)
  }

  // Update split participant
  const updateSplitParticipant = (index: number, field: string, value: string | number) => {
    const updated = [...splitParticipants]
    updated[index] = { ...updated[index], [field]: value }
    setSplitParticipants(updated)
  }

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)

    try {
      const formData = new FormData()

      // Add basic transaction data
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === "date") {
            formData.append(key, format(value as Date, "yyyy-MM-dd"))
          } else if (key === "warranty_end_date" && value) {
            formData.append(key, format(value as Date, "yyyy-MM-dd"))
          } else {
            formData.append(key, String(value))
          }
        }
      })

      // Add receipt if available
      if (receiptFile) {
        formData.append("receipt", receiptFile)
      }

      // Add split transaction data if it's a split
      if (values.is_split) {
        formData.append("split_count", String(splitParticipants.length))

        splitParticipants.forEach((participant, index) => {
          formData.append(`participant_name_${index}`, participant.name)
          formData.append(`split_amount_${index}`, String(participant.amount))
          formData.append(`split_description_${index}`, participant.description)
        })
      }

      // Submit the form
      if (isEdit && transaction) {
        await updateTransaction(transaction.id, formData)
      } else {
        await createTransaction(formData)
      }

      router.push("/transactions")
      router.refresh()
    } catch (error) {
      console.error("Error submitting transaction:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter categories based on income/expense
  const filteredCategories = categories.filter((category) => category.is_income === form.watch("is_income"))

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sticky top-0 z-10 bg-background shadow-sm">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Tracking</TabsTrigger>
            <TabsTrigger value="receipt">Receipt & Warranty</TabsTrigger>
          </TabsList>
          
          <div className="max-h-[50vh] overflow-y-auto pr-2 pb-4 mt-2 custom-scrollbar">

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="is_income"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Transaction Type</FormLabel>
                      <FormDescription>Is this an income or an expense?</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Transaction description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* Advanced Tracking Tab */}
          <TabsContent value="advanced" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="merchant_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant</FormLabel>
                    <FormControl>
                      <Input placeholder="Merchant name" {...field} />
                    </FormControl>
                    <FormDescription>Track spending patterns by merchant</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time_of_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time of Day</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>Track spending patterns by time</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="is_recurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Recurring Transaction</FormLabel>
                      <FormDescription>Is this a subscription or recurring payment?</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("is_recurring") && (
                <FormField
                  control={form.control}
                  name="recurrence_pattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurrence Pattern</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pattern" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Location Tracking</FormLabel>
                  <FormDescription>Track the location of this transaction</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={useCurrentLocation} onCheckedChange={setUseCurrentLocation} />
                </FormControl>
              </div>

              {useCurrentLocation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPinIcon className="h-4 w-4" />
                  {form.watch("latitude") && form.watch("longitude") ? (
                    <span>
                      Location saved: {form.watch("latitude")?.toFixed(6)}, {form.watch("longitude")?.toFixed(6)}
                    </span>
                  ) : (
                    <span>Acquiring location...</span>
                  )}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="is_split"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Split Transaction</FormLabel>
                    <FormDescription>Split this expense with others</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("is_split") && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {splitParticipants.map((participant, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <FormLabel className={index === 0 ? "block" : "sr-only"}>Name</FormLabel>
                          <Input
                            placeholder="Participant name"
                            value={participant.name}
                            onChange={(e) => updateSplitParticipant(index, "name", e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <FormLabel className={index === 0 ? "block" : "sr-only"}>Amount</FormLabel>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={participant.amount}
                            onChange={(e) => updateSplitParticipant(index, "amount", Number.parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3">
                          <FormLabel className={index === 0 ? "block" : "sr-only"}>Note</FormLabel>
                          <Input
                            placeholder="Note"
                            value={participant.description}
                            onChange={(e) => updateSplitParticipant(index, "description", e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSplitParticipant(index)}
                          >
                            &times;
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addSplitParticipant}>
                      <UsersIcon className="mr-2 h-4 w-4" />
                      Add Participant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <FormField
              control={form.control}
              name="is_impulse"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Impulse Purchase</FormLabel>
                    <FormDescription>Was this an unplanned purchase?</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          {/* Receipt & Warranty Tab */}
          <TabsContent value="receipt" className="space-y-3">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col space-y-2">
                <FormLabel>Upload Receipt</FormLabel>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("receipt-upload")?.click()}
                  >
                    <ReceiptIcon className="mr-2 h-4 w-4" />
                    Select Receipt
                  </Button>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleReceiptChange}
                  />
                  {receiptFile && (
                    <span className="text-sm text-muted-foreground">
                      {receiptFile.name} ({Math.round(receiptFile.size / 1024)} KB)
                    </span>
                  )}
                </div>
              </div>

              {receiptPreview && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Receipt Preview:</p>
                  <div className="border rounded-md overflow-hidden">
                    <img
                      src={receiptPreview || "/placeholder.svg"}
                      alt="Receipt preview"
                      className="max-h-64 object-contain mx-auto"
                    />
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="has_warranty"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Warranty Tracking</FormLabel>
                      <FormDescription>Does this purchase have a warranty?</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("has_warranty") && (
                <FormField
                  control={form.control}
                  name="warranty_end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Warranty End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Update Transaction" : "Create Transaction"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

