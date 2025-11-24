"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { BudgetModelComparison } from "@/components/budgeting/budget-model-comparison"
import { BudgetModelDetails } from "@/components/budgeting/budget-model-details"

export default function BudgetModelsPage() {
  const [monthlyIncome, setMonthlyIncome] = useState<number>(5000)
  const [activeTab, setActiveTab] = useState<string>("comparison")
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  const budgetModels = [
    {
      id: "traditional",
      name: "Traditional Budget",
      description: "A simple budget that allocates money to different spending categories",
      bestFor: "Beginners who want a straightforward approach to budgeting",
      pros: ["Simple and easy to understand", "Flexible and adaptable", "Good starting point for budgeting beginners"],
      cons: [
        "May not provide enough structure for some people",
        "Doesn't emphasize specific financial goals",
        "Can be less effective for impulse spenders",
      ],
      allocation: [
        { category: "Housing", percentage: 30 },
        { category: "Food", percentage: 15 },
        { category: "Transportation", percentage: 10 },
        { category: "Utilities", percentage: 5 },
        { category: "Insurance", percentage: 5 },
        { category: "Savings", percentage: 10 },
        { category: "Debt Repayment", percentage: 10 },
        { category: "Entertainment", percentage: 5 },
        { category: "Personal Care", percentage: 5 },
        { category: "Miscellaneous", percentage: 5 },
      ],
    },
    {
      id: "50-30-20",
      name: "50/30/20 Rule",
      description: "Allocates 50% to needs, 30% to wants, and 20% to savings and debt repayment",
      bestFor: "People who want a simple, balanced approach to budgeting",
      pros: [
        "Simple and easy to remember",
        "Provides good balance between spending and saving",
        "Flexible within each category",
      ],
      cons: [
        "May not work in high-cost-of-living areas",
        "Doesn't account for varying debt levels",
        "Categories can be subjective (needs vs. wants)",
      ],
      allocation: [
        { category: "Needs (Housing, Utilities, Food, etc.)", percentage: 50 },
        { category: "Wants (Entertainment, Dining Out, etc.)", percentage: 30 },
        { category: "Savings & Debt Repayment", percentage: 20 },
      ],
    },
    {
      id: "zero-based",
      name: "Zero-Based Budget",
      description: "Allocates every dollar of income to a specific purpose until you reach zero",
      bestFor: "Detail-oriented people who want maximum control over their money",
      pros: [
        "Accounts for every dollar of income",
        "Provides maximum awareness of spending",
        "Helps eliminate wasteful spending",
      ],
      cons: [
        "Time-intensive to set up and maintain",
        "Requires regular monitoring and adjustments",
        "Can feel restrictive to some people",
      ],
      allocation: [
        { category: "Housing", percentage: 25 },
        { category: "Food", percentage: 15 },
        { category: "Transportation", percentage: 10 },
        { category: "Utilities", percentage: 5 },
        { category: "Insurance", percentage: 5 },
        { category: "Savings", percentage: 15 },
        { category: "Debt Repayment", percentage: 10 },
        { category: "Entertainment", percentage: 5 },
        { category: "Personal Care", percentage: 5 },
        { category: "Gifts/Donations", percentage: 3 },
        { category: "Miscellaneous", percentage: 2 },
      ],
    },
    {
      id: "envelope",
      name: "Envelope System",
      description: "Allocates cash to different envelopes for different spending categories",
      bestFor: "People who struggle with overspending and need physical boundaries",
      pros: [
        "Creates physical boundaries for spending",
        "Helps prevent overspending",
        "Makes budgeting tangible and real",
      ],
      cons: [
        "Inconvenient in an increasingly cashless society",
        "Risk of loss or theft of cash",
        "Requires regular trips to the bank",
      ],
      allocation: [
        { category: "Housing", percentage: 30 },
        { category: "Food", percentage: 15 },
        { category: "Transportation", percentage: 10 },
        { category: "Utilities", percentage: 5 },
        { category: "Entertainment", percentage: 5 },
        { category: "Clothing", percentage: 5 },
        { category: "Dining Out", percentage: 10 },
        { category: "Personal Care", percentage: 5 },
        { category: "Savings", percentage: 10 },
        { category: "Miscellaneous", percentage: 5 }
      ],
    },
  ]

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
    setMonthlyIncome(isNaN(value) ? 0 : value)
  }

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId)
    setActiveTab("details")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flexible Budget Models</h1>
          <p className="text-muted-foreground mt-2">
            Compare different budgeting approaches and find the one that works best for you
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/budgeting">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Budgeting
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Monthly Income</CardTitle>
          <CardDescription>
            Enter your monthly income to see how it would be allocated in different budget models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="monthly-income">Monthly Income (after tax)</Label>
              <Input
                id="monthly-income"
                value={monthlyIncome ? `$${monthlyIncome.toLocaleString()}` : ""}
                onChange={handleIncomeChange}
                placeholder="$5,000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">Model Comparison</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedModel}>
            Model Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <BudgetModelComparison
            models={budgetModels}
            monthlyIncome={monthlyIncome}
            onSelectModel={handleSelectModel}
          />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedModel && (
            <BudgetModelDetails
              model={budgetModels.find((model) => model.id === selectedModel)!}
              monthlyIncome={monthlyIncome}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

