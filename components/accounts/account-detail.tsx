"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/formatting"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, Plus, Edit, Trash2, CreditCard, Wallet, Building, PiggyBank, DollarSign, Loader2, CalendarIcon, InfoIcon } from "lucide-react"
import { deleteAccount } from "@/app/actions/accounts"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"

interface Account {
  id: string
  name: string
  account_type: string
  balance: number
  currency: string
  is_active: boolean
  is_primary: boolean
  institution?: string
  account_number?: string
  notes?: string
  color?: string
  icon?: string
  created_at: string
  updated_at: string | null
  // Cash flow data
  total_inflow?: number
  total_outflow?: number
  net_cash_position?: number
}

interface Category {
  id: string
  name: string
  color: string
  is_income: boolean
}

interface Transaction {
  id: string
  description: string
  amount: number
  is_income: boolean
  created_at: string
  category: Category
}

interface AccountDetailProps {
  account: Account
  transactions: Transaction[]
}

export function AccountDetail({ account, transactions }: AccountDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [transactionStats, setTransactionStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netFlow: 0,
    monthlyAvgIncome: 0,
    monthlyAvgExpense: 0,
    largestTransaction: 0,
    transactionCount: 0
  })

  useEffect(() => {
    if (transactions && transactions.length > 0) {
      calculateTransactionStats(transactions)
    }
  }, [transactions])

  const calculateTransactionStats = (txns: Transaction[]) => {
    const totalIncome = txns.filter((t) => t.is_income).reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = txns.filter((t) => !t.is_income).reduce((sum, t) => sum + t.amount, 0)
    const netFlow = totalIncome - totalExpenses
    
    // Get the largest transaction amount
    const largestTransaction = txns.reduce((max, t) => Math.max(max, t.amount), 0)
    
    // Calculate monthly averages (assuming we have at least 30 days of data)
    // If we have less data, we'll still calculate an average but it won't be as accurate
    const oldestTxDate = new Date(Math.min(...txns.map(t => new Date(t.created_at).getTime())))
    const newestTxDate = new Date(Math.max(...txns.map(t => new Date(t.created_at).getTime())))
    const daysDiff = Math.max(1, Math.ceil((newestTxDate.getTime() - oldestTxDate.getTime()) / (1000 * 60 * 60 * 24)))
    const monthsOfData = Math.max(1, daysDiff / 30)
    
    const monthlyAvgIncome = totalIncome / monthsOfData
    const monthlyAvgExpense = totalExpenses / monthsOfData
    
    setTransactionStats({
      totalIncome,
      totalExpenses,
      netFlow,
      monthlyAvgIncome,
      monthlyAvgExpense,
      largestTransaction,
      transactionCount: txns.length
    })
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteAccount(account.id)

      toast({
        title: "Account deleted",
        description: "The account has been deleted successfully.",
      })

      router.push("/accounts")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    router.push(`/accounts/edit/${account.id}`)
  }
  
  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "checking":
        return <CreditCard className="h-5 w-5" />
      case "savings":
        return <PiggyBank className="h-5 w-5" />
      case "credit_card":
        return <CreditCard className="h-5 w-5" />
      case "investment":
        return <DollarSign className="h-5 w-5" />
      case "loan":
        return <Building className="h-5 w-5" />
      case "cash":
        return <Wallet className="h-5 w-5" />
      default:
        return <Wallet className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={account.is_active ? "default" : "outline"} className="capitalize">
              {account.is_active ? "Active" : "Inactive"}
            </Badge>
            {account.is_primary && (
              <Badge variant="secondary" className="capitalize">
                Primary
              </Badge>
            )}
            <p className="text-muted-foreground flex items-center gap-1">
              {getAccountIcon(account.account_type)}
              <span className="capitalize">{account.account_type.replace('_', ' ')} Account</span>
            </p>
            {account.institution && (
              <p className="text-muted-foreground text-sm">
                at {account.institution}
                {account.account_number && <span> (••••{account.account_number})</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account.balance, { currency: account.currency })}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {formatDate(new Date(account.updated_at || account.created_at))}
            </p>
          </CardContent>
          {account.notes && (
            <CardFooter className="bg-muted/50 text-sm pt-2 pb-3 px-6 border-t">
              <div className="flex gap-2 items-start">
                <InfoIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">{account.notes}</p>
              </div>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Income</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(transactionStats.totalIncome, { currency: account.currency })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Monthly avg: {formatCurrency(transactionStats.monthlyAvgIncome, { currency: account.currency })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(transactionStats.totalExpenses, { currency: account.currency })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Monthly avg: {formatCurrency(transactionStats.monthlyAvgExpense, { currency: account.currency })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>View and manage account information</CardDescription>
            </div>
            <Badge variant={account.is_active ? "default" : "secondary"}>
              {account.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Account Type</dt>
              <dd className="mt-1 text-base">{account.type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Currency</dt>
              <dd className="mt-1 text-base">{account.currency}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="mt-1 text-base">{formatDate(new Date(account.created_at))}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
              <dd className="mt-1 text-base">
                {account.updated_at ? formatDate(new Date(account.updated_at)) : "Never"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Net Cash Flow</dt>
              <dd className={`mt-1 text-base font-medium ${transactionStats.netFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(transactionStats.netFlow, { currency: account.currency })}
              </dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Account
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Account
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>Recent transactions for this account</CardDescription>
            </div>
            <Button asChild>
              <Link href={`/transactions/new?account=${account.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <TransactionTable transactions={transactions} />
            </TabsContent>

            <TabsContent value="income">
              <TransactionTable transactions={transactions.filter((t) => t.is_income)} />
            </TabsContent>

            <TabsContent value="expenses">
              <TransactionTable transactions={transactions.filter((t) => !t.is_income)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this account? This action cannot be undone.
              <div className="mt-4 p-4 border rounded-md bg-muted/50">
                <div className="font-medium">{account.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Balance: {formatCurrency(account.balance, { currency: account.currency })}
                </div>
              </div>
              {transactions.length > 0 && (
                <div className="mt-2 text-red-600">
                  Warning: This account has {transactions.length} transactions that will also be deleted.
                </div>
              )}
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

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <p>No transactions found.</p>
                  <Button variant="link" size="sm" asChild className="mt-2">
                    <Link href={`/transactions/new`}>Add your first transaction</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            sortedTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{formatDate(new Date(transaction.created_at))}</TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.description}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div
                      className="h-3 w-3 rounded-full mr-2"
                      style={{ backgroundColor: transaction.category.color }}
                    />
                    <span className="whitespace-nowrap">{transaction.category.name}</span>
                  </div>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/transactions/${transaction.id}`}>View</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/transactions/edit/${transaction.id}`}>
                        <Edit className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

