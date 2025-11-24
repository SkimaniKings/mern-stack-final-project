"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createIncome, updateIncome } from "@/app/actions/income"
import { getIncomeCategories } from "@/app/actions/income"
import { CURRENCIES } from "@/lib/currencies"
import type { Income, IncomeCategory, IncomeRecurrenceFrequency, TaxType } from "@/app/actions/income"
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
import { format } from "date-fns"

interface IncomeFormProps {
  income?: Income
  isEditing?: boolean
}

export function IncomeForm({ income, isEditing = false }: IncomeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [formTab, setFormTab] = useState<string>("basic")
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  
  // Form state for real-time calculations and previews
  const [sourceName, setSourceName] = useState<string>(income?.source_name || "")
  const [amount, setAmount] = useState<number>(income?.amount || 0)
  const [recurrence, setRecurrence] = useState<IncomeRecurrenceFrequency>(income?.recurrence || "monthly")
  const [categoryId, setCategoryId] = useState<string | null>(income?.category_id || null)
  const [notes, setNotes] = useState<string>(income?.notes || "")
  const [isTaxable, setIsTaxable] = useState<boolean>(income?.is_taxable !== false)
  const [taxClass, setTaxClass] = useState<TaxType>(income?.tax_class || "post_tax")
  const [startDate, setStartDate] = useState<string>(income?.start_date || format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState<string | undefined>(income?.end_date || undefined)
  const [currency, setCurrency] = useState<string>(income?.currency || "USD")
  const [showMonthlyEquivalent, setShowMonthlyEquivalent] = useState<boolean>(true)
  const [previewingNotes, setPreviewingNotes] = useState<boolean>(false)
  
  // Deductions and side hustles
  const [deductions, setDeductions] = useState<Array<{name: string, amount: number, tax_class: TaxType}>>([]);
  const [hustles, setHustles] = useState<Array<{name: string, amount: number}>>([]);
  
  // Load existing deductions and hustles when editing
  useEffect(() => {
    if (isEditing && income) {
      console.log("Loading existing income data for editing:", income);
      
      // Load deductions if they exist
      if (income.deductions && Array.isArray(income.deductions)) {
        console.log("Loading deductions:", income.deductions);
        const formattedDeductions = income.deductions.map(d => ({
          name: d.name,
          amount: d.amount,
          tax_class: d.tax_class as TaxType
        }));
        setDeductions(formattedDeductions);
        console.log("Formatted deductions set to state:", formattedDeductions);
      } else {
        console.log("No deductions found or invalid format");
      }
      
      // Load hustles if they exist
      if (income.hustles && Array.isArray(income.hustles)) {
        console.log("Loading side hustles:", income.hustles);
        const formattedHustles = income.hustles.map(h => ({
          name: h.hustle_name,
          amount: h.hustle_amount
        }));
        setHustles(formattedHustles);
        console.log("Formatted hustles set to state:", formattedHustles);
      } else {
        console.log("No side hustles found or invalid format");
      }
    }
  }, [isEditing, income]);
  
  // Load income categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const categoriesData = await getIncomeCategories()
        setCategories(categoriesData)
      } catch (err) {
        console.error("Failed to load income categories:", err)
      }
    }
    
    loadCategories()
  }, [])
  
  
  
  // Calculate monthly equivalent amount based on recurrence
  const calculateMonthlyEquivalent = useCallback((amt: number, rec: IncomeRecurrenceFrequency): number => {
    switch (rec) {
      case "weekly":
        return amt * 52 / 12
      case "bi_weekly":
        return amt * 26 / 12
      case "monthly":
        return amt
      case "quarterly":
        return amt / 3
      case "semi_annual":
        return amt / 6
      case "annual":
        return amt / 12
      default:
        return amt
    }
  }, [])
  
  const monthlyEquivalent = calculateMonthlyEquivalent(amount, recurrence)
  
  // Handle form submission
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      // First, check which tab is active
      if (formTab !== "basic" && (!sourceName || isNaN(amount) || amount <= 0)) {
        setError("Please fill out the required fields in the Basic Info tab first")
        setFormTab("basic") // Switch to basic tab to show required fields
        setLoading(false)
        return
      }
      
      // Create a new FormData object
      const formData = new FormData()
      
      // Validate required fields
      if (!sourceName) {
        setError("Source name is required")
        setLoading(false)
        return
      }
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        setError("Amount must be a positive number")
        setLoading(false)
        return
      }
      
      // Add all required fields from state
      formData.append("source_name", sourceName)
      formData.append("amount", amount.toString())
      formData.append("recurrence", recurrence)
      formData.append("start_date", startDate)
      formData.append("currency", currency)
      
      // Add optional fields
      if (categoryId) formData.append("category_id", categoryId)
      if (endDate) formData.append("end_date", endDate)
      if (notes) formData.append("notes", notes)
      formData.append("is_taxable", isTaxable.toString())
      formData.append("tax_class", taxClass)
      
      // Add deductions and hustles as JSON strings
      // Always include deductions and hustles arrays, even if empty
      console.log("Submitting deductions:", deductions);
      formData.append("deductions", JSON.stringify(deductions));
      
      console.log("Submitting hustles:", hustles);
      formData.append("hustles", JSON.stringify(hustles));
      
      // Create or update income
      if (isEditing && income?.id) {
        await updateIncome(income.id, formData)
        toast({
          title: "Income updated",
          description: "Your income has been updated successfully.",
          variant: "default",
        })
      } else {
        const result = await createIncome(formData)
        toast({
          title: "Income created",
          description: "Your new income has been created successfully.",
          variant: "default",
        })
      }
      
      setSuccess(true)
      
      // Redirect after successful submission
      setTimeout(() => {
        router.push("/income")
        router.refresh()
      }, 1000)
    } catch (err) {
      console.error("Error submitting form:", err)
      setError(err instanceof Error ? err.message : "Failed to save income")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save income",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Add a new deduction
  function addDeduction() {
    // Create a new deduction with default values
    const newDeduction = { name: "", amount: 0, tax_class: "pre_tax" as TaxType };
    setDeductions([...deductions, newDeduction]);
    // Switch to the deductions tab when adding a new deduction
    setFormTab("deductions");
    
    // Log for debugging
    console.log("Added new deduction, current deductions:", [...deductions, newDeduction]);
  }
  
  // Remove a deduction
  function removeDeduction(index: number) {
    const newDeductions = [...deductions]
    newDeductions.splice(index, 1)
    setDeductions(newDeductions)
  }
  
  // Update a deduction
  function updateDeduction(index: number, field: string, value: any) {
    const newDeductions = [...deductions];
    newDeductions[index] = { ...newDeductions[index], [field]: value };
    setDeductions(newDeductions);
    
    // Log for debugging
    console.log(`Updated deduction ${index}, field: ${field}, value: ${value}`);
    console.log("Current deductions:", newDeductions);
  }
  
  // Add a new side hustle
  function addHustle() {
    // Create a new side hustle with default values
    const newHustle = { name: "", amount: 0 };
    setHustles([...hustles, newHustle]);
    // Switch to the side hustles tab when adding a new one
    setFormTab("hustles");
    
    // Log for debugging
    console.log("Added new side hustle, current hustles:", [...hustles, newHustle]);
  }
  
  // Remove a side hustle
  function removeHustle(index: number) {
    const newHustles = [...hustles]
    newHustles.splice(index, 1)
    setHustles(newHustles)
  }
  
  // Update a side hustle
  function updateHustle(index: number, field: string, value: any) {
    const newHustles = [...hustles];
    newHustles[index] = { ...newHustles[index], [field]: value };
    setHustles(newHustles);
    
    // Log for debugging
    console.log(`Updated hustle ${index}, field: ${field}, value: ${value}`);
    console.log("Current hustles:", newHustles);
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={formTab} onValueChange={setFormTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="hustles">Side Hustles</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4 pt-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="source_name">Income Source Name</Label>
              <Input
                id="source_name"
                name="source_name"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g., Salary from Company XYZ"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="pl-8"
                  value={amount || ""}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setAmount(isNaN(value) ? 0 : value);
                  }}
                  required
                />
              </div>
              
              {showMonthlyEquivalent && recurrence !== "monthly" && (
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <BarChart className="h-3 w-3" />
                  Monthly equivalent: ${monthlyEquivalent.toFixed(2)}
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select name="currency" value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="category_id">Category</Label>
              <Select name="category_id" defaultValue={income?.category_id || ""} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select 
                name="recurrence" 
                defaultValue={income?.recurrence || "monthly"}
                onValueChange={(value) => setRecurrence(value as IncomeRecurrenceFrequency)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi_annual">Semi-annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={endDate || ""}
                  onChange={(e) => setEndDate(e.target.value || undefined)}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_taxable" className="cursor-pointer">Taxable Income</Label>
                <Switch
                  id="is_taxable"
                  name="is_taxable"
                  checked={isTaxable}
                  onCheckedChange={setIsTaxable}
                  value="true"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Is this income subject to taxation?
              </p>
            </div>
            
            {isTaxable && (
              <div className="grid gap-2">
                <Label htmlFor="tax_class">Tax Class</Label>
                <Select 
                  name="tax_class" 
                  defaultValue={income?.tax_class || "post_tax"}
                  onValueChange={(value) => setTaxClass(value as TaxType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_tax">Pre-tax (Before taxes)</SelectItem>
                    <SelectItem value="post_tax">Post-tax (After taxes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add any additional notes about this income"
                defaultValue={income?.notes || ""}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="deductions" className="space-y-4 pt-4">
          <div className="space-y-4">
            {/* Required fields notification */}
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-md mb-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-medium">Note:</span> Income source details (name, amount, etc.) are entered in the Basic Info tab.
                Use this tab to add deductions to your income source.
              </p>
            </div>
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Income Deductions</h3>
              <Button type="button" variant="outline" size="sm" onClick={addDeduction}>
                Add Deduction
              </Button>
            </div>
            
            {deductions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No deductions added yet. Click "Add Deduction" to add one.
              </div>
            ) : (
              <div className="space-y-4">
                {deductions.map((deduction, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-base">Deduction {index + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDeduction(index)}
                          className="h-8 text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor={`deduction-name-${index}`}>Name</Label>
                        <Input
                          id={`deduction-name-${index}`}
                          value={deduction.name}
                          onChange={(e) => updateDeduction(index, "name", e.target.value)}
                          placeholder="e.g., 401(k), Health Insurance"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor={`deduction-amount-${index}`}>Amount</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`deduction-amount-${index}`}
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-8"
                            value={deduction.amount}
                            onChange={(e) => updateDeduction(index, "amount", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor={`deduction-tax-class-${index}`}>Tax Class</Label>
                        <Select 
                          value={deduction.tax_class}
                          onValueChange={(value) => updateDeduction(index, "tax_class", value)}
                        >
                          <SelectTrigger id={`deduction-tax-class-${index}`}>
                            <SelectValue placeholder="Select tax class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pre_tax">Pre-tax</SelectItem>
                            <SelectItem value="post_tax">Post-tax</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="hustles" className="space-y-4 pt-4">
          <div className="space-y-4">
            {/* Required fields notification */}
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-md mb-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-medium">Note:</span> Income source details (name, amount, etc.) are entered in the Basic Info tab.
                Use this tab to add side hustles to your income source.
              </p>
            </div>
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Side Hustles</h3>
              <Button type="button" variant="outline" size="sm" onClick={addHustle}>
                Add Side Hustle
              </Button>
            </div>
            
            {hustles.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No side hustles added yet. Click "Add Side Hustle" to add one.
              </div>
            ) : (
              <div className="space-y-4">
                {hustles.map((hustle, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-base">Side Hustle {index + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHustle(index)}
                          className="h-8 text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor={`hustle-name-${index}`}>Name</Label>
                        <Input
                          id={`hustle-name-${index}`}
                          value={hustle.name}
                          onChange={(e) => updateHustle(index, "name", e.target.value)}
                          placeholder="e.g., Freelance Work, Etsy Shop"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor={`hustle-amount-${index}`}>Amount</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`hustle-amount-${index}`}
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-8"
                            value={hustle.amount}
                            onChange={(e) => updateHustle(index, "amount", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/15 text-green-500 p-3 rounded-md flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-sm">Income {isEditing ? "updated" : "created"} successfully!</p>
        </div>
      )}
      
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/income")}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update" : "Create"} Income
        </Button>
      </div>
    </form>
  )
}
