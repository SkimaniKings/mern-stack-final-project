"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MoreHorizontalIcon,
  EditIcon,
  TrashIcon,
  MapPinIcon,
  ReceiptIcon,
  UsersIcon,
  RepeatIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { deleteTransaction } from "@/app/actions/transactions"
import type { Transaction, Category, Account } from "@/types/finance"

type TransactionWithRelations = Transaction & {
  categories: Category
  accounts: Account
  receipts?: { image_url: string }[]
  split_transactions?: { participant_name: string; amount: number }[]
}

type TransactionsListProps = {
  transactions: TransactionWithRelations[]
}

export function TransactionsList({ transactions }: TransactionsListProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (transactionToDelete) {
      try {
        await deleteTransaction(transactionToDelete)
        router.refresh()
      } catch (error) {
        console.error("Error deleting transaction:", error)
      } finally {
        setDeleteDialogOpen(false)
        setTransactionToDelete(null)
      }
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Features</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No transactions found. Create your first transaction to get started.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <div className="font-medium">{format(new Date(transaction.date), "MMM d, yyyy")}</div>
                  {transaction.time_of_day && (
                    <div className="text-xs text-muted-foreground">{transaction.time_of_day}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.description}</div>
                  {transaction.merchant_name && (
                    <div className="text-xs text-muted-foreground">{transaction.merchant_name}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div
                    className="flex items-center gap-2"
                    style={{ color: transaction.categories?.color || "inherit" }}
                  >
                    {transaction.categories?.name}
                  </div>
                </TableCell>
                <TableCell>{transaction.accounts?.name}</TableCell>
                <TableCell className="text-right font-medium">
                  <div className={transaction.is_income ? "text-green-600" : "text-red-600"}>
                    {transaction.is_income ? (
                      <ArrowUpIcon className="inline-block mr-1 h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="inline-block mr-1 h-4 w-4" />
                    )}
                    ${transaction.amount.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      {transaction.latitude && transaction.longitude && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                              <MapPinIcon className="h-3 w-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Location tracked</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {transaction.receipts && transaction.receipts.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                              <ReceiptIcon className="h-3 w-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Receipt attached</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {transaction.is_split && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                              <UsersIcon className="h-3 w-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Split transaction</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {transaction.is_recurring && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                              <RepeatIcon className="h-3 w-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Recurring transaction</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontalIcon className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/transactions/${transaction.id}`}>View Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/transactions/edit/${transaction.id}`}>
                          <EditIcon className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteClick(transaction.id)} className="text-red-600">
                        <TrashIcon className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

