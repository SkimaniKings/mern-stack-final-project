"use client"

import { useState } from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TransactionDialog } from "@/components/transactions/transaction-dialog"
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
import { formatCurrency, formatDate } from "@/lib/utils/formatting"
import { createTransaction, updateTransaction, deleteTransaction } from "@/app/actions/transactions"

export interface Transaction {
  id: string
  date: Date | string
  payee: string
  category: string
  amount: number
  type: "income" | "expense"
  account: string
  description?: string
  tags?: string[]
}

export interface TransactionListProps {
  transactions: Transaction[]
  onCreateTransaction?: (transaction: Omit<Transaction, "id">) => Promise<void>
  onUpdateTransaction?: (id: string, transaction: Partial<Transaction>) => Promise<void>
  onDeleteTransaction?: (id: string) => Promise<void>
  title?: string
  description?: string
}

export function TransactionList({
  transactions,
  onCreateTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  title = "Transactions",
  description,
}: TransactionListProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => formatDate(row.getValue("date")),
    },
    {
      accessorKey: "payee",
      header: "Payee",
      cell: ({ row }) => <div className="font-medium">{row.getValue("payee")}</div>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "account",
      header: "Account",
    },
    {
      accessorKey: "amount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="ml-auto"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.getValue("amount"))
        const type = row.getValue("type") as "income" | "expense"

        return (
          <div className={`text-right font-medium ${type === "expense" ? "text-red-500" : "text-green-500"}`}>
            {formatCurrency(amount, { signDisplay: type === "expense" ? "never" : "never" })}
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const transaction = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setEditingTransaction(transaction)}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => setDeletingTransaction(transaction)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: transactions,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const handleCreateTransaction = async (data: Omit<Transaction, "id">) => {
    if (onCreateTransaction) {
      await onCreateTransaction(data)
    } else {
      // Use the server action directly
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === "date" && value instanceof Date) {
            formData.append(key, value.toISOString().split("T")[0])
          } else {
            formData.append(key, String(value))
          }
        }
      })
      await createTransaction(formData)
    }
    setIsCreateDialogOpen(false)
  }

  const handleUpdateTransaction = async (data: Partial<Transaction>) => {
    if (editingTransaction) {
      if (onUpdateTransaction) {
        await onUpdateTransaction(editingTransaction.id, data)
      } else {
        // Use the server action directly
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === "date" && value instanceof Date) {
              formData.append(key, value.toISOString().split("T")[0])
            } else {
              formData.append(key, String(value))
            }
          }
        })
        await updateTransaction(editingTransaction.id, formData)
      }
      setEditingTransaction(null)
    }
  }

  const handleDeleteTransaction = async () => {
    if (deletingTransaction) {
      if (onDeleteTransaction) {
        await onDeleteTransaction(deletingTransaction.id)
      } else {
        // Use the server action directly
        await deleteTransaction(deletingTransaction.id)
      }
      setDeletingTransaction(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.id !== "actions")
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 pb-4">
          <Input
            placeholder="Filter transactions..."
            value={(table.getColumn("payee")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("payee")?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getFilteredRowModel().rows.length} of {transactions.length} transactions
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </CardFooter>

      {/* Create Transaction Dialog */}
      <TransactionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateTransaction}
        title="Add Transaction"
        description="Add a new transaction to your account."
      />

      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        <TransactionDialog
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          onSubmit={handleUpdateTransaction}
          title="Edit Transaction"
          description="Edit the details of this transaction."
          defaultValues={editingTransaction}
        />
      )}

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={(open) => !open && setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

