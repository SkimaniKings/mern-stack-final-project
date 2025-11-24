"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type Investment, sampleInvestments, formatCurrency, formatPercent } from "@/lib/investments/calculations"
import { FeeImpactChart } from "@/components/investments/fee-impact-chart"
import { FeeComparisonTable } from "@/components/investments/fee-comparison-table"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

// Sample low-cost alternatives
const lowCostAlternatives = [
  {
    originalInvestment: {
      id: "3",
      name: "Vanguard Total Bond Market ETF",
      ticker: "BND",
    },
    alternatives: [
      {
        id: "alt-1",
        name: "iShares Core U.S. Aggregate Bond ETF",
        ticker: "AGG",
        expenseRatio: 0.03,
        tracking: "Bloomberg U.S. Aggregate Bond Index",
        annualSavings: 200,
      },
      {
        id: "alt-2",
        name: "Schwab U.S. Aggregate Bond ETF",
        ticker: "SCHZ",
        expenseRatio: 0.03,
        tracking: "Bloomberg U.S. Aggregate Bond Index",
        annualSavings: 200,
      },
    ],
  },
  {
    originalInvestment: {
      id: "2",
      name: "Vanguard Total International Stock ETF",
      ticker: "VXUS",
    },
    alternatives: [
      {
        id: "alt-3",
        name: "iShares Core MSCI Total International Stock ETF",
        ticker: "IXUS",
        expenseRatio: 0.07,
        tracking: "MSCI ACWI ex USA IMI Index",
        annualSavings: 300,
      },
      {
        id: "alt-4",
        name: "Schwab International Equity ETF",
        ticker: "SCHF",
        expenseRatio: 0.06,
        tracking: "FTSE Developed ex-US Index",
        annualSavings: 600,
      },
    ],
  },
]

export default function FeeAnalyzerPage() {
  const [investments, setInvestments] = useState<Investment[]>(sampleInvestments)
  const [activeTab, setActiveTab] = useState<string>("overview")

  // Calculate total fees
  const totalValue = investments.reduce((sum, inv) => sum + inv.value, 0)
  const totalAnnualFees = investments.reduce((sum, inv) => {
    if (inv.expenseRatio) {
      return sum + (inv.value * inv.expenseRatio) / 100
    }
    return sum
  }, 0)

  // Calculate weighted average expense ratio
  const weightedExpenseRatio = investments.reduce((sum, inv) => {
    if (inv.expenseRatio) {
      return sum + (inv.value / totalValue) * inv.expenseRatio
    }
    return sum
  }, 0)

  // Calculate potential savings from alternatives
  const potentialAnnualSavings = lowCostAlternatives.reduce((sum, alt) => sum + alt.alternatives[0].annualSavings, 0)

  // Calculate 30-year impact of fees
  const currentFees30Year = calculateFeeImpact(totalValue, weightedExpenseRatio, 30)
  const reducedFees30Year = calculateFeeImpact(
    totalValue,
    weightedExpenseRatio - (potentialAnnualSavings / totalValue) * 100,
    30,
  )
  const feeSavings30Year = currentFees30Year - reducedFees30Year

  // Calculate fee impact over time
  function calculateFeeImpact(principal: number, expenseRatioPercent: number, years: number, growthRate = 7): number {
    const expenseRatio = expenseRatioPercent / 100
    let portfolioWithoutFees = principal
    let portfolioWithFees = principal

    for (let year = 1; year <= years; year++) {
      // Grow both portfolios at the same rate
      portfolioWithoutFees *= 1 + growthRate / 100
      portfolioWithFees *= 1 + growthRate / 100

      // Subtract fees from the fee portfolio
      portfolioWithFees *= 1 - expenseRatio
    }

    // Return the difference (impact of fees)
    return portfolioWithoutFees - portfolioWithFees
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investment Fee Analyzer</h1>
          <p className="text-muted-foreground mt-2">
            Analyze your investment fees and discover lower-cost alternatives
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/investments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Investments
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Fee Impact Over Time</CardTitle>
            <CardDescription>How investment fees affect your returns over 30 years</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <FeeImpactChart
              currentExpenseRatio={weightedExpenseRatio}
              reducedExpenseRatio={weightedExpenseRatio - (potentialAnnualSavings / totalValue) * 100}
              initialInvestment={totalValue}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Summary</CardTitle>
            <CardDescription>Overview of your investment fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Annual Fees</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAnnualFees)}</p>
              <p className="text-xs text-muted-foreground">
                {formatPercent(weightedExpenseRatio)} weighted average expense ratio
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Potential Annual Savings</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(potentialAnnualSavings)}</p>
              <p className="text-xs text-muted-foreground">By switching to lower-cost alternatives</p>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground">30-Year Fee Impact</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(currentFees30Year)}</p>
              <p className="text-xs text-muted-foreground">
                Potential 30-year savings: {formatCurrency(feeSavings30Year)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Fee Overview</TabsTrigger>
          <TabsTrigger value="alternatives">Lower-Cost Alternatives</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Investment Fees Analysis</CardTitle>
              <CardDescription>Breakdown of fees for each investment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Investment</th>
                      <th className="text-left py-3 px-2">Value</th>
                      <th className="text-left py-3 px-2">Expense Ratio</th>
                      <th className="text-left py-3 px-2">Annual Fee</th>
                      <th className="text-left py-3 px-2">10-Year Cost</th>
                      <th className="text-left py-3 px-2">30-Year Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments
                      .filter((inv) => inv.expenseRatio !== undefined)
                      .sort((a, b) => {
                        const feeA = a.expenseRatio ? (a.value * a.expenseRatio) / 100 : 0
                        const feeB = b.expenseRatio ? (b.value * b.expenseRatio) / 100 : 0
                        return feeB - feeA
                      })
                      .map((investment) => {
                        const annualFee = investment.expenseRatio
                          ? (investment.value * investment.expenseRatio) / 100
                          : 0
                        const tenYearCost = calculateFeeImpact(investment.value, investment.expenseRatio || 0, 10)
                        const thirtyYearCost = calculateFeeImpact(investment.value, investment.expenseRatio || 0, 30)

                        return (
                          <tr key={investment.id} className="border-b">
                            <td className="py-3 px-2 font-medium">
                              {investment.name}
                              {investment.ticker && (
                                <span className="text-muted-foreground ml-1">({investment.ticker})</span>
                              )}
                            </td>
                            <td className="py-3 px-2">{formatCurrency(investment.value)}</td>
                            <td className="py-3 px-2">
                              {investment.expenseRatio ? formatPercent(investment.expenseRatio) : "N/A"}
                            </td>
                            <td className="py-3 px-2">{formatCurrency(annualFee)}</td>
                            <td className="py-3 px-2">{formatCurrency(tenYearCost)}</td>
                            <td className="py-3 px-2">{formatCurrency(thirtyYearCost)}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fee Reduction Strategies</CardTitle>
              <CardDescription>Ways to reduce your investment fees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <h3 className="font-medium">Use Low-Cost Index Funds</h3>
                  <p className="text-sm text-muted-foreground">
                    Replace actively managed funds with low-cost index funds and ETFs.
                  </p>
                  <ul className="text-sm space-y-1 mt-2">
                    <li>• Look for expense ratios under 0.10%</li>
                    <li>• Consider Vanguard, Fidelity, or Schwab</li>
                    <li>• Focus on total market or broad index funds</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Minimize Account Fees</h3>
                  <p className="text-sm text-muted-foreground">
                    Avoid or minimize account maintenance fees, trading commissions, and advisory fees.
                  </p>
                  <ul className="text-sm space-y-1 mt-2">
                    <li>• Use brokerages with no account fees</li>
                    <li>• Look for commission-free trading</li>
                    <li>• Consider self-directed investing</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Consolidate Accounts</h3>
                  <p className="text-sm text-muted-foreground">
                    Combine multiple accounts to potentially qualify for lower fees.
                  </p>
                  <ul className="text-sm space-y-1 mt-2">
                    <li>• Merge multiple IRAs</li>
                    <li>• Roll over old 401(k)s</li>
                    <li>• Reach breakpoints for lower fees</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alternatives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lower-Cost Alternatives</CardTitle>
              <CardDescription>Similar investments with lower expense ratios</CardDescription>
            </CardHeader>
            <CardContent>
              <FeeComparisonTable alternatives={lowCostAlternatives} investments={investments} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

