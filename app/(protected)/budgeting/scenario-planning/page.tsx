"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Copy, Play, AlertCircle } from "lucide-react"
import Link from "next/link"
import { BudgetWaterfallChart } from "@/components/budgeting/budget-waterfall-chart"
import { getBudgets } from "@/app/actions/budgets"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ScenarioPlanningPage() {
  const [scenarios, setScenarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [budgetCategories, setBudgetCategories] = useState<any[]>([])
  
  // Fetch budgets and their categories on component mount
  useEffect(() => {
    async function fetchBudgetData() {
      try {
        setLoading(true)
        const budgets = await getBudgets()
        
        if (budgets && budgets.length > 0) {
          // Get the most recent budget
          const latestBudget = budgets[0]
          
          // Extract categories from the budget
          const categories = latestBudget.budget_category || []
          setBudgetCategories(categories)
          
          // Process categories and subcategories
          // First, separate parent categories and subcategories
          const parentCategories = categories.filter((cat: any) => !cat.parent_id)
          const subcategories = categories.filter((cat: any) => cat.parent_id)
          
          // Group subcategories by parent_id
          const subcategoriesByParent: Record<string, any[]> = {}
          subcategories.forEach((subcat: any) => {
            if (!subcategoriesByParent[subcat.parent_id]) {
              subcategoriesByParent[subcat.parent_id] = []
            }
            subcategoriesByParent[subcat.parent_id].push(subcat)
          })
          
          // Create baseline scenario from the budget with proper category hierarchy
          const baselineScenario = {
            id: "1",
            name: "Current Budget",
            description: "Your current budget allocation",
            isBaseline: true,
            income: latestBudget.income || 5000,
            expenses: parentCategories.map((cat: any) => {
              const subcats = subcategoriesByParent[cat.id] || []
              return {
                id: cat.id,
                name: cat.name || "Unnamed Category",
                amount: cat.amount_allocated || 0,
                subcategories: subcats.map((subcat: any) => ({
                  id: subcat.id,
                  name: subcat.name || "Unnamed Subcategory",
                  amount: subcat.amount_allocated || 0
                }))
              }
            })
          }
          
          // If no categories found, use default ones
          if (!categories || categories.length === 0) {
            baselineScenario.expenses = [
              { id: "e1", name: "Housing", amount: 1500 },
              { id: "e2", name: "Food", amount: 600 },
              { id: "e3", name: "Transportation", amount: 400 },
              { id: "e4", name: "Utilities", amount: 300 },
              { id: "e5", name: "Insurance", amount: 200 },
              { id: "e6", name: "Entertainment", amount: 250 },
              { id: "e7", name: "Savings", amount: 750 },
              { id: "e8", name: "Debt Repayment", amount: 500 },
              { id: "e9", name: "Miscellaneous", amount: 350 },
            ]
          }
          
          setScenarios([
            baselineScenario,
    {
      id: "2",
      name: "Debt Payoff Focus",
      description: "Prioritize debt repayment by reducing discretionary spending",
      isBaseline: false,
      income: latestBudget.income || 5000,
      expenses: generateDebtFocusScenario(categories, latestBudget.income || 5000)
    },
  ])
        } else {
          // No budgets found, use default scenarios
          setScenarios([
            {
              id: "1",
              name: "Current Budget",
              description: "Your current budget allocation",
              isBaseline: true,
              income: 5000,
              expenses: [
                { id: "e1", name: "Housing", amount: 1500 },
                { id: "e2", name: "Food", amount: 600 },
                { id: "e3", name: "Transportation", amount: 400 },
                { id: "e4", name: "Utilities", amount: 300 },
                { id: "e5", name: "Insurance", amount: 200 },
                { id: "e6", name: "Entertainment", amount: 250 },
                { id: "e7", name: "Savings", amount: 750 },
                { id: "e8", name: "Debt Repayment", amount: 500 },
                { id: "e9", name: "Miscellaneous", amount: 350 },
              ],
            },
            {
              id: "2",
              name: "Debt Payoff Focus",
              description: "Prioritize debt repayment by reducing discretionary spending",
              isBaseline: false,
              income: 5000,
              expenses: [
                { id: "e1", name: "Housing", amount: 1500 },
                { id: "e2", name: "Food", amount: 500 },
                { id: "e3", name: "Transportation", amount: 350 },
                { id: "e4", name: "Utilities", amount: 300 },
                { id: "e5", name: "Insurance", amount: 200 },
                { id: "e6", name: "Entertainment", amount: 150 },
                { id: "e7", name: "Savings", amount: 500 },
                { id: "e8", name: "Debt Repayment", amount: 1200 },
                { id: "e9", name: "Miscellaneous", amount: 300 },
              ],
            },
          ])
        }
      } catch (err) {
        console.error("Error fetching budget data:", err)
        setError("Failed to load budget data")
        // Set default scenarios
        setScenarios([
          {
            id: "1",
            name: "Current Budget",
            description: "Your current budget allocation",
            isBaseline: true,
            income: 5000,
            expenses: [
              { id: "e1", name: "Housing", amount: 1500 },
              { id: "e2", name: "Food", amount: 600 },
              { id: "e3", name: "Transportation", amount: 400 },
              { id: "e4", name: "Utilities", amount: 300 },
              { id: "e5", name: "Insurance", amount: 200 },
              { id: "e6", name: "Entertainment", amount: 250 },
              { id: "e7", name: "Savings", amount: 750 },
              { id: "e8", name: "Debt Repayment", amount: 500 },
              { id: "e9", name: "Miscellaneous", amount: 350 },
            ],
          },
          {
            id: "2",
            name: "Debt Payoff Focus",
            description: "Prioritize debt repayment by reducing discretionary spending",
            isBaseline: false,
            income: 5000,
            expenses: [
              { id: "e1", name: "Housing", amount: 1500 },
              { id: "e2", name: "Food", amount: 500 },
              { id: "e3", name: "Transportation", amount: 350 },
              { id: "e4", name: "Utilities", amount: 300 },
              { id: "e5", name: "Insurance", amount: 200 },
              { id: "e6", name: "Entertainment", amount: 150 },
              { id: "e7", name: "Savings", amount: 500 },
              { id: "e8", name: "Debt Repayment", amount: 1200 },
              { id: "e9", name: "Miscellaneous", amount: 300 },
            ],
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchBudgetData()
  }, [])

  const [activeScenarioId, setActiveScenarioId] = useState("1")
  const [activeTab, setActiveTab] = useState("edit")

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Calculate total expenses including subcategories
  const getTotalExpenses = (expenses: any[]) => {
    return expenses.reduce((sum, expense) => {
      // Add the main category amount
      let total = expense.amount || 0
      
      // Add subcategory amounts if they exist
      if (expense.subcategories && expense.subcategories.length > 0) {
        total += expense.subcategories.reduce((subSum: number, subcat: any) => {
          return subSum + (subcat.amount || 0)
        }, 0)
      }
      
      return sum + total
    }, 0)
  }

  // Calculate remaining money
  const getRemaining = (income: number, expenses: { id: string; name: string; amount: number }[]) => {
    return income - getTotalExpenses(expenses)
  }

  // Prepare data for waterfall chart
  const getWaterfallData = (scenario: typeof activeScenario) => {
    // Start with income
    const data = [
      { name: "Income", value: scenario.income, isIncome: true },
    ]
    
    // Add main categories and their subcategories
    scenario.expenses.forEach((expense) => {
      // Add the main category
      data.push({
        name: expense.name,
        value: -expense.amount,
      })
      
      // Add subcategories if they exist
      if (expense.subcategories && expense.subcategories.length > 0) {
        expense.subcategories.forEach((subcat: any) => {
          data.push({
            name: `${expense.name}: ${subcat.name}`,
            value: -subcat.amount,
            isSubcategory: true
          })
        })
      }
    })
    
    // Add the remaining amount
    data.push({
      name: "Remaining",
      value: getRemaining(scenario.income, scenario.expenses),
      isTotal: true,
    })

    return data
  }

  // Add a new scenario
  const addScenario = () => {
    const newId = (Math.max(...scenarios.map((s) => Number.parseInt(s.id))) + 1).toString()
    
    // Use existing budget categories if available
    const baseScenario = scenarios[0] // Use the baseline scenario as a template
    
    const newScenario = {
      id: newId,
      name: `New Scenario ${newId}`,
      description: "Description of your new budget scenario",
      isBaseline: false,
      income: baseScenario.income,
      expenses: baseScenario.expenses.map((expense: any) => {
        // Deep clone the expense object including subcategories
        const newExpense = {
          id: expense.id,
          name: expense.name,
          amount: expense.amount
        }
        
        // Clone subcategories if they exist
        if (expense.subcategories && expense.subcategories.length > 0) {
          newExpense.subcategories = expense.subcategories.map((subcat: any) => ({
            id: subcat.id,
            name: subcat.name,
            amount: subcat.amount
          }))
        }
        
        return newExpense
      })
    }

    setScenarios([...scenarios, newScenario])
    setActiveScenarioId(newId)
    setActiveTab("edit")
  }

  // Duplicate a scenario
  const duplicateScenario = (scenarioId: string) => {
    const scenarioToDuplicate = scenarios.find((s) => s.id === scenarioId)
    if (!scenarioToDuplicate) return

    const newId = (Math.max(...scenarios.map((s) => Number.parseInt(s.id))) + 1).toString()
    const newScenario = {
      ...scenarioToDuplicate,
      id: newId,
      name: `${scenarioToDuplicate.name} (Copy)`,
      isBaseline: false,
    }

    setScenarios([...scenarios, newScenario])
    setActiveScenarioId(newId)
    setActiveTab("edit")
  }

  // Delete a scenario
  const deleteScenario = (scenarioId: string) => {
    if (scenarios.length <= 1) return

    const updatedScenarios = scenarios.filter((s) => s.id !== scenarioId)
    setScenarios(updatedScenarios)

    if (activeScenarioId === scenarioId) {
      setActiveScenarioId(updatedScenarios[0].id)
    }
  }

  // Update scenario name
  const updateScenarioName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedScenarios = scenarios.map((s) => (s.id === activeScenarioId ? { ...s, name: e.target.value } : s))
    setScenarios(updatedScenarios)
  }

  // Update scenario description
  const updateScenarioDescription = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedScenarios = scenarios.map((s) =>
      s.id === activeScenarioId ? { ...s, description: e.target.value } : s,
    )
    setScenarios(updatedScenarios)
  }

  // Update scenario income
  const updateScenarioIncome = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
    const income = isNaN(value) ? 0 : value

    const updatedScenarios = scenarios.map((s) => (s.id === activeScenarioId ? { ...s, income } : s))
    setScenarios(updatedScenarios)
  }

  // Update expense amount
  const updateExpenseAmount = (expenseId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
    const amount = isNaN(value) ? 0 : value

    const updatedScenarios = scenarios.map((s) => {
      if (s.id === activeScenarioId) {
        const updatedExpenses = s.expenses.map((exp) => (exp.id === expenseId ? { ...exp, amount } : exp))
        return { ...s, expenses: updatedExpenses }
      }
      return s
    })

    setScenarios(updatedScenarios)
  }
  
  // Update subcategory amount
  const updateSubcategoryAmount = (parentId: string, subcatId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
    const amount = isNaN(value) ? 0 : value

    const updatedScenarios = scenarios.map((s) => {
      if (s.id === activeScenarioId) {
        const updatedExpenses = s.expenses.map((exp) => {
          if (exp.id === parentId && exp.subcategories) {
            const updatedSubcats = exp.subcategories.map((subcat: any) => 
              subcat.id === subcatId ? { ...subcat, amount } : subcat
            )
            return { ...exp, subcategories: updatedSubcats }
          }
          return exp
        })
        return { ...s, expenses: updatedExpenses }
      }
      return s
    })

    setScenarios(updatedScenarios)
  }

  // Helper function to generate debt focus scenario based on budget categories
  const generateDebtFocusScenario = (categories: any[], totalIncome: number) => {
    if (!categories || categories.length === 0) {
      // Default expenses if no categories
      return [
        { id: "e1", name: "Housing", amount: 1500 },
        { id: "e2", name: "Food", amount: 500 },
        { id: "e3", name: "Transportation", amount: 350 },
        { id: "e4", name: "Utilities", amount: 300 },
        { id: "e5", name: "Insurance", amount: 200 },
        { id: "e6", name: "Entertainment", amount: 150 },
        { id: "e7", name: "Savings", amount: 500 },
        { id: "e8", name: "Debt Repayment", amount: 1200 },
        { id: "e9", name: "Miscellaneous", amount: 300 },
      ]
    }
    
    // First, separate parent categories and subcategories
    const parentCategories = categories.filter((cat: any) => !cat.parent_id)
    const subcategories = categories.filter((cat: any) => cat.parent_id)
    
    // Group subcategories by parent_id
    const subcategoriesByParent: Record<string, any[]> = {}
    subcategories.forEach((subcat: any) => {
      if (!subcategoriesByParent[subcat.parent_id]) {
        subcategoriesByParent[subcat.parent_id] = []
      }
      subcategoriesByParent[subcat.parent_id].push(subcat)
    })
    
    // Create a modified version of the categories with debt repayment focus
    return parentCategories.map((cat: any) => {
      const category = {
        id: cat.id,
        name: cat.name || "Unnamed Category",
        amount: cat.amount_allocated || 0
      }
      
      // Get subcategories for this parent category
      const subcats = subcategoriesByParent[cat.id] || []
      
      // Apply debt focus strategy to main category
      // Reduce discretionary spending categories by 20-40%
      if (
        category.name.toLowerCase().includes("entertainment") || 
        category.name.toLowerCase().includes("dining") ||
        category.name.toLowerCase().includes("shopping") ||
        category.name.toLowerCase().includes("travel") ||
        category.name.toLowerCase().includes("recreation") ||
        category.name.toLowerCase().includes("miscellaneous")
      ) {
        category.amount = Math.round(category.amount * 0.6) // Reduce by 40%
      }
      
      // Increase debt repayment category by 100%
      if (
        category.name.toLowerCase().includes("debt") ||
        category.name.toLowerCase().includes("loan") ||
        category.name.toLowerCase().includes("payment")
      ) {
        category.amount = Math.round(category.amount * 2) // Double the amount
      }
      
      // Reduce savings slightly
      if (category.name.toLowerCase().includes("savings")) {
        category.amount = Math.round(category.amount * 0.8) // Reduce by 20%
      }
      
      // Process subcategories with the same rules
      if (subcats.length > 0) {
        category.subcategories = subcats.map((subcat: any) => {
          const subcategory = {
            id: subcat.id,
            name: subcat.name || "Unnamed Subcategory",
            amount: subcat.amount_allocated || 0
          }
          
          // Apply the same rules to subcategories
          if (
            subcategory.name.toLowerCase().includes("entertainment") || 
            subcategory.name.toLowerCase().includes("dining") ||
            subcategory.name.toLowerCase().includes("shopping") ||
            subcategory.name.toLowerCase().includes("travel") ||
            subcategory.name.toLowerCase().includes("recreation") ||
            subcategory.name.toLowerCase().includes("miscellaneous")
          ) {
            subcategory.amount = Math.round(subcategory.amount * 0.6) // Reduce by 40%
          }
          
          if (
            subcategory.name.toLowerCase().includes("debt") ||
            subcategory.name.toLowerCase().includes("loan") ||
            subcategory.name.toLowerCase().includes("payment")
          ) {
            subcategory.amount = Math.round(subcategory.amount * 2) // Double the amount
          }
          
          if (subcategory.name.toLowerCase().includes("savings")) {
            subcategory.amount = Math.round(subcategory.amount * 0.8) // Reduce by 20%
          }
          
          return subcategory
        })
      }
      
      return category
    })
  }

  // Apply scenario as the new budget
  const applyScenario = () => {
    // In a real app, this would save the scenario as the active budget
    alert(`Scenario "${activeScenario.name}" has been applied as your new budget!`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budget Scenario Planning</h1>
            <p className="text-muted-foreground mt-2">
              Test different budgeting strategies and see their impact on your finances
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/budgeting">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Budgeting
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading budget data...</p>
          </div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budget Scenario Planning</h1>
            <p className="text-muted-foreground mt-2">
              Test different budgeting strategies and see their impact on your finances
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/budgeting">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Budgeting
            </Link>
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}. Using default budget scenarios instead.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Scenario Planning</h1>
          <p className="text-muted-foreground mt-2">
            Test different budgeting strategies and see their impact on your finances
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/budgeting">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Budgeting
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-64 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Scenarios</CardTitle>
              <CardDescription>Create and compare different budget scenarios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                    activeScenarioId === scenario.id ? "bg-primary/10" : "hover:bg-muted"
                  }`}
                  onClick={() => setActiveScenarioId(scenario.id)}
                >
                  <div>
                    <p className="font-medium">{scenario.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {scenario.isBaseline
                        ? "Baseline"
                        : `${formatCurrency(getRemaining(scenario.income, scenario.expenses))} remaining`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        duplicateScenario(scenario.id)
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {!scenario.isBaseline && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteScenario(scenario.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full mt-2" onClick={addScenario}>
                <Plus className="mr-2 h-4 w-4" />
                New Scenario
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={applyScenario} disabled={activeScenario.isBaseline}>
                <Play className="mr-2 h-4 w-4" />
                Apply This Scenario
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{activeScenario.name}</CardTitle>
              <CardDescription>{activeScenario.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Income</p>
                  <p className="text-2xl font-bold">{formatCurrency(activeScenario.income)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold">{formatCurrency(getTotalExpenses(activeScenario.expenses))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p
                    className={`text-2xl font-bold ${
                      getRemaining(activeScenario.income, activeScenario.expenses) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(getRemaining(activeScenario.income, activeScenario.expenses))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="edit">Edit Scenario</TabsTrigger>
              <TabsTrigger value="visualize">Visualize Impact</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Scenario Details</CardTitle>
                  <CardDescription>Edit the details of your budget scenario</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="scenario-name">Scenario Name</Label>
                      <Input
                        id="scenario-name"
                        value={activeScenario.name}
                        onChange={updateScenarioName}
                        disabled={activeScenario.isBaseline}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-description">Description</Label>
                      <Input
                        id="scenario-description"
                        value={activeScenario.description}
                        onChange={updateScenarioDescription}
                        disabled={activeScenario.isBaseline}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthly-income">Monthly Income</Label>
                    <Input
                      id="monthly-income"
                      value={formatCurrency(activeScenario.income)}
                      onChange={updateScenarioIncome}
                      disabled={activeScenario.isBaseline}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Allocation</CardTitle>
                  <CardDescription>Adjust how your income is allocated across different categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeScenario.expenses.map((expense) => (
                      <div key={expense.id} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-3 items-center">
                          <Label htmlFor={`expense-${expense.id}`} className="sm:text-right font-medium">
                            {expense.name}
                          </Label>
                          <div className="sm:col-span-2">
                            <Input
                              id={`expense-${expense.id}`}
                              value={formatCurrency(expense.amount)}
                              onChange={(e) => updateExpenseAmount(expense.id, e)}
                              disabled={activeScenario.isBaseline}
                            />
                          </div>
                        </div>
                        
                        {/* Render subcategories if they exist */}
                        {expense.subcategories && expense.subcategories.length > 0 && (
                          <div className="ml-6 space-y-2 border-l-2 pl-4 border-muted">
                            {expense.subcategories.map((subcat: any) => (
                              <div key={subcat.id} className="grid gap-4 sm:grid-cols-3 items-center">
                                <Label htmlFor={`subexpense-${subcat.id}`} className="sm:text-right text-sm">
                                  {subcat.name}
                                </Label>
                                <div className="sm:col-span-2">
                                  <Input
                                    id={`subexpense-${subcat.id}`}
                                    value={formatCurrency(subcat.amount)}
                                    onChange={(e) => updateSubcategoryAmount(expense.id, subcat.id, e)}
                                    disabled={activeScenario.isBaseline}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visualize" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Budget Waterfall</CardTitle>
                  <CardDescription>
                    Visualize how your income flows through different expense categories
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-96">
                  <BudgetWaterfallChart data={getWaterfallData(activeScenario)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Impact</CardTitle>
                  <CardDescription>How this scenario affects your financial goals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="space-y-2">
                      <p className="font-medium">Savings Rate</p>
                      <p className="text-2xl">
                        {(
                          ((activeScenario.expenses.find((e) => e.name === "Savings")?.amount || 0) /
                            activeScenario.income) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {((activeScenario.expenses.find((e) => e.name === "Savings")?.amount || 0) /
                          activeScenario.income) *
                          100 >=
                        20
                          ? "Excellent"
                          : "Needs improvement"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-medium">Debt Repayment</p>
                      <p className="text-2xl">
                        {(
                          ((activeScenario.expenses.find((e) => e.name === "Debt Repayment")?.amount || 0) /
                            activeScenario.income) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {((activeScenario.expenses.find((e) => e.name === "Debt Repayment")?.amount || 0) /
                          activeScenario.income) *
                          100 >=
                        15
                          ? "Aggressive payoff"
                          : "Standard pace"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-medium">Discretionary Spending</p>
                      <p className="text-2xl">
                        {(
                          (((activeScenario.expenses.find((e) => e.name === "Entertainment")?.amount || 0) +
                            (activeScenario.expenses.find((e) => e.name === "Miscellaneous")?.amount || 0)) /
                            activeScenario.income) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(((activeScenario.expenses.find((e) => e.name === "Entertainment")?.amount || 0) +
                          (activeScenario.expenses.find((e) => e.name === "Miscellaneous")?.amount || 0)) /
                          activeScenario.income) *
                          100 <=
                        15
                          ? "Well controlled"
                          : "Consider reducing"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

