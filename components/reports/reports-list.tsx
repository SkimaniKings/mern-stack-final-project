"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Report, deleteReport, getReportById } from "@/app/actions/reports"
import { fetchReportData } from "@/app/actions/fetch-report-data"
import { format } from "date-fns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { FileDown, Trash2, AlertCircle, CheckCircle, Clock, Loader2, FileText } from "lucide-react"
import { ReportDownload } from "./report-download"
import { generateReportByFormat, downloadReport } from "@/lib/report-generators"

interface ReportsListProps {
  reports: Report[]
}

export function ReportsList({ reports }: ReportsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  // Fallback sample data if no real data is available
  const getFallbackData = (reportType: string) => {
    switch (reportType) {
      case 'overview':
        return [
          { date: '2025-04-01', category: 'Income', amount: 5000, description: 'Salary' },
          { date: '2025-04-05', category: 'Housing', amount: -1500, description: 'Rent' },
          { date: '2025-04-10', category: 'Utilities', amount: -120, description: 'Electricity' },
          { date: '2025-04-15', category: 'Food', amount: -350, description: 'Groceries' },
          { date: '2025-04-20', category: 'Transportation', amount: -200, description: 'Gas' }
        ];
      case 'income-expense':
        return [
          { date: '2025-04-01', category: 'Salary', amount: 5000, type: 'income' },
          { date: '2025-04-15', category: 'Freelance', amount: 1200, type: 'income' },
          { date: '2025-04-05', category: 'Housing', amount: 1500, type: 'expense' },
          { date: '2025-04-10', category: 'Utilities', amount: 120, type: 'expense' },
          { date: '2025-04-15', category: 'Food', amount: 350, type: 'expense' }
        ];
      case 'net-worth':
        return [
          { name: 'Checking Account', type: 'asset', value: 5000, category: 'Cash' },
          { name: 'Savings Account', type: 'asset', value: 15000, category: 'Cash' },
          { name: 'Investment Portfolio', type: 'asset', value: 50000, category: 'Investments' },
          { name: 'Home', type: 'asset', value: 350000, category: 'Real Estate' },
          { name: 'Car Loan', type: 'liability', value: 12000, category: 'Loans' },
          { name: 'Mortgage', type: 'liability', value: 250000, category: 'Loans' },
          { name: 'Credit Card', type: 'liability', value: 3000, category: 'Debt' }
        ];
      case 'investments':
        return [
          { ticker: 'AAPL', name: 'Apple Inc.', shares: 10, price: 175.50, value: 1755.00, cost_basis: 1500.00 },
          { ticker: 'MSFT', name: 'Microsoft Corp.', shares: 5, price: 350.25, value: 1751.25, cost_basis: 1600.00 },
          { ticker: 'GOOGL', name: 'Alphabet Inc.', shares: 3, price: 2800.00, value: 8400.00, cost_basis: 7500.00 },
          { ticker: 'AMZN', name: 'Amazon.com Inc.', shares: 2, price: 3200.00, value: 6400.00, cost_basis: 5800.00 },
          { ticker: 'TSLA', name: 'Tesla Inc.', shares: 8, price: 950.00, value: 7600.00, cost_basis: 8000.00 }
        ];
      default:
        return [{ message: 'No data available' }];
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      // Show loading toast
      toast.loading("Preparing report...");
      
      // Fetch real data from the server
      let data = await fetchReportData(report.type, report.time_range);
      
      // If no data was returned, show a message instead of using fallback data
      if (!data || data.length === 0) {
        console.warn(`No real data found for ${report.type} report`);
        toast.dismiss();
        toast.error("No data found", {
          description: "No data was found for this report type. Please try a different report or time range."
        });
        return; // Exit the function early
      } else {
        console.log(`Using real data for ${report.type} report: ${data.length} records`);
      }
      
      // Generate the report file based on format
      const blob = generateReportByFormat(data, report);
      
      // Create a filename
      const extension = getFileExtension(report.format);
      const filename = `${formatFilename(report.title)}_${formatDate(new Date())}.${extension}`;
      
      // Download the file
      downloadReport(blob, filename);
      
      // Dismiss loading toast and show success
      toast.dismiss();
      toast.success("Report downloaded", {
        description: `${report.title} has been downloaded`
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.dismiss();
      toast.error("Failed to download report", {
        description: "There was an error generating your report. Please try again."
      });
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteReport(id)
      toast.success("Report deleted", {
        description: "The report has been successfully deleted"
      })
      router.refresh()
    } catch (error) {
      console.error("Error deleting report:", error)
      toast.error("Failed to delete report", {
        description: "Please try again later"
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusBadge = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>
      case 'processing':
        return <Badge variant="secondary" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processing</Badge>
      case 'completed':
        return <Badge variant="success" className="flex items-center gap-1 bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> Completed</Badge>
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Reports</CardTitle>
          <CardDescription>
            You haven't generated any reports yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              Use the generator to create your first report
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Reports</CardTitle>
        <CardDescription>
          View and download your generated reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">
                  {report.title}
                  {report.description && (
                    <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                  )}
                </TableCell>
                <TableCell>{formatReportType(report.type)}</TableCell>
                <TableCell className="uppercase">{report.format}</TableCell>
                <TableCell>{format(new Date(report.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>{getStatusBadge(report.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(report)}
                      title="Download Report"
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={deletingId === report.id}
                        >
                          {deletingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Report</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this report? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault()
                              handleDelete(report.id)
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// Helper functions
function formatReportType(type: Report['type']): string {
  switch (type) {
    case 'overview':
      return 'Financial Overview'
    case 'income-expense':
      return 'Income & Expenses'
    case 'net-worth':
      return 'Net Worth'
    case 'investments':
      return 'Investment Performance'
    case 'income-sources':
      return 'Income Sources'
    case 'expense-trends':
      return 'Expense Trends'
    case 'debt-analysis':
      return 'Debt Analysis'
    case 'subscriptions':
      return 'Subscriptions'
    case 'budget-analysis':
      return 'Budget Analysis'
    case 'spending-categories':
      return 'Spending Categories'
    default:
      return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

function getFileExtension(format: string): string {
  switch (format) {
    case 'pdf':
      return 'pdf'
    case 'csv':
      return 'csv'
    case 'excel':
      return 'xlsx'
    default:
      return 'txt'
  }
}

function formatFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
