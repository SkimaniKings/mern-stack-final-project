"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils/formatting"
import {
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Calendar,
  CreditCard,
  Tag,
  DollarSign,
  Edit,
  Trash2,
} from "lucide-react"
import { deleteTransaction } from "@/app/actions/transactions"
import { useToast } from "@/hooks/use-toast"
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
import { Separator } from "@/components/ui/separator"

interface Account {
  id: string
  name: string
  type: string
}

interface Category {
  id: string
  name: string
  color: string
  is_income: boolean
}

interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string
  amount: number
  description: string
  is_income: boolean
  created_at: string
  updated_at: string | null
  account: Account
  category: Category
}

interface TransactionDetailProps {
  transaction: Transaction
}

export function TransactionDetail({ transaction }: TransactionDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteTransaction(transaction.id)

      toast({
        title: "Transaction deleted",
        description: "The transaction has been deleted successfully.",
      })

      router.push("/transactions")
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    router.push(`/transactions/edit/${transaction.id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transaction Details</h1>
        <p className="text-muted-foreground mt-2">View and manage transaction information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{transaction.description}</CardTitle>
              <CardDescription>{formatDate(new Date(transaction.created_at), { includeTime: true })}</CardDescription>
            </div>
            <div className="flex items-center">
              {transaction.is_income ? (
                <ArrowUpRight className="mr-2 h-5 w-5 text-green-500" />
              ) : (
                <ArrowDownRight className="mr-2 h-5 w-5 text-red-500" />
              )}
              <span className={`text-xl font-bold ${transaction.is_income ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Receipt className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-base">{transaction.description}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-base">{formatDate(new Date(transaction.created_at), { includeTime: true })}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className={`text-base ${transaction.is_income ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account</p>
                  <p className="text-base">{transaction.account.name}</p>
                  <p className="text-xs text-muted-foreground">{transaction.account.type}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <div className="flex items-center">
                    <div
                      className="h-3 w-3 rounded-full mr-2"
                      style={{ backgroundColor: transaction.category.color }}
                    />
                    <p className="text-base">{transaction.category.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="h-5 w-5" /> {/* Spacer for alignment */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className={`text-base ${transaction.is_income ? "text-green-600" : "text-red-600"}`}>
                    {transaction.is_income ? "Income" : "Expense"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {transaction.updated_at && (
            <div className="pt-4">
              <Separator className="mb-4" />
              <p className="text-xs text-muted-foreground">
                Last updated: {formatDate(new Date(transaction.updated_at), { includeTime: true })}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Transaction
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Transaction
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
              <div className="mt-4 p-4 border rounded-md bg-muted/50">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{transaction.description}</span>
                  <span className={transaction.is_income ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">{formatDate(new Date(transaction.created_at))}</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

