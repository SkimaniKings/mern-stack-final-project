"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { BillDialog } from "@/components/bills/bill-dialog"
import { getBills, deleteBill, markBillAsPaid } from "@/app/actions/bills"
import { formatCurrency } from "@/lib/utils"
import { Calendar, Clock, Plus, Edit, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
import { BillsCalendar } from "./bills-calendar"

interface Bill {
  id: string
  name: string
  amount?: number
  amount_due: number
  next_payment_date?: string
  next_due_date: string
  payment_schedule?: { status: string; scheduled_date: string }[]
  bill_payments?: { id: string; payment_date: string; amount_paid: number; payment_method: string; note: string }[]
  category?: { id: string; name: string; description: string; icon: string }
  category_id?: string
  status: string
  frequency: string
  description?: string
  vendor?: string
  expected_payment_account?: string
  currency?: string
  last_paid_date?: string
}

interface BillsListProps {
  showCalendarView?: boolean;
}

export function BillsList({ showCalendarView = false }: BillsListProps) {
  const router = useRouter()
  const [bills, setBills] = useState<Bill[]>([])
  const [filteredBills, setFilteredBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [billToDelete, setBillToDelete] = useState<string | null>(null)
  const [openPayDialog, setOpenPayDialog] = useState(false)
  const [billToPay, setBillToPay] = useState<Bill | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<'name' | 'amount' | 'next_payment_date'>('next_payment_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch bills on component mount
  useEffect(() => {
    fetchBills()
  }, [])

  // Apply filters and sorting whenever bills, search query, or filters change
  useEffect(() => {
    applyFiltersAndSort()
  }, [bills, searchQuery, sortField, sortDirection, statusFilter])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const data = await getBills()
      
      // Validate and sanitize the data
      const validatedBills = data.map((bill: any) => {
        // Log the raw bill data for debugging
        console.log('Raw bill data:', JSON.stringify(bill, null, 2));
        
        // IMPORTANT: Do not modify the next_due_date - use exactly what comes from the database
        // This ensures recurring bills show the correct user-specified date
        const originalDueDate = bill.next_due_date;
        console.log(`Bill ${bill.name}: Original due date from DB: ${originalDueDate}`);
        
        return {
          ...bill,
          // Use amount_due as the primary amount field
          amount_due: typeof bill.amount_due === 'number' ? bill.amount_due : parseFloat(bill.amount_due) || 0,
          // CRITICAL: Preserve the exact next_due_date from the database without modification
          // Only use fallback if it's completely missing
          next_due_date: originalDueDate || new Date().toISOString().split('T')[0],
          // Ensure status is a valid value
          status: ['unpaid', 'paid', 'overdue', 'cancelled'].includes(bill.status) ? bill.status : 'unpaid'
        };
      })
      
      setBills(validatedBills)
    } catch (err) {
      console.error("Error fetching bills:", err)
      setError(typeof err === 'string' ? err : "Failed to load bills. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const refreshBills = async () => {
    setIsRefreshing(true)
    await fetchBills()
    setIsRefreshing(false)
  }

  // Apply filters and sorting to bills
  const applyFiltersAndSort = () => {
    let result = [...bills]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(bill => 
        bill.name.toLowerCase().includes(query) || 
        bill.description?.toLowerCase().includes(query) ||
        bill.vendor?.toLowerCase().includes(query) ||
        bill.category?.name.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter) {
      result = result.filter(bill => {
        const billStatus = getBillStatus(bill)
        return billStatus === statusFilter
      })
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      } else if (sortField === 'amount') {
        return sortDirection === 'asc'
          ? a.amount_due - b.amount_due
          : b.amount_due - a.amount_due
      } else {
        // Sort by date
        const dateA = new Date(a.next_due_date || '').getTime()
        const dateB = new Date(b.next_due_date || '').getTime()
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
      }
    })

    setFilteredBills(result)
  }

  const handleAddBill = () => {
    setSelectedBill(null)
    setOpenDialog(true)
  }

  const handleEditBill = (bill: Bill) => {
    setSelectedBill(bill)
    setOpenDialog(true)
  }

  const handleDeleteBill = (id: string) => {
    setBillToDelete(id)
    setOpenDeleteDialog(true)
  }

  const confirmDeleteBill = async () => {
    if (billToDelete) {
      try {
        await deleteBill(billToDelete)
        await refreshBills()
      } catch (err) {
        console.error("Error deleting bill:", err)
        setError(typeof err === 'string' ? err : "Failed to delete bill. Please try again.")
      }
    }
    setOpenDeleteDialog(false)
  }

  const handlePayBill = (bill: Bill) => {
    setBillToPay(bill)
    setOpenPayDialog(true)
  }

  const confirmPayBill = async () => {
    if (billToPay) {
      try {
        await markBillAsPaid(billToPay.id)
        await refreshBills()
      } catch (err) {
        console.error("Error marking bill as paid:", err)
        setError(typeof err === 'string' ? err : "Failed to mark bill as paid. Please try again.")
      }
    }
    setOpenPayDialog(false)
  }

  const handleSaveBill = async () => {
    setOpenDialog(false)
    await refreshBills()
  }

  const handleSortChange = (field: 'name' | 'amount' | 'next_payment_date') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      
      console.log(`Formatting date string: '${dateString}'`);
      
      // Ensure we're working with a standardized date format
      // First try to parse as ISO date (YYYY-MM-DD)
      let date;
      
      // Try different parsing approaches
      if (dateString.includes('-')) {
        // Looks like ISO format, use parseISO
        date = parseISO(dateString);
      } else {
        // Try regular Date constructor
        date = new Date(dateString);
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error(`Invalid date: '${dateString}'`);
        return "Invalid Date";
      }
      
      // Format the date
      const formattedDate = format(date, "MMM d, yyyy");
      console.log(`Formatted date: '${dateString}' → '${formattedDate}'`);
      return formattedDate;
    } catch (e) {
      console.error(`Error formatting date '${dateString}':`, e);
      return "Invalid Date";
    }
  };

  // Determine the display status of a bill based on its properties
  // The database only accepts these enum values: 'unpaid', 'paid', 'overdue', 'cancelled'
  // We'll use them directly as requested:
  // - unpaid: default for new bills
  // - paid: when clicked by the user
  // - overdue: if the date is past due
  // - cancelled: if a user cancels the bill
  const getBillStatus = (bill: Bill) => {
    console.log(`Determining status for bill: ${bill.name}, DB status: ${bill.status}, due date: ${bill.next_due_date}`);
    
    // CRITICAL: Always respect the database status first
    // This ensures we don't override statuses set by the user
    if (bill.status) {
      console.log(`Using database status for bill ${bill.name}: ${bill.status}`);
      return bill.status;
    }
    
    // If no status is set in the database, determine based on due date
    try {
      if (!bill.next_due_date) {
        // If no due date, default to unpaid
        return "unpaid";
      }
      
      // Ensure proper date parsing
      const dueDate = new Date(bill.next_due_date);
      const today = new Date();
      
      // Set hours to 0 for proper comparison
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      if (isNaN(dueDate.getTime())) {
        // If invalid date, default to unpaid
        return "unpaid";
      }
      
      // Calculate the difference in days
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      console.log(`Bill ${bill.name} due in ${diffDays} days`);
      
      // If due date has passed, mark as overdue
      if (diffDays < 0) {
        return "overdue";
      }

      // Otherwise default to unpaid
      return "unpaid";
    } catch (e) {
      console.error(`Error determining bill status for ${bill.name}:`, e);
      // In case of error, default to unpaid
      return "unpaid";
    }
  };

  // Get the badge component for a bill based on its status
  const getBillStatusBadge = (bill: Bill) => {
    const status = getBillStatus(bill);
    console.log(`Rendering badge for bill: ${bill.name}, status: ${status}`);
    
    // Get the due date to determine visual indicators for unpaid bills
    let dueSoonOrUpcoming = false;
    let daysUntilDue = 0;
    
    if (status === 'unpaid' && bill.next_due_date) {
      try {
        const dueDate = new Date(bill.next_due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        
        if (!isNaN(dueDate.getTime())) {
          const diffTime = dueDate.getTime() - today.getTime();
          daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          dueSoonOrUpcoming = true;
          console.log(`Bill ${bill.name} is due in ${daysUntilDue} days`);
        }
      } catch (e) {
        console.error(`Error calculating days until due for ${bill.name}:`, e);
      }
    }
    
    switch (status) {
      case "paid":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Paid
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="mr-1 h-3 w-3" />
            Overdue
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      case "unpaid":
        // For unpaid bills, decide if it's actually overdue, due soon, or upcoming
        if (dueSoonOrUpcoming && daysUntilDue < 0) {
          // Past due but DB not updated – treat as overdue for badge
          return (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <AlertCircle className="mr-1 h-3 w-3" />
              Overdue
            </Badge>
          );
        } else if (dueSoonOrUpcoming && daysUntilDue <= 7) {
          return (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Clock className="mr-1 h-3 w-3" />
              Due Soon ({daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'})
            </Badge>
          );
        } else if (dueSoonOrUpcoming) {
          return (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Calendar className="mr-1 h-3 w-3" />
              Upcoming
            </Badge>
          );
        } else {
          return (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
              <Clock className="mr-1 h-3 w-3" />
              Unpaid
            </Badge>
          );
        }
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  if (showCalendarView) {
    return <BillsCalendar initialBills={bills} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bills</h2>
          <p className="text-muted-foreground">
            Manage your recurring bills and payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleAddBill}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bill
          </Button>
        </div>
      </div>
      
      {/* Search and filter controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search bills..."
            className="w-full px-4 py-2 border rounded-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border rounded-md bg-background"
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value || null)}
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={refreshBills}
            disabled={isRefreshing}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <path d="M21 12a9 9 0 0 1-9 9" />
              <path d="M3 12a9 9 0 0 1 9-9" />
              <path d="M21 12a9 9 0 0 0-9 9" />
              <path d="M3 12a9 9 0 0 0 9-9" />
            </svg>
          </Button>
        </div>
      </div>

      {showCalendarView ? (
        <BillsCalendar initialBills={filteredBills} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSortChange('name')}
                  >
                    Bill
                    {sortField === 'name' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSortChange('amount')}
                  >
                    Amount
                    {sortField === 'amount' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSortChange('next_payment_date')}
                  >
                    Due Date
                    {sortField === 'next_payment_date' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  // Error message
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                        <p className="text-muted-foreground">{error}</p>
                        <Button variant="outline" className="mt-4" onClick={refreshBills}>
                          Try Again
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredBills.length === 0 ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-muted-foreground mb-2">
                          {searchQuery || statusFilter
                            ? "No bills match your filters."
                            : "You don't have any bills yet."}
                        </p>
                        {!searchQuery && !statusFilter && (
                          <Button variant="outline" className="mt-2" onClick={handleAddBill}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Your First Bill
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Bills list
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <div className="font-medium">{bill.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {bill.category?.name || "Uncategorized"}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(bill.amount_due)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {/* For paid bills, show the last paid date instead of next due date */}
                          {bill.status === 'paid' ? (
                            <span title={`Paid on: ${bill.last_paid_date}, Next due: ${bill.next_due_date}`}>
                              {formatDate(bill.last_paid_date || '')} (Paid)
                            </span>
                          ) : (
                            <span title={`Due date: ${bill.next_due_date}`}>
                              {formatDate(bill.next_due_date || '')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getBillStatusBadge(bill)}</TableCell>
                      <TableCell className="text-right">
                        {getBillStatus(bill) !== "paid" && (
                          <Button variant="ghost" size="icon" onClick={() => handlePayBill(bill)} title="Mark as paid">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEditBill(bill)} title="Edit bill">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBill(bill.id)} title="Delete bill">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          {!loading && filteredBills.length > 0 && (
            <div className="p-4 border-t text-sm text-muted-foreground">
              Showing {filteredBills.length} of {bills.length} bills
              {(searchQuery || statusFilter) && " (filtered)"}
            </div>
          )}
        </Card>
      )}

      <BillDialog 
        open={openDialog} 
        onOpenChange={setOpenDialog} 
        bill={selectedBill as any} 
        onSave={handleSaveBill} 
      />

      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this bill and remove it from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBill} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openPayDialog} onOpenChange={setOpenPayDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark bill as paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the bill as paid and update your payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPayBill}>Mark as Paid</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
