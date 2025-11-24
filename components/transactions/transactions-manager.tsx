"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CrudInterface } from "@/components/ui/crud-interface"
import { createTransaction, updateTransaction, deleteTransaction } from "@/app/actions/transactions"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ALL_CATEGORIES } from "@/lib/constants/categories"

interface Account {
  id: string
  name: string
  type: string
  color?: string
  icon?: string
}

interface Category {
  id: string
  name: string
  color: string
  icon?: string
  is_income: boolean
}

interface Transaction {
  id: string
  user_id?: string
  account_id?: string
  category_id?: string
  amount: number
  description: string
  is_income: boolean
  date: string
  created_at?: string
  updated_at?: string
  account?: Account
  category?: Category
  source_type?: 'transaction' | 'income' | 'expense'
  [key: string]: any // Allow additional properties
}

interface TransactionsManagerProps {
  initialTransactions: Transaction[]
  accounts: Account[]
}

export function TransactionsManager({ initialTransactions, accounts }: TransactionsManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTransactionType, setSelectedTransactionType] = useState<"expense" | "income">("expense")

  // Filter categories based on selected type (income or expense)
  const filteredCategories = ALL_CATEGORIES.filter((category) =>
    selectedTransactionType === "income" ? category.is_income : !category.is_income
  )

  const columns = [
    {
      header: "Date",
      accessorKey: "date",
    },
    {
      header: "Description",
      accessorKey: "description",
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: (transaction: Transaction) => {
        // For regular transactions, find the category by ID
        // For income/expense, use the provided category object
        const category = transaction.category_id 
          ? ALL_CATEGORIES.find(c => c.id === transaction.category_id) || transaction.category
          : transaction.category
        return (
          <div className="flex items-center">
            <div
              className="h-3 w-3 rounded-full mr-2"
              style={{ backgroundColor: category?.color || "#888" }}
            />
            {category?.name || "Uncategorized"}
          </div>
        )
      },
    },
    {
      header: "Account",
      accessorKey: "account",
      cell: (transaction: Transaction) => {
        // Handle different source types differently
        if (transaction.source_type === 'income' && !transaction.account) {
          return "Income Source"
        }
        return transaction.account?.name || "Unknown"
      },
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: (transaction: Transaction) => (
        <div className="flex items-center">
          {transaction.is_income ? (
            <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
          )}
          <span className={transaction.is_income ? "text-green-600" : "text-red-600"}>
            {formatCurrency(transaction.amount)}
          </span>
        </div>
      ),
    },
    {
      header: "Type",
      accessorKey: "is_income",
      cell: (transaction: Transaction) => {
        // Determine badge variant based on transaction type
        let variant: "success" | "default" | "secondary" = transaction.is_income ? "success" : "default"
        
        // Determine label based on source_type and is_income
        let label = transaction.is_income ? "Income" : "Expense"
        
        // Add source type indicator for non-regular transactions
        if (transaction.source_type === 'income') {
          label = "Income Source"
          variant = "success"
        } else if (transaction.source_type === 'expense') {
          label = "Expense Entry"
          variant = "default"
        } else if (transaction.source_type === 'transaction') {
          label = transaction.is_income ? "Income" : "Expense"
        }
        
        return (
          <Badge variant={variant}>
            {label}
          </Badge>
        )
      },
    },
    {
      header: "Source",
      accessorKey: "source_type",
      cell: (transaction: Transaction) => {
        let label = "Transaction"
        let variant: "outline" | "secondary" | "destructive" = "outline"
        
        if (transaction.source_type === 'income') {
          label = "Income Page"
          variant = "secondary"
        } else if (transaction.source_type === 'expense') {
          label = "Expense Page"
          variant = "destructive"
        }
        
        return (
          <Badge variant={variant} className="text-xs">
            {label}
          </Badge>
        )
      },
    },
  ]

  const formFields = [
    {
      name: "transaction_type",
      label: "Transaction Type",
      type: "select" as const,
      required: true,
      options: [
        { value: "expense", label: "Expense" },
        { value: "income", label: "Income" },
      ],
      defaultValue: "expense",
    },
    {
      name: "description",
      label: "Description",
      type: "text" as const,
      placeholder: "Enter transaction description",
      required: true,
    },
    {
      name: "amount",
      label: "Amount",
      type: "number" as const,
      placeholder: "0.00",
      required: true,
    },
    {
      name: "account_id",
      label: "Account",
      type: "select" as const,
      required: true,
      options: accounts.map((account) => ({
        value: account.id,
        label: account.name,
      })),
    },
    {
      name: "category_id",
      label: "Category",
      type: "select" as const,
      required: true,
      options: filteredCategories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    },
    {
      name: "date",
      label: "Date",
      type: "date" as const,
      required: true,
      defaultValue: new Date().toISOString().split("T")[0],
    },
  ]

  const handleFormDataChange = (data: Record<string, any>) => {
    // Update the selected transaction type when it changes
    if (data.transaction_type) {
      setSelectedTransactionType(data.transaction_type)
    }

    // Filter categories based on the selected transaction type
    const isIncome = data.transaction_type === "income"
    const filteredCategories = ALL_CATEGORIES.filter(
      (category) => category.is_income === isIncome
    )

    // If the current category doesn't match the transaction type, clear it
    if (data.category_id) {
      const selectedCategory = ALL_CATEGORIES.find(
        (category) => category.id === data.category_id
      )
      if (selectedCategory && selectedCategory.is_income !== isIncome) {
        data.category_id = ""
      }
    }

    // Update the category options in the form
    const updatedFormFields = formFields.map((field) => {
      if (field.name === "category_id") {
        return {
          ...field,
          options: filteredCategories.map((category) => ({
            value: category.id,
            label: category.name,
          })),
        }
      }
      return field
    })

    // Update the form fields with the filtered categories
    formFields.forEach((field, index) => {
      if (field.name === "category_id") {
        formFields[index] = updatedFormFields[index]
      }
    })

    return data
  }

  const handleCreateTransaction = async (data: Record<string, any>) => {
    try {
      setIsLoading(true)

      const formData = new FormData()
      const isIncome = data.transaction_type === "income"

      // Validate that a category is selected
      if (!data.category_id) {
        throw new Error("Please select a category")
      }

      // Find the selected category
      const category = ALL_CATEGORIES.find((c) => c.id === data.category_id)
      if (!category) {
        throw new Error("Invalid category selected")
      }

      // Validate that category type matches transaction type
      if (category.is_income !== isIncome) {
        throw new Error(`Please select a valid ${isIncome ? "income" : "expense"} category`)
      }

      // Add all form data to FormData
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "transaction_type" && value !== undefined && value !== null) {
          formData.append(key, String(value))
        }
      })

      formData.append("is_income", String(isIncome))

      const newTransaction = await createTransaction(formData)

      // Add the account and category to the transaction object
      const transactionWithRelations = {
        ...newTransaction,
        account: accounts.find((a) => a.id === data.account_id),
        category,
      }

      // Update the transactions state with the new transaction
      setTransactions((prevTransactions) => [transactionWithRelations, ...prevTransactions])

      toast({
        title: "Success",
        description: "Transaction created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create transaction",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTransaction = async (id: string, data: Record<string, any>) => {
    setIsLoading(true)
    try {
      const formData = new FormData()

      // Map form data to transaction data
      const isIncome = data.transaction_type === "income"

      // Validate account and category before proceeding
      const account = accounts.find((a) => a.id === data.account_id)
      const category = ALL_CATEGORIES.find((c) => c.id === data.category_id)

      if (!account) {
        throw new Error("Please select a valid account")
      }

      if (!category) {
        throw new Error("Please select a valid category")
      }

      // Validate that category type matches transaction type
      if (category.is_income !== isIncome) {
        throw new Error(`Please select a valid ${isIncome ? "income" : "expense"} category`)
      }

      Object.entries(data).forEach(([key, value]) => {
        if (key !== "transaction_type") {
          formData.append(key, String(value))
        }
      })

      formData.append("is_income", String(isIncome))

      const updatedTransaction = await updateTransaction(id, formData)

      // Add the account and category to the transaction object
      const transactionWithRelations = {
        ...updatedTransaction,
        account,
        category,
      }

      // Update the transactions state with the updated transaction
      setTransactions((prevTransactions) =>
        prevTransactions.map((transaction) =>
          transaction.id === id ? transactionWithRelations : transaction
        )
      )

      toast({
        title: "Success",
        description: "Transaction updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update transaction",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    setIsLoading(true)
    try {
      await deleteTransaction(id)

      // Update the transactions state by removing the deleted transaction
      setTransactions((prevTransactions) =>
        prevTransactions.filter((transaction) => transaction.id !== id)
      )

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete transaction",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CrudInterface
      title="Transactions"
      description="Manage your financial transactions"
      columns={columns}
      data={transactions}
      formFields={formFields}
      idField="id"
      onCreateItem={handleCreateTransaction}
      onUpdateItem={handleUpdateTransaction}
      onDeleteItem={handleDeleteTransaction}
      isLoading={isLoading}
      onFormDataChange={handleFormDataChange}
    />
  )
}

