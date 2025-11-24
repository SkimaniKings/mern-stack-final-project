"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Check, Download, Eye } from "lucide-react"
import Link from "next/link"
import { BudgetPieChart } from "@/components/budgeting/budget-pie-chart"
import { BudgetCategoryTable } from "@/components/budgeting/budget-category-table"

export default function BudgetTemplatesPage() {
  const [monthlyIncome, setMonthlyIncome] = useState<number>(5000)
  const [activeTab, setActiveTab] = useState<string>("life-events")
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
    setMonthlyIncome(isNaN(value) ? 0 : value)
  }

  const lifeEventTemplates = [
    {
      id: "wedding",
      name: "Wedding Planning",
      description: "Budget template for planning and saving for a wedding",
      icon: "💍",
      categories: [
        { name: "Venue", percentage: 40 },
        { name: "Catering", percentage: 20 },
        { name: "Attire", percentage: 10 },
        { name: "Photography", percentage: 10 },
        { name: "Decorations", percentage: 5 },
        { name: "Music/Entertainment", percentage: 5 },
        { name: "Invitations", percentage: 3 },
        { name: "Flowers", percentage: 5 },
        { name: "Miscellaneous", percentage: 2 },
      ],
    },
    {
      id: "baby",
      name: "New Baby",
      description: "Budget for preparing for and raising a newborn in the first year",
      icon: "👶",
      categories: [
        { name: "Nursery Setup", percentage: 15 },
        { name: "Diapers & Wipes", percentage: 20 },
        { name: "Formula/Feeding", percentage: 15 },
        { name: "Clothing", percentage: 10 },
        { name: "Childcare", percentage: 25 },
        { name: "Healthcare", percentage: 5 },
        { name: "Toys & Books", percentage: 5 },
        { name: "Emergency Fund", percentage: 5 },
      ],
    },
    {
      id: "home",
      name: "Home Purchase",
      description: "Budget for saving for and purchasing a new home",
      icon: "🏠",
      categories: [
        { name: "Down Payment", percentage: 60 },
        { name: "Closing Costs", percentage: 10 },
        { name: "Moving Expenses", percentage: 5 },
        { name: "New Furniture", percentage: 10 },
        { name: "Home Repairs", percentage: 5 },
        { name: "Utilities Setup", percentage: 2 },
        { name: "Emergency Fund", percentage: 8 },
      ],
    },
    {
      id: "college",
      name: "College Savings",
      description: "Long-term budget for saving for a child's college education",
      icon: "🎓",
      categories: [
        { name: "529 Plan", percentage: 70 },
        { name: "Savings Account", percentage: 15 },
        { name: "Investment Account", percentage: 10 },
        { name: "Books & Supplies Fund", percentage: 5 },
      ],
    },
  ]

  const incomeTemplates = [
    {
      id: "high-income",
      name: "High Income",
      description: "Optimized budget for high income earners ($100k+)",
      icon: "💰",
      categories: [
        { name: "Housing", percentage: 25 },
        { name: "Transportation", percentage: 10 },
        { name: "Food", percentage: 10 },
        { name: "Utilities", percentage: 5 },
        { name: "Insurance", percentage: 5 },
        { name: "Retirement", percentage: 15 },
        { name: "Investments", percentage: 10 },
        { name: "Entertainment", percentage: 5 },
        { name: "Travel", percentage: 5 },
        { name: "Charity", percentage: 5 },
        { name: "Miscellaneous", percentage: 5 },
      ],
    },
    {
      id: "moderate-income",
      name: "Moderate Income",
      description: "Balanced budget for moderate income earners ($50k-$100k)",
      icon: "💵",
      categories: [
        { name: "Housing", percentage: 30 },
        { name: "Transportation", percentage: 10 },
        { name: "Food", percentage: 12 },
        { name: "Utilities", percentage: 5 },
        { name: "Insurance", percentage: 5 },
        { name: "Retirement", percentage: 10 },
        { name: "Savings", percentage: 10 },
        { name: "Entertainment", percentage: 5 },
        { name: "Personal Care", percentage: 5 },
        { name: "Debt Repayment", percentage: 5 },
        { name: "Miscellaneous", percentage: 3 },
      ],
    },
    {
      id: "low-income",
      name: "Lower Income",
      description: "Practical budget for lower income earners (under $50k)",
      icon: "💸",
      categories: [
        { name: "Housing", percentage: 35 },
        { name: "Transportation", percentage: 10 },
        { name: "Food", percentage: 15 },
        { name: "Utilities", percentage: 10 },
        { name: "Insurance", percentage: 5 },
        { name: "Savings", percentage: 5 },
        { name: "Entertainment", percentage: 5 },
        { name: "Personal Care", percentage: 5 },
        { name: "Debt Repayment", percentage: 5 },
        { name: "Miscellaneous", percentage: 5 },
      ],
    },
    {
      id: "variable-income",
      name: "Variable Income",
      description: "Budget for freelancers or those with irregular income",
      icon: "📊",
      categories: [
        { name: "Essential Expenses", percentage: 50 },
        { name: "Tax Savings", percentage: 15 },
        { name: "Emergency Fund", percentage: 10 },
        { name: "Retirement", percentage: 10 },
        { name: "Business Expenses", percentage: 5 },
        { name: "Discretionary", percentage: 10 },
      ],
    },
  ]

  const goalTemplates = [
    {
      id: "debt-free",
      name: "Debt Freedom",
      description: "Budget focused on eliminating debt quickly",
      icon: "🔓",
      categories: [
        { name: "Housing", percentage: 25 },
        { name: "Transportation", percentage: 10 },
        { name: "Food", percentage: 10 },
        { name: "Utilities", percentage: 5 },
        { name: "Insurance", percentage: 5 },
        { name: "Debt Repayment", percentage: 30 },
        { name: "Emergency Fund", percentage: 5 },
        { name: "Entertainment", percentage: 3 },
        { name: "Personal Care", percentage: 3 },
        { name: "Miscellaneous", percentage: 4 },
      ],
    },
    {
      id: "early-retirement",
      name: "Early Retirement",
      description: "Budget optimized for retiring early (FIRE)",
      icon: "🏝️",
      categories: [
        { name: "Housing", percentage: 25 },
        { name: "Transportation", percentage: 5 },
        { name: "Food", percentage: 10 },
        { name: "Utilities", percentage: 5 },
        { name: "Insurance", percentage: 5 },
        { name: "Retirement", percentage: 30 },
        { name: "Investments", percentage: 10 },
        { name: "Entertainment", percentage: 3 },
        { name: "Personal Care", percentage: 3 },
        { name: "Miscellaneous", percentage: 4 },
      ],
    },
    {
      id: "travel",
      name: "Travel Fund",
      description: "Budget for saving for and enjoying travel experiences",
      icon: "✈️",
      categories: [
        { name: "Housing", percentage: 25 },
        { name: "Transportation", percentage: 10 },
        { name: "Food", percentage: 10 },
        { name: "Utilities", percentage: 5 },
        { name: "Insurance", percentage: 5 },
        { name: "Retirement", percentage: 10 },
        { name: "Travel Savings", percentage: 20 },
        { name: "Entertainment", percentage: 5 },
        { name: "Personal Care", percentage: 5 },
        { name: "Miscellaneous", percentage: 5 },
      ],
    },
    {
      id: "minimalist",
      name: "Minimalist Living",
      description: "Budget for a simplified, low-consumption lifestyle",
      icon: "🧘",
      categories: [
        { name: "Housing", percentage: 25 },
        { name: "Transportation", percentage: 5 },
        { name: "Food", percentage: 15 },
        { name: "Utilities", percentage: 5 },
        { name: "Insurance", percentage: 5 },
        { name: "Savings", percentage: 30 },
        { name: "Entertainment", percentage: 5 },
        { name: "Personal Care", percentage: 5 },
        { name: "Charity", percentage: 5 },
      ],
    },
  ]

  const getTemplates = () => {
    switch (activeTab) {
      case "life-events":
        return lifeEventTemplates
      case "income-levels":
        return incomeTemplates
      case "financial-goals":
        return goalTemplates
      default:
        return lifeEventTemplates
    }
  }

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template)
  }

  const handleUseTemplate = () => {
    // In a real app, this would save the template as a new budget
    alert(`Template "${selectedTemplate.name}" has been applied as your new budget!`)
  }

  // Convert template categories to format expected by BudgetPieChart
  const getChartData = (template: any) => {
    if (!template) return []

    return template.categories.map((category: any) => ({
      name: category.name,
      amount: (monthlyIncome * category.percentage) / 100,
      percentage: category.percentage,
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Templates</h1>
          <p className="text-muted-foreground mt-2">
            Pre-made budgets for specific life events and financial situations
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
            Enter your monthly income to see how it would be allocated in different budget templates
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

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="life-events">Life Events</TabsTrigger>
              <TabsTrigger value="income-levels">Income Levels</TabsTrigger>
              <TabsTrigger value="financial-goals">Financial Goals</TabsTrigger>
            </TabsList>

            <div className="space-y-2">
              {getTemplates().map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id ? "border-primary" : ""
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl">{template.icon}</div>
                        <CardTitle>{template.name}</CardTitle>
                      </div>
                      {selectedTemplate?.id === template.id && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </Tabs>
        </div>

        <div className="md:col-span-2">
          {selectedTemplate ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="text-2xl">{selectedTemplate.icon}</div>
                  <div>
                    <CardTitle>{selectedTemplate.name} Budget</CardTitle>
                    <CardDescription>{selectedTemplate.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-80">
                  <BudgetPieChart categories={getChartData(selectedTemplate)} />
                </div>

                <BudgetCategoryTable categories={getChartData(selectedTemplate)} monthlyIncome={monthlyIncome} />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Template
                </Button>
                <Button onClick={handleUseTemplate}>
                  <Check className="mr-2 h-4 w-4" />
                  Use This Template
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Select a Template</h3>
                <p className="text-muted-foreground mt-2">Choose a budget template from the left to preview it here</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

