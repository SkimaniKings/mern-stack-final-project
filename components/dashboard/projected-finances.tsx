"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { CalendarIcon, ArrowUpIcon, ArrowDownIcon, RefreshCcwIcon } from "lucide-react"
import { ProjectedFinances, ProjectedIncomeSource, ProjectedExpense } from "@/lib/projection-utils"

interface ProjectedFinancesProps {
  projectedFinances: ProjectedFinances
}

export function ProjectedFinancesWidget({ projectedFinances }: ProjectedFinancesProps) {
  const [activeTab, setActiveTab] = useState("overview")
  
  const {
    projectedIncome,
    projectedExpenses,
    netCashflow,
    savingsRate,
    projectedIncomeBreakdown,
    projectedExpensesBreakdown
  } = projectedFinances

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not scheduled"
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getFrequencyBadge = (frequency: string) => {
    const color = {
      daily: "bg-red-100 text-red-800",
      weekly: "bg-blue-100 text-blue-800",
      biweekly: "bg-indigo-100 text-indigo-800",
      monthly: "bg-purple-100 text-purple-800",
      quarterly: "bg-amber-100 text-amber-800",
      annually: "bg-emerald-100 text-emerald-800"
    }[frequency.toLowerCase()] || "bg-gray-100 text-gray-800"

    return (
      <Badge className={color} variant="outline">
        {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
      </Badge>
    )
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Projected Finances</CardTitle>
        <CardDescription>
          Your projected monthly income and expenses based on recurring transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="income">Income Sources</TabsTrigger>
            <TabsTrigger value="expenses">Recurring Expenses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Projected Monthly Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <ArrowUpIcon className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-2xl font-bold">{formatCurrency(projectedIncome)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From {projectedIncomeBreakdown.length} active income sources
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Projected Monthly Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <ArrowDownIcon className="h-4 w-4 mr-2 text-red-500" />
                    <span className="text-2xl font-bold">{formatCurrency(projectedExpenses)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From {projectedExpensesBreakdown.length} recurring expenses
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Net Monthly Cashflow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <RefreshCcwIcon className="h-4 w-4 mr-2 text-blue-500" />
                    <span className={`text-2xl font-bold ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(netCashflow)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Savings rate: {savingsRate.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="income">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead className="text-right">Monthly Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectedIncomeBreakdown.map((source: ProjectedIncomeSource) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {source.sourceType.charAt(0).toUpperCase() + source.sourceType.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getFrequencyBadge(source.frequency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                        {formatDate(source.nextPaymentDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(source.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {projectedIncomeBreakdown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No recurring income sources found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
          
          <TabsContent value="expenses">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Due Date</TableHead>
                  <TableHead className="text-right">Monthly Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectedExpensesBreakdown.map((expense: ProjectedExpense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {expense.title}
                      {expense.frequency !== 'monthly' && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center">
                          <RefreshCcwIcon className="h-3 w-3 mr-1 text-purple-500" />
                          {expense.frequencyText} ({formatCurrency(expense.originalAmount)})
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getFrequencyBadge(expense.frequency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                        {formatDate(expense.nextDueDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                      {expense.frequency !== 'monthly' && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Monthly equivalent
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {projectedExpensesBreakdown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No recurring expenses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
