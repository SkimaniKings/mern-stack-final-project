"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Edit, Save } from "lucide-react"
import { BudgetPieChart } from "@/components/budgeting/budget-pie-chart"
import { BudgetCategoryTable } from "@/components/budgeting/budget-category-table"

interface AIBudgetResultProps {
  budget: {
    monthlyIncome: number
    categories: {
      name: string
      amount: number
      percentage: number
    }[]
    savingsGoal: {
      name: string
      targetAmount: number
      currentAmount: number
      monthlyContribution: number
      estimatedCompletionDate: string
    }
    recommendations: string[]
  }
}

export function AIBudgetResult({ budget }: AIBudgetResultProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const savingsProgress = (budget.savingsGoal.currentAmount / budget.savingsGoal.targetAmount) * 100

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Your Personalized Budget</h2>
          <p className="text-muted-foreground">Based on your {formatCurrency(budget.monthlyIncome)} monthly income</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Adjust
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save Budget
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget Allocation</CardTitle>
            <CardDescription>How your income is distributed across categories</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <BudgetPieChart categories={budget.categories} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{budget.savingsGoal.name}</CardTitle>
            <CardDescription>
              {formatCurrency(budget.savingsGoal.currentAmount)} of {formatCurrency(budget.savingsGoal.targetAmount)}{" "}
              saved
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={savingsProgress} className="h-2 w-full" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Contribution</p>
                <p className="text-xl font-medium">{formatCurrency(budget.savingsGoal.monthlyContribution)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Completion</p>
                <p className="text-xl font-medium">
                  {new Date(budget.savingsGoal.estimatedCompletionDate).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">AI Recommendations</h3>
              <ul className="space-y-1 text-sm">
                {budget.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
                      {index + 1}
                    </div>
                    <p>{recommendation}</p>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Budget Categories</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Budget Categories</CardTitle>
              <CardDescription>Detailed breakdown of your monthly budget</CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetCategoryTable categories={budget.categories} monthlyIncome={budget.monthlyIncome} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
              <CardDescription>How your budget is distributed throughout the month</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Monthly breakdown visualization will be implemented here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

