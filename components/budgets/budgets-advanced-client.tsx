"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Target, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils/formatting"
import { BudgetDashboard } from "@/components/budgets/budget-dashboard"
import { QuickActionsWrapper } from "@/components/budgets/quick-actions-wrapper"
import { BudgetTemplatesWrapper } from "@/components/budgets/templates/budget-templates-wrapper"

interface BudgetsAdvancedClientProps {
  categories: any[]
  budgets: any[]
  hasBudgets: boolean
  totalBudgeted: number
  totalAllocated: number
  overallAllocationPercentage: number
}

export function BudgetsAdvancedClient({
  categories,
  budgets,
  hasBudgets,
  totalBudgeted,
  totalAllocated,
  overallAllocationPercentage
}: BudgetsAdvancedClientProps) {
  // State for the selected budget ID
  const [selectedBudgetId, setSelectedBudgetId] = useState(hasBudgets ? budgets[0]?.id : "")
  
  // Add debugging to check budget data structure
  console.log('BudgetsAdvancedClient: Received budgets:', budgets);
  
  // Process budgets to ensure they have valid amounts
  const processedBudgets = budgets.map(budget => {
    // Log each budget to debug
    console.log(`Budget ${budget.id} (${budget.name}):`, {
      amount: budget.amount,
      type: typeof budget.amount,
      parsed: Number(budget.amount),
      income: budget.income,
      incomeType: typeof budget.income
    });
    
    // Return budget with guaranteed numeric amount
    return {
      ...budget,
      displayAmount: budget.income || budget.amount || 0
    };
  });
  
  // Derive categories of selected budget
  // keeping categories logic in case needed elsewhere
  const selectedBudgetCategories = useMemo(() => {
    const sel = budgets.find(b => b.id === selectedBudgetId)
    return sel?.categories ?? []
  }, [selectedBudgetId, budgets])

  // Handle budget selection change
  const handleBudgetChange = (newBudgetId: string) => {
    console.log('Parent component: Budget selection changed to:', newBudgetId)
    setSelectedBudgetId(newBudgetId)
  }

  return (
    <div className="space-y-6">
      {/* Top Row - Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="h-[180px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LineChart className="h-5 w-5" />
              Budget Overview
            </CardTitle>
            <CardDescription>
              Total Allocation Across All Budgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Budgeted: {formatCurrency(totalBudgeted)}</span>
                <span>Allocated: {formatCurrency(totalAllocated)}</span>
              </div>
              <Progress 
                value={overallAllocationPercentage} 
                className="h-2" 
              />
              <p className="text-sm text-muted-foreground">
                {(overallAllocationPercentage || 0).toFixed(1)}% of total budget allocated
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-[180px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Budget Summary
            </CardTitle>
            <CardDescription>
              Active Budgets: {hasBudgets ? budgets.length : 0}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasBudgets ? (
              <div className="space-y-2">
                <div className="text-lg font-medium">
                  Most Recent: {budgets[0].name}
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/budgets/${budgets[0].id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/budgets/manage/create">
                      Create New Budget
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-muted-foreground mb-2">No budgets created yet</p>
                <Button asChild size="sm">
                  <Link href="/budgets/manage/create">
                    Create Your First Budget
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - Quick Actions and Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="h-[400px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <QuickActionsWrapper />
          </CardContent>
        </Card>

        <Card className="h-[400px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Budget Templates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <BudgetTemplatesWrapper />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Budget Allocation */}
      {hasBudgets ? (
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Budget Allocation</h3>
              {budgets.length > 1 && (
                <Select 
                  value={selectedBudgetId} 
                  onValueChange={handleBudgetChange}
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select a budget" />
                  </SelectTrigger>
                  <SelectContent>
                    {processedBudgets.map((budget) => (
                      <SelectItem key={budget.id} value={budget.id}>
                        {budget.name} ({formatCurrency(budget.displayAmount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <BudgetDashboard key={selectedBudgetId} budgetId={selectedBudgetId} />
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Budget Allocation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Target className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Budget Data Available</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first budget to see detailed allocation visualizations and insights.
            </p>
            <Button asChild>
              <Link href="/budgets/manage/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Budget
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
