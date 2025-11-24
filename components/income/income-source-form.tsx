"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createIncomeSource, updateIncomeSource } from "@/app/actions/income-sources"
import { getLatestCurrencyRates } from "@/app/actions/currency-rates"
import { getAvailableCurrencies } from "@/lib/currency-utils"
import type { IncomeSource } from "@/types/income"
import { AlertCircle, CheckCircle2, Loader2, HelpCircle, DollarSign, Calendar, AlarmClock, BarChart } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface IncomeSourceFormProps {
  incomeSource?: IncomeSource
  isEditing?: boolean
}

export function IncomeSourceForm({ incomeSource, isEditing = false }: IncomeSourceFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(["USD", "EUR", "GBP", "CAD", "AUD", "JPY"])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [formTab, setFormTab] = useState<string>("basic")
  
  // Form state for real-time calculations and previews
  const [amount, setAmount] = useState<number>(incomeSource?.amount || 0)
  const [frequency, setFrequency] = useState<string>(incomeSource?.frequency || "monthly")
  const [type, setType] = useState<string>(incomeSource?.type || "salary")
  const [notes, setNotes] = useState<string>(incomeSource?.notes || "")
  const [isTaxable, setIsTaxable] = useState<boolean>(incomeSource?.is_taxable !== false)
  const [showMonthlyEquivalent, setShowMonthlyEquivalent] = useState<boolean>(true)
  const [previewingNotes, setPreviewingNotes] = useState<boolean>(false)

  // Calculate monthly equivalent amount
  const calculateMonthlyAmount = useCallback((amt: number, freq: string) => {
    switch (freq) {
      case "daily":
        return amt * 30.42; // Average days in a month
      case "weekly":
        return amt * 4.33; // Average weeks in a month
      case "bi-weekly":
        return amt * 2.17; // Bi-weekly periods in a month
      case "monthly":
        return amt;
      case "annually":
        return amt / 12;
      case "one-time":
        return amt / 12; // Spread one-time income over a year by default
      default:
        return amt;
    }
  }, []);

  const monthlyEquivalent = calculateMonthlyAmount(amount, frequency);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const rates = await getLatestCurrencyRates()
        const currencies = getAvailableCurrencies(rates)

        if (currencies.length > 0) {
          setAvailableCurrencies(currencies)
        }
      } catch (error) {
        console.error("Error fetching currencies:", error)
      }
    }

    fetchCurrencies()
  }, [])

  // Initialize form state from incomeSource if editing
  useEffect(() => {
    if (incomeSource) {
      setAmount(incomeSource.amount || 0)
      setFrequency(incomeSource.frequency || "monthly")
      setType(incomeSource.type || "salary")
      setNotes(incomeSource.notes || "")
      setIsTaxable(incomeSource.is_taxable !== false)
    }
  }, [incomeSource])

  const handleCancel = () => {
    router.push("/income")
  }

  // Simple markdown to HTML converter for notes preview
  const renderMarkdown = (text: string) => {
    if (!text) return "";
    
    // Convert headers
    let html = text.replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    
    // Convert bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Convert lists
    html = html.replace(/^\* (.*$)/gm, '<li>$1</li>')
    html = html.replace(/<\/li>\n<li>/g, '</li><li>')
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    
    // Convert line breaks
    html = html.replace(/\n/g, '<br>')
    
    return html;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      // Create a new FormData from the event
      const formData = new FormData(event.currentTarget)
      
      // Ensure the type is one of the allowed values
      const allowedTypes = ['salary', 'bonus', 'freelance', 'rental', 'investment', 'passive', 'other']
      const currentType = type || formData.get("type") as string || "salary"
      
      if (!allowedTypes.includes(currentType)) {
        setError(`Invalid income type. Allowed types are: ${allowedTypes.join(', ')}`)
        setLoading(false)
        return
      }
      
      // Safely get form values, using fallbacks to prevent undefined errors
      const nameInput = event.currentTarget.querySelector('[name="name"]') as HTMLInputElement
      const currencyInput = event.currentTarget.querySelector('[name="currency"]') as HTMLInputElement
      const startDateInput = event.currentTarget.querySelector('[name="start_date"]') as HTMLInputElement
      const endDateInput = event.currentTarget.querySelector('[name="end_date"]') as HTMLInputElement
      
      // Explicitly add all state-managed values to ensure they're included
      formData.set("name", nameInput?.value || incomeSource?.name || "")
      formData.set("type", currentType)
      formData.set("amount", amount.toString())
      formData.set("frequency", frequency)
      formData.set("currency", currencyInput?.value || incomeSource?.currency || "USD")
      formData.set("is_taxable", isTaxable ? "true" : "false")
      
      // Add optional fields only if they have values
      if (startDateInput?.value) {
        formData.set("start_date", startDateInput.value)
      }
      
      if (endDateInput?.value) {
        formData.set("end_date", endDateInput.value)
      }
      
      if (notes) {
        formData.set("notes", notes)
      }

      // Additional validation
      const name = formData.get("name") as string;
      if (!name || name.trim() === "") {
        setError("Name is required")
        setLoading(false)
        return
      }
      
      // Validate amount
      if (amount <= 0) {
        setError("Amount must be greater than zero")
        setLoading(false)
        return
      }

      console.log("Submitting form data:", Object.fromEntries(formData.entries()))

      if (isEditing && incomeSource) {
        // Show confirmation dialog for editing
        const confirmEdit = window.confirm(
          `Are you sure you want to update "${name}"? This will change how this income source appears in your reports and analytics.`
        )
        
        if (!confirmEdit) {
          setLoading(false)
          return
        }
        
        const result = await updateIncomeSource(incomeSource.id, formData)
        console.log("Update result:", result)
        setSuccess(true)
        
        // Show success toast
        toast({
          title: "Income source updated",
          description: "Your income source has been successfully updated.",
          variant: "success",
        })
        
        // Wait a moment to show success state before redirecting
        setTimeout(() => {
          // Force a complete refresh to ensure we get the latest data
          window.location.href = "/income"
        }, 1000)
      } else {
        const result = await createIncomeSource(formData)
        console.log("Create result:", result)
        toast({
          title: "Income source created",
          description: "Your new income source has been successfully added.",
          variant: "success",
        })
        
        // Use router.push and router.refresh instead of hard refresh
        router.push("/income")
        router.refresh()
      }
    } catch (error) {
      console.error("Error saving income source:", error)
      let errorMessage = "Failed to save income source. Please try again."
      
      // Try to extract more specific error message if available
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage
      }
      
      setError(errorMessage)
      
      // Show error toast
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="mr-2 h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 shadow-sm">
          <div className="flex items-center">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            <span>Income source updated successfully!</span>
          </div>
        </div>
      )}

      {showMonthlyEquivalent && amount > 0 && (
        <div className="bg-muted p-3 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Monthly equivalent:</span>
            <span className="font-medium">
              {new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: incomeSource?.currency || 'USD' 
              }).format(monthlyEquivalent)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-muted-foreground">Annual equivalent:</span>
            <span className="font-medium">
              {new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: incomeSource?.currency || 'USD' 
              }).format(monthlyEquivalent * 12)}
            </span>
          </div>
        </div>
      )}

      <Tabs value={formTab} onValueChange={setFormTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
        </TabsList>
        
        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Income Source Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Main Job, Side Gig, Rental Property"
                  defaultValue={incomeSource?.name || ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type <span className="text-red-500">*</span></Label>
                <Select name="type" value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: "salary", label: "Salary" },
                      { value: "bonus", label: "Bonus" },
                      { value: "freelance", label: "Freelance" },
                      { value: "rental", label: "Rental" },
                      { value: "investment", label: "Investment" },
                      { value: "passive", label: "Passive" },
                      { value: "other", label: "Other" }
                    ].map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    {incomeSource?.currency || "USD"}
                  </span>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    placeholder="0.00"
                    className="pl-12"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency <span className="text-red-500">*</span></Label>
                <Select name="frequency" value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: "weekly", label: "Weekly" },
                      { value: "bi-weekly", label: "Bi-weekly" },
                      { value: "monthly", label: "Monthly" },
                      { value: "annually", label: "Annually" },
                      { value: "one-time", label: "One-time" }
                    ].map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select name="currency" defaultValue={incomeSource?.currency || "USD"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="is_taxable"
                  name="is_taxable"
                  checked={isTaxable}
                  onCheckedChange={setIsTaxable}
                />
                <Label htmlFor="is_taxable" className="cursor-pointer">This income is taxable</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Check this if you need to pay taxes on this income. This affects tax calculations in the paycheck simulator.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="start_date">Start Date</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-64">When did you start receiving this income? This helps with historical analysis.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="start_date" 
                    name="start_date" 
                    type="date" 
                    defaultValue={incomeSource?.start_date?.split("T")[0]} 
                  />
                </div>
                <p className="text-xs text-muted-foreground">When did this income source start?</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="end_date">End Date</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-64">Optional: When will this income source end? Leave blank for ongoing sources.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="end_date" 
                    name="end_date" 
                    type="date" 
                    defaultValue={incomeSource?.end_date?.split("T")[0]} 
                  />
                </div>
                <p className="text-xs text-muted-foreground">When will this income source end? (Optional)</p>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notes">Notes</Label>
                <div className="flex items-center space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPreviewingNotes(!previewingNotes)}
                  >
                    {previewingNotes ? "Edit" : "Preview"}
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-64">Supports basic Markdown: **bold**, *italic*, # headers, and * lists</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
                
              {!previewingNotes ? (
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Additional details about this income source..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-32 focus-visible:ring-blue-500"
                />
              ) : (
                <div 
                  className="min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(notes) }}
                />
              )}
              <p className="text-xs text-muted-foreground">Any additional details or context about this income source</p>
            </div>
          </TabsContent>
          
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Saving..."}
                </>
              ) : isEditing ? (
                "Update Income Source" 
              ) : (
                "Add Income Source"
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel} 
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  )
}
