"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { TaxCalculation } from "@/types/income"
import { AlertCircle, TrendingDown, DollarSign } from "lucide-react"

export function TaxCalculator() {
  const [income, setIncome] = useState<number>(75000)
  const [filingStatus, setFilingStatus] = useState<string>("single")
  const [deductions, setDeductions] = useState<number>(12950) // Standard deduction for 2022
  const [taxYear, setTaxYear] = useState<number>(2023)
  const [calculation, setCalculation] = useState<TaxCalculation | null>(null)

  // 2023 tax brackets (simplified for demo)
  const TAX_BRACKETS = {
    single: [
      { threshold: 0, rate: 10 },
      { threshold: 11000, rate: 12 },
      { threshold: 44725, rate: 22 },
      { threshold: 95375, rate: 24 },
      { threshold: 182100, rate: 32 },
      { threshold: 231250, rate: 35 },
      { threshold: 578125, rate: 37 },
    ],
    "married-joint": [
      { threshold: 0, rate: 10 },
      { threshold: 22000, rate: 12 },
      { threshold: 89450, rate: 22 },
      { threshold: 190750, rate: 24 },
      { threshold: 364200, rate: 32 },
      { threshold: 462500, rate: 35 },
      { threshold: 693750, rate: 37 },
    ],
    "married-separate": [
      { threshold: 0, rate: 10 },
      { threshold: 11000, rate: 12 },
      { threshold: 44725, rate: 22 },
      { threshold: 95375, rate: 24 },
      { threshold: 182100, rate: 32 },
      { threshold: 231250, rate: 35 },
      { threshold: 346875, rate: 37 },
    ],
    "head-of-household": [
      { threshold: 0, rate: 10 },
      { threshold: 15700, rate: 12 },
      { threshold: 59850, rate: 22 },
      { threshold: 95350, rate: 24 },
      { threshold: 182100, rate: 32 },
      { threshold: 231250, rate: 35 },
      { threshold: 578100, rate: 37 },
    ],
  }

  const calculateTax = () => {
    const taxableIncome = Math.max(income - deductions, 0)
    const brackets = TAX_BRACKETS[filingStatus as keyof typeof TAX_BRACKETS]

    let totalTax = 0
    let marginalRate = 0
    const breakdown: { bracket: number; amount: number; tax: number }[] = []

    // Calculate tax for each bracket
    for (let i = 0; i < brackets.length; i++) {
      const currentBracket = brackets[i]
      const nextBracket = brackets[i + 1]

      // Determine the income amount that falls within this bracket
      const bracketMin = currentBracket.threshold
      const bracketMax = nextBracket ? nextBracket.threshold : Number.POSITIVE_INFINITY
      const incomeInBracket = Math.min(Math.max(taxableIncome - bracketMin, 0), bracketMax - bracketMin)

      if (incomeInBracket > 0) {
        const taxForBracket = incomeInBracket * (currentBracket.rate / 100)
        totalTax += taxForBracket
        marginalRate = currentBracket.rate

        breakdown.push({
          bracket: currentBracket.rate,
          amount: incomeInBracket,
          tax: taxForBracket,
        })
      }

      // If we've processed all taxable income, break
      if (taxableIncome <= bracketMax) break
    }

    // Calculate effective tax rate
    const effectiveRate = (totalTax / income) * 100

    // Generate optimization suggestions
    const suggestions: string[] = []

    if (deductions < 25000) {
      suggestions.push("Consider maximizing retirement contributions to reduce taxable income.")
    }

    if (marginalRate >= 24) {
      suggestions.push("You may benefit from tax-loss harvesting in your investment accounts.")
    }

    if (filingStatus === "single" && income > 80000) {
      suggestions.push('Explore if "head of household" filing status could be applicable to your situation.')
    }

    if (effectiveRate > 20) {
      suggestions.push("Look into tax-advantaged investments like municipal bonds.")
    }

    // Create deduction impact analysis
    const deductionImpact = [
      {
        name: "Standard Deduction",
        amount: deductions,
        impact: deductions * (marginalRate / 100),
      },
    ]

    setCalculation({
      gross_income: income,
      taxable_income: taxableIncome,
      total_tax: totalTax,
      effective_tax_rate: effectiveRate,
      marginal_tax_rate: marginalRate,
      breakdown,
      deductions: deductionImpact,
      optimization_suggestions: suggestions,
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Progressive Tax Calculator</CardTitle>
        <CardDescription>Estimate your tax burden and find optimization opportunities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="income">Annual Gross Income</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="income"
                  type="number"
                  placeholder="75000"
                  className="pl-9"
                  value={income}
                  onChange={(e) => setIncome(Number.parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filing-status">Filing Status</Label>
              <Select value={filingStatus} onValueChange={setFilingStatus}>
                <SelectTrigger id="filing-status">
                  <SelectValue placeholder="Select filing status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married-joint">Married Filing Jointly</SelectItem>
                  <SelectItem value="married-separate">Married Filing Separately</SelectItem>
                  <SelectItem value="head-of-household">Head of Household</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deductions">Total Deductions</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="deductions"
                  type="number"
                  placeholder="12950"
                  className="pl-9"
                  value={deductions}
                  onChange={(e) => setDeductions(Number.parseFloat(e.target.value) || 0)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Standard deduction for {filingStatus === "single" ? "single filers" : "married couples"} in 2023 is
                {filingStatus === "single" || filingStatus === "married-separate"
                  ? " $13,850"
                  : filingStatus === "married-joint"
                    ? " $27,700"
                    : " $20,800"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-year">Tax Year</Label>
              <Select value={taxYear.toString()} onValueChange={(value) => setTaxYear(Number.parseInt(value))}>
                <SelectTrigger id="tax-year">
                  <SelectValue placeholder="Select tax year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={calculateTax}>Calculate Tax</Button>

          {calculation && (
            <Tabs defaultValue="summary" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="breakdown">Tax Breakdown</TabsTrigger>
                <TabsTrigger value="optimization">Optimization</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-medium">Taxable Income</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl font-bold">${calculation.taxable_income.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        After ${deductions.toLocaleString()} in deductions
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl font-bold">${Math.round(calculation.total_tax).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        {calculation.effective_tax_rate.toFixed(1)}% effective rate
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-medium">Marginal Rate</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl font-bold">{calculation.marginal_tax_rate}%</div>
                      <p className="text-xs text-muted-foreground">Your highest tax bracket</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Tax Visualization</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { name: "Gross Income", value: calculation.gross_income },
                          { name: "Taxable Income", value: calculation.taxable_income },
                          { name: "Total Tax", value: calculation.total_tax },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="breakdown" className="pt-4">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Tax Bracket Breakdown</CardTitle>
                    <CardDescription>How your income is taxed across different brackets</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={calculation.breakdown.map((item) => ({
                          name: `${item.bracket}%`,
                          amount: item.amount,
                          tax: item.tax,
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip
                          formatter={(value, name) => [
                            `$${value.toLocaleString()}`,
                            name === "amount" ? "Income in Bracket" : "Tax for Bracket",
                          ]}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="amount" name="Income in Bracket" fill="#8884d8" />
                        <Bar yAxisId="right" dataKey="tax" name="Tax for Bracket" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                  <CardFooter className="p-4">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">How Progressive Taxation Works:</p>
                      <p className="text-muted-foreground">
                        Your income is taxed in tiers. The first portion is taxed at the lowest rate, then the next
                        portion at the next rate, and so on. Your marginal tax rate of {calculation.marginal_tax_rate}%
                        only applies to income above $
                        {TAX_BRACKETS[filingStatus as keyof typeof TAX_BRACKETS]
                          .find((bracket) => bracket.rate === calculation.marginal_tax_rate)
                          ?.threshold.toLocaleString()}
                        .
                      </p>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="optimization" className="space-y-4 pt-4">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Tax Optimization Suggestions</CardTitle>
                    <CardDescription>Ways to potentially reduce your tax burden</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {calculation.optimization_suggestions.length > 0 ? (
                      <ul className="space-y-2">
                        {calculation.optimization_suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <TrendingDown className="mt-0.5 h-4 w-4 text-green-500" />
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span>No specific optimization suggestions available for your situation.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Deduction Impact Analysis</CardTitle>
                    <CardDescription>How your deductions reduce your tax burden</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-4">
                      {calculation.deductions.map((deduction, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{deduction.name}</span>
                            <span>${deduction.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Tax Savings</span>
                            <span className="text-green-500">${Math.round(deduction.impact).toLocaleString()}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-green-500"
                              style={{ width: `${(deduction.impact / calculation.total_tax) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            This deduction reduces your tax bill by{" "}
                            {((deduction.impact / calculation.total_tax) * 100).toFixed(1)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

