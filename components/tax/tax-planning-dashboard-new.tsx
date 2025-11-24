"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, FileText, PiggyBank, TrendingUp, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface TaxCategory {
  id: string
  name: string
  type: string
  color: string
}

interface TaxDeduction {
  id: string
  name: string
  amount: number
  max_amount: number
  categories: TaxCategory
}

interface TaxDocument {
  id: string
  name: string
  type: string
  status: string
  due_date: string
  categories: TaxCategory
}

interface TaxRecommendation {
  id: string
  type: string
  priority: string
  title: string
  description: string
  potential_savings: number
  action_items: string[]
  deadline: string
  is_completed: boolean
}

interface TaxTimelineItem {
  id: string
  title: string
  description: string
  due_date: string
  type: string
  is_completed: boolean
  is_recurring?: boolean
  recurrence_pattern?: string
}

interface TaxImpactPrediction {
  id: string
  scenario: string
  current_tax_burden: number
  predicted_tax_burden: number
  difference: number
}

interface TaxSummary {
  totalDeductions: number
  totalPotentialSavings: number
  pendingDocuments: number
  upcomingDeadlines: number
}

// Sample data for demonstration
const deductionsData: TaxDeduction[] = [
  {
    id: "1",
    name: "Mortgage Interest",
    amount: 8500,
    max_amount: 10000,
    categories: { id: "1", name: "Housing", type: "deduction", color: "#3b82f6" }
  },
  {
    id: "2",
    name: "Charitable Donations",
    amount: 2500,
    max_amount: 5000,
    categories: { id: "2", name: "Charity", type: "deduction", color: "#10b981" }
  },
  {
    id: "3",
    name: "Medical Expenses",
    amount: 3200,
    max_amount: 7500,
    categories: { id: "3", name: "Healthcare", type: "deduction", color: "#ef4444" }
  }
]

const documentsData: TaxDocument[] = [
  {
    id: "1",
    name: "W-2 Form",
    type: "Income",
    status: "completed",
    due_date: new Date(new Date().getFullYear(), 1, 15).toISOString(),
    categories: { id: "4", name: "Income", type: "document", color: "#f59e0b" }
  },
  {
    id: "2",
    name: "1099 Form",
    type: "Income",
    status: "pending",
    due_date: new Date(new Date().getFullYear(), 1, 31).toISOString(),
    categories: { id: "4", name: "Income", type: "document", color: "#f59e0b" }
  }
]

const recommendationsData: TaxRecommendation[] = [
  {
    id: "1",
    type: "deduction",
    priority: "high",
    title: "Maximize 401(k) Contributions",
    description: "Increase your pre-tax 401(k) contributions to reduce taxable income.",
    potential_savings: 2500,
    action_items: ["Contact HR to update contribution percentage"],
    deadline: new Date(new Date().getFullYear(), 11, 31).toISOString(),
    is_completed: false
  },
  {
    id: "2",
    type: "credit",
    priority: "medium",
    title: "Claim Home Office Deduction",
    description: "If you work from home, you may be eligible for home office deductions.",
    potential_savings: 1200,
    action_items: ["Calculate square footage of home office"],
    deadline: new Date(new Date().getFullYear(), 3, 15).toISOString(),
    is_completed: false
  }
]

const timelineData: TaxTimelineItem[] = [
  {
    id: "1",
    title: "File Q1 Estimated Taxes",
    description: "First quarter estimated tax payments due",
    due_date: new Date(new Date().getFullYear(), 3, 15).toISOString(),
    type: "deadline",
    is_completed: false
  },
  {
    id: "2",
    title: "File Q2 Estimated Taxes",
    description: "Second quarter estimated tax payments due",
    due_date: new Date(new Date().getFullYear(), 5, 15).toISOString(),
    type: "deadline",
    is_completed: false
  }
]

const predictionsData: TaxImpactPrediction[] = [
  {
    id: "1",
    scenario: "Increasing 401(k) Contributions",
    current_tax_burden: 15000,
    predicted_tax_burden: 13800,
    difference: -1200
  },
  {
    id: "2",
    scenario: "Starting a Side Business",
    current_tax_burden: 15000,
    predicted_tax_burden: 16500,
    difference: 1500
  }
]

export function TaxPlanningDashboard() {
  const [loading, setLoading] = useState(false)
  const [deductions] = useState<TaxDeduction[]>(deductionsData)
  const [documents] = useState<TaxDocument[]>(documentsData)
  const [recommendations] = useState<TaxRecommendation[]>(recommendationsData)
  const [timeline] = useState<TaxTimelineItem[]>(timelineData)
  const [predictions] = useState<TaxImpactPrediction[]>(predictionsData)
  const [summary] = useState<TaxSummary>({
    totalDeductions: 25000,
    totalPotentialSavings: 4500,
    pendingDocuments: 3,
    upcomingDeadlines: 2
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading tax data...</p>
        </div>
      </div>
    )
  }
  
  // Calculate upcoming deadlines
  const upcomingDeadlines = timeline
    .filter(item => !item.is_completed && new Date(item.due_date) > new Date())
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Deductions</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalDeductions)}</p>
              </div>
              <PiggyBank className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Potential Savings</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalPotentialSavings)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pending Documents</p>
                <p className="text-2xl font-bold">{summary.pendingDocuments}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Upcoming Deadlines</p>
                <p className="text-2xl font-bold">{summary.upcomingDeadlines}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">In the next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Content */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tax Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Recommendations</CardTitle>
              <CardDescription>Actionable suggestions to optimize your taxes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.slice(0, 2).map((rec) => (
                  <div key={rec.id} className="flex items-start space-x-4 p-3 border rounded-lg">
                    <div className="mt-1">
                      {rec.priority === "urgent" ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge variant={rec.priority === "urgent" ? "destructive" : "default"}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      {rec.potential_savings > 0 && (
                        <p className="text-sm font-medium text-green-600 mt-1">
                          Potential savings: {formatCurrency(rec.potential_savings)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">View All Recommendations</Button>
              </div>
            </CardContent>
          </Card>

          {/* Tax Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Timeline</CardTitle>
              <CardDescription>Upcoming tax deadlines and important dates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingDeadlines.map((item) => (
                  <div key={item.id} className="flex items-start space-x-4 p-3 border rounded-lg">
                    <div className="mt-1">
                      <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{item.title}</h4>
                        <Badge variant="outline">
                          {formatDate(item.due_date)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">View Full Timeline</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tax Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Documents</CardTitle>
              <CardDescription>Recent and pending tax documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-start space-x-4 p-3 border rounded-lg">
                    <div className="mt-1">
                      <FileText className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{doc.name}</h4>
                        <Badge variant={doc.status === "pending" ? "outline" : "secondary"}>
                          {doc.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Type: {doc.type}</p>
                      {doc.due_date && (
                        <p className="text-sm text-muted-foreground">
                          Due: {formatDate(doc.due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">Manage Documents</Button>
              </div>
            </CardContent>
          </Card>

          {/* Tax Deductions */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Deductions</CardTitle>
              <CardDescription>Track your tax deductions and credits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deductions.map((deduction) => (
                  <div key={deduction.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{deduction.name}</h4>
                      <Badge
                        style={{ backgroundColor: deduction.categories?.color }}
                      >
                        {deduction.categories?.name}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{formatCurrency(deduction.amount)}</span>
                        <span>{Math.round((deduction.amount / deduction.max_amount) * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                        <div
                          className="h-2 bg-green-500 rounded-full"
                          style={{ width: `${Math.min(100, (deduction.amount / deduction.max_amount) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(deduction.amount)} of {formatCurrency(deduction.max_amount)} maximum
                      </p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">View All Deductions</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
