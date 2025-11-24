"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateTransaction } from "@/app/actions/transactions"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { ALL_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants/categories"

interface Account {
  id: string
  name: string
  type: string
  balance: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string | null
}

interface Category {
  id: string
  name: string
  color?: string
  is_income?: boolean
  icon?: string
}

interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string
  amount: number
  description?: string
  note?: string // Add note field to match database schema
  is_income: boolean
  date?: string
  transaction_date?: string
  created_at: string
  updated_at: string | null
  account: Account
  category: Category
  type?: string
}

interface TransactionEditFormProps {
  transaction: Transaction
  accounts: Account[]
  categories?: Category[]
}

export function TransactionEditForm({ transaction, accounts, categories = ALL_CATEGORIES }: TransactionEditFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Initialize transaction type based on the type field from the database
  // Explicitly log the transaction data to debug
  console.log("Transaction data for edit form:", {
    id: transaction.id,
    type: transaction.type,
    is_income: transaction.is_income,
    description: transaction.description,
    note: transaction.note,
    date: transaction.date,
    transaction_date: transaction.transaction_date
  })
  
  // Always use the type field first, then fall back to is_income if needed
  const initialType = transaction.type === "income" ? "income" : "expense"
  const [transactionType, setTransactionType] = useState<"expense" | "income">(initialType)

  // Initialize with transaction date from either date or transaction_date field
  const transactionDate = transaction.date || transaction.transaction_date || transaction.created_at
  
  // Format date as YYYY/MM/DD for display
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }
  
  // Log the transaction data for debugging
  console.log("Transaction data for form:", {
    note: transaction.note,
    description: transaction.description,
    date: transactionDate
  })
  
  const [formData, setFormData] = useState({
    // Use note field from transaction as description for the form
    description: transaction.note || transaction.description || '',
    amount: transaction.amount.toString(),
    account_id: transaction.account_id,
    category_id: transaction.category_id,
    // Use transaction_date field from the database with simple date format
    date: transactionDate ? formatDateForDisplay(transactionDate) : formatDateForDisplay(new Date().toISOString()),
  })

  // Filter categories based on selected type (income or expense)
  const filteredCategories = categories.filter((category) =>
    transactionType === "income" ? category.is_income : !category.is_income,
  )

  // Update category selection when transaction type changes
  useEffect(() => {
    // If the current category doesn't match the transaction type, reset it
    const currentCategory = categories.find((c) => c.id === formData.category_id)
    if (currentCategory && currentCategory.is_income !== (transactionType === "income")) {
      setFormData((prev) => ({ ...prev, category_id: "" }))
    }
  }, [transactionType, categories, formData.category_id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTransactionTypeChange = (value: string) => {
    setTransactionType(value as "expense" | "income")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formDataObj = new FormData()

      // Add basic form data - ensure all required fields are included
      formDataObj.append("account_id", formData.account_id)
      formDataObj.append("amount", formData.amount)
      formDataObj.append("category_id", formData.category_id)
      
      // Set the transaction type directly - this is the most important field
      // The database uses 'type' field with values 'income' or 'expense'
      console.log("Submitting transaction type:", transactionType)
      formDataObj.append("type", transactionType)
      
      // Also include is_income for backwards compatibility
      const is_income = transactionType === "income"
      console.log("Submitting is_income:", is_income, "from type:", transactionType)
      formDataObj.append("is_income", is_income.toString())
      
      // Parse the date from YYYY/MM/DD format to ISO format for the database
      const parseDateFromDisplay = (displayDate: string) => {
        // Check if it's already in ISO format
        if (displayDate.includes('T') || displayDate.includes('-')) {
          return displayDate
        }
        
        // Parse from YYYY/MM/DD format
        const [year, month, day] = displayDate.split('/')
        return `${year}-${month}-${day}`
      }
      
      // Always include the date in the correct format - use 'date' field name to match createTransaction
      const formattedDate = parseDateFromDisplay(formData.date)
      console.log("Submitting date:", formData.date, "→", formattedDate)
      formDataObj.append("date", formattedDate)
      
      // Use 'description' field name to match createTransaction
      console.log("Submitting description:", formData.description)
      formDataObj.append("description", formData.description || transaction.note || "Transaction")

      const updatedTransaction = await updateTransaction(transaction.id, formDataObj)

      toast({
        title: "Transaction updated",
        description: "Your transaction has been updated successfully.",
      })

      // Use a more robust approach to ensure data is refreshed
      // First refresh the current router cache
      router.refresh()
      
      // Then redirect to the transaction detail page with a cache-busting query parameter
      // This forces Next.js to revalidate the data when viewing the transaction
      const timestamp = Date.now()
      router.push(`/transactions/${transaction.id}?t=${timestamp}`)
      
      // This approach ensures the transaction detail page shows the updated data immediately
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast({
        title: "Error",
        description: "Failed to update transaction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Edit Transaction</CardTitle>
          <CardDescription>Update the details of your transaction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_type">Transaction Type</Label>
              <Select value={transactionType} onValueChange={handleTransactionTypeChange}>
                <SelectTrigger id="transaction_type">
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_id">Account</Label>
              <Select value={formData.account_id} onValueChange={(value) => handleSelectChange("account_id", value)}>
                <SelectTrigger id="account_id">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              <Select value={formData.category_id} onValueChange={(value) => handleSelectChange("category_id", value)}>
                <SelectTrigger id="category_id">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.length === 0 ? (
                    <SelectItem value="" disabled>
                      No matching categories found
                    </SelectItem>
                  ) : (
                    filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Transaction"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

