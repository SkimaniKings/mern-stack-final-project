"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, AlertTriangle, Check } from "lucide-react"

interface BudgetCategory {
  id: string
  name: string
  budgeted: number
  actual: number
  subcategories?: BudgetCategory[]
}

interface VarianceAnalysisDashboardProps {
  categories: BudgetCategory[]
  period: string
}

export function VarianceAnalysisDashboard({ categories, period }: VarianceAnalysisDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const calculateVariance = (budgeted: number, actual: number) => {
    return actual - budgeted
  }

  const calculateVariancePercentage = (budgeted: number, actual: number) => {
    if (budgeted === 0) return 0
    return ((actual - budgeted) / budgeted) * 100
  }

  const getTotalBudgeted = (categories: BudgetCategory[]) => {
    return categories.reduce((sum, category) => sum + category.budgeted, 0)
  }

  const getTotalActual = (categories: BudgetCategory[]) => {
    return categories.reduce((sum, category) => sum + category.actual, 0)
  }

  const handleCategorySelect = (category: BudgetCategory) => {
    setSelectedCategory(category)
    setActiveTab("details")
  }

  const handleBackToOverview = () => {
    setSelectedCategory(null)
    setActiveTab("overview")
  }

  const totalBudgeted = getTotalBudgeted(categories)
  const totalActual = getTotalActual(categories)
  const totalVariance = calculateVariance(totalBudgeted, totalActual)
  const totalVariancePercentage = calculateVariancePercentage(totalBudgeted, totalActual)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget Variance Summary - {period}</CardTitle>
          <CardDescription>Analysis of differences between planned and actual spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Budgeted</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Actual</p>
              <p className="text-2xl font-bold">{formatCurrency(totalActual)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Variance</p>
              <div className="flex items-center gap-2">
                <p
                  className={`text-2xl font-bold ${totalVariance < 0 ? "text-green-600" : totalVariance > 0 ? "text-red-600" : ""}`}
                >
                  {formatCurrency(Math.abs(totalVariance))}
                </p>
                <div
                  className={`flex items-center ${totalVariance < 0 ? "text-green-600" : totalVariance > 0 ? "text-red-600" : ""}`}
                >
                  {totalVariance < 0 ? (
                    <ArrowDownRight className="h-5 w-5" />
                  ) : totalVariance > 0 ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : null}
                  <span className="text-sm font-medium">{totalVariancePercentage.toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {totalVariance < 0 ? "Under budget" : totalVariance > 0 ? "Over budget" : "On budget"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Category Overview</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedCategory}>
            {selectedCategory ? `${selectedCategory.name} Details` : "Category Details"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Variance by Category</CardTitle>
              <CardDescription>Click on a category to see detailed breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Budgeted</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead className="w-[30%]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => {
                    const variance = calculateVariance(category.budgeted, category.actual)
                    const variancePercentage = calculateVariancePercentage(category.budgeted, category.actual)
                    const isOverBudget = variance > 0
                    const isSignificant = Math.abs(variancePercentage) > 10

                    return (
                      <TableRow
                        key={category.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleCategorySelect(category)}
                      >
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{formatCurrency(category.budgeted)}</TableCell>
                        <TableCell>{formatCurrency(category.actual)}</TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center gap-1 ${isOverBudget ? "text-red-600" : "text-green-600"}`}
                          >
                            {isOverBudget ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                            <span>{formatCurrency(Math.abs(variance))}</span>
                            <span className="text-xs">({Math.abs(variancePercentage).toFixed(1)}%)</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={(category.actual / category.budgeted) * 100}
                              className="h-2"
                              indicatorClassName={isOverBudget ? "bg-red-600" : "bg-green-600"}
                            />
                            {isSignificant ? (
                              isOverBudget ? (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              ) : (
                                <Check className="h-4 w-4 text-green-600" />
                              )
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedCategory && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCategory.name}</h2>
                  <p className="text-muted-foreground">
                    {formatCurrency(selectedCategory.actual)} spent of {formatCurrency(selectedCategory.budgeted)}{" "}
                    budgeted
                  </p>
                </div>
                <Button variant="outline" onClick={handleBackToOverview}>
                  Back to Overview
                </Button>
              </div>

              {selectedCategory.subcategories && selectedCategory.subcategories.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Subcategory Breakdown</CardTitle>
                    <CardDescription>Detailed analysis of spending within {selectedCategory.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subcategory</TableHead>
                          <TableHead>Budgeted</TableHead>
                          <TableHead>Actual</TableHead>
                          <TableHead>Variance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCategory.subcategories.map((subcategory) => {
                          const variance = calculateVariance(subcategory.budgeted, subcategory.actual)
                          const variancePercentage = calculateVariancePercentage(
                            subcategory.budgeted,
                            subcategory.actual,
                          )
                          const isOverBudget = variance > 0

                          return (
                            <TableRow key={subcategory.id}>
                              <TableCell className="font-medium">{subcategory.name}</TableCell>
                              <TableCell>{formatCurrency(subcategory.budgeted)}</TableCell>
                              <TableCell>{formatCurrency(subcategory.actual)}</TableCell>
                              <TableCell>
                                <div
                                  className={`flex items-center gap-1 ${isOverBudget ? "text-red-600" : "text-green-600"}`}
                                >
                                  {isOverBudget ? (
                                    <ArrowUpRight className="h-4 w-4" />
                                  ) : (
                                    <ArrowDownRight className="h-4 w-4" />
                                  )}
                                  <span>{formatCurrency(Math.abs(variance))}</span>
                                  <span className="text-xs">({Math.abs(variancePercentage).toFixed(1)}%)</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={(subcategory.actual / subcategory.budgeted) * 100}
                                    className="h-2"
                                    indicatorClassName={isOverBudget ? "bg-red-600" : "bg-green-600"}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No subcategories available for this category.
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Spending Trend</CardTitle>
                    <CardDescription>{selectedCategory.name} spending over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-60 flex items-center justify-center">
                    <p className="text-muted-foreground">Spending trend chart will be displayed here</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                    <CardDescription>Suggestions to improve your budget</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {selectedCategory.actual > selectedCategory.budgeted ? (
                        <>
                          <li className="flex items-start gap-2">
                            <TrendingDown className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">Reduce {selectedCategory.name} Spending</p>
                              <p className="text-sm text-muted-foreground">
                                You're {formatCurrency(selectedCategory.actual - selectedCategory.budgeted)} over
                                budget. Consider cutting back on non-essential expenses.
                              </p>
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">Adjust Budget Allocation</p>
                              <p className="text-sm text-muted-foreground">
                                Your {selectedCategory.name} budget may be unrealistic. Consider increasing it by
                                reallocating from other categories.
                              </p>
                            </div>
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">Great Job!</p>
                              <p className="text-sm text-muted-foreground">
                                You're {formatCurrency(selectedCategory.budgeted - selectedCategory.actual)} under
                                budget for {selectedCategory.name}.
                              </p>
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">Optimize Your Budget</p>
                              <p className="text-sm text-muted-foreground">
                                Consider reallocating some of the surplus to savings or debt repayment.
                              </p>
                            </div>
                          </li>
                        </>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

