"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  type Investment,
  projectDividendGrowth,
  sampleInvestments,
  formatCurrency,
} from "@/lib/investments/calculations"
import { DividendGrowthChart } from "@/components/investments/dividend-growth-chart"
import { DividendInvestmentTable } from "@/components/investments/dividend-investment-table"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function DividendTrackerPage() {
  const [investments, setInvestments] = useState<Investment[]>(sampleInvestments)
  const [years, setYears] = useState<number>(20)
  const [annualContribution, setAnnualContribution] = useState<number>(5000)
  const [dividendGrowthRate, setDividendGrowthRate] = useState<number>(5)
  const [activeTab, setActiveTab] = useState<string>("overview")

  // Calculate current dividend metrics
  const totalPortfolioValue = investments.reduce((sum, inv) => sum + inv.value, 0)
  const annualDividendIncome = investments.reduce((sum, inv) => {
    if (inv.dividendYield) {
      return sum + (inv.value * inv.dividendYield) / 100
    }
    return sum
  }, 0)
  const portfolioDividendYield = (annualDividendIncome / totalPortfolioValue) * 100

  // Project dividend growth
  const dividendProjection = projectDividendGrowth(investments, years, annualContribution, dividendGrowthRate)

  // Get final year projection
  const finalYearProjection = dividendProjection[dividendProjection.length - 1]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dividend Reinvestment Tracker</h1>
          <p className="text-muted-foreground mt-2">Track and project growth from dividend reinvestment strategies</p>
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
            <CardTitle>Dividend Growth Projection</CardTitle>
            <CardDescription>Projected growth of dividend income over time</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <DividendGrowthChart projection={dividendProjection} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dividend Summary</CardTitle>
            <CardDescription>Overview of your dividend income</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Annual Dividend Income</p>
              <p className="text-2xl font-bold">{formatCurrency(annualDividendIncome)}</p>
              <p className="text-xs text-muted-foreground">{portfolioDividendYield.toFixed(2)}% portfolio yield</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Monthly Dividend Income</p>
              <p className="text-xl font-medium">{formatCurrency(annualDividendIncome / 12)}</p>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground">Projected Annual Dividend in {years} Years</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(finalYearProjection.dividendIncome)}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(finalYearProjection.dividendIncome / 12)} monthly
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Cumulative Dividends Over {years} Years</p>
              <p className="text-xl font-medium">{formatCurrency(finalYearProjection.cumulativeDividends)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Dividend Overview</TabsTrigger>
          <TabsTrigger value="projection">Projection Settings</TabsTrigger>
          <TabsTrigger value="strategy">Dividend Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dividend-Paying Investments</CardTitle>
              <CardDescription>Your investments that generate dividend income</CardDescription>
            </CardHeader>
            <CardContent>
              <DividendInvestmentTable investments={investments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dividend Growth Projection Settings</CardTitle>
              <CardDescription>Customize your dividend growth projection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="projection-years">Projection Years: {years}</Label>
                </div>
                <Slider
                  id="projection-years"
                  min={5}
                  max={40}
                  step={1}
                  value={[years]}
                  onValueChange={(value) => setYears(value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 years</span>
                  <span>20 years</span>
                  <span>40 years</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="annual-contribution">Annual Contribution</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <Input
                    id="annual-contribution"
                    type="number"
                    min="0"
                    step="1000"
                    value={annualContribution}
                    onChange={(e) => setAnnualContribution(Number(e.target.value))}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="dividend-growth-rate">Dividend Growth Rate: {dividendGrowthRate}%</Label>
                </div>
                <Slider
                  id="dividend-growth-rate"
                  min={0}
                  max={10}
                  step={0.5}
                  value={[dividendGrowthRate]}
                  onValueChange={(value) => setDividendGrowthRate(value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>5%</span>
                  <span>10%</span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium mb-2">Projection Assumptions</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Portfolio growth rate: 7% annually</li>
                  <li>• All dividends are reinvested</li>
                  <li>• Annual contributions are made at the beginning of each year</li>
                  <li>• Dividend growth rate applies to the entire portfolio</li>
                  <li>• No taxes are considered in this projection</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dividend Investment Strategy</CardTitle>
              <CardDescription>Strategies for building a dividend portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-medium">Dividend Growth Investing</h3>
                    <p className="text-sm text-muted-foreground">
                      Focus on companies with a history of consistently increasing their dividends.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• Look for companies with 10+ years of dividend increases</li>
                      <li>• Focus on sustainable payout ratios (below 60%)</li>
                      <li>• Consider "Dividend Aristocrats" (25+ years of increases)</li>
                      <li>• Prioritize dividend growth rate over current yield</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">High-Yield Investing</h3>
                    <p className="text-sm text-muted-foreground">
                      Focus on investments with above-average current dividend yields.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• REITs, MLPs, and certain utilities offer higher yields</li>
                      <li>• Be cautious of extremely high yields (may indicate risk)</li>
                      <li>• Check dividend coverage and company financials</li>
                      <li>• Consider tax implications of high-yield investments</li>
                    </ul>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-medium">Dividend ETFs and Funds</h3>
                    <p className="text-sm text-muted-foreground">
                      Use ETFs and mutual funds for diversified dividend exposure.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• Dividend-focused index ETFs offer low-cost exposure</li>
                      <li>• Consider international dividend funds for diversification</li>
                      <li>• Look for funds with reasonable expense ratios</li>
                      <li>• Some funds focus on dividend growth vs. high yield</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Dividend Reinvestment Plans (DRIPs)</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatically reinvest dividends to compound returns.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• Many brokerages offer automatic dividend reinvestment</li>
                      <li>• Some companies offer direct DRIPs with discounts</li>
                      <li>• Reinvesting accelerates compounding</li>
                      <li>• Consider tax implications in taxable accounts</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-medium mb-2">Tax Considerations</h3>
                  <p className="text-sm mb-2">
                    Dividend tax treatment varies based on the type of dividend and account:
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• Qualified dividends are taxed at lower capital gains rates</li>
                    <li>• Non-qualified dividends are taxed as ordinary income</li>
                    <li>• Consider holding dividend investments in tax-advantaged accounts</li>
                    <li>• REITs and certain other high-yield investments often pay non-qualified dividends</li>
                    <li>• Municipal bond dividends may be federally tax-exempt</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

