"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type Investment,
  calculateTaxEfficiency,
  findTaxLossHarvestingOpportunities,
  sampleInvestments,
  formatCurrency,
} from "@/lib/investments/calculations"
import { TaxLocationChart } from "@/components/investments/tax-location-chart"
import { TaxLossHarvestingTable } from "@/components/investments/tax-loss-harvesting-table"
import { TaxLocationRecommendations } from "@/components/investments/tax-location-recommendations"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function TaxStrategiesPage() {
  const [investments, setInvestments] = useState<Investment[]>(sampleInvestments)
  const [activeTab, setActiveTab] = useState<string>("overview")

  // Calculate tax efficiency metrics
  const taxEfficiency = calculateTaxEfficiency(investments)

  // Find tax-loss harvesting opportunities
  const taxLossHarvestingOpportunities = findTaxLossHarvestingOpportunities(investments)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax-Efficient Strategies</h1>
          <p className="text-muted-foreground mt-2">
            Optimize your investment strategy to minimize taxes and maximize after-tax returns
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
            <CardTitle>Tax Location Analysis</CardTitle>
            <CardDescription>Distribution of investments across tax-advantaged and taxable accounts</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <TaxLocationChart taxEfficiency={taxEfficiency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax Efficiency Summary</CardTitle>
            <CardDescription>Overview of your portfolio's tax efficiency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Tax Efficiency Score</p>
              <div className="flex items-center mt-1">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${taxEfficiency.taxEfficiencyScore}%` }}></div>
                </div>
                <span className="ml-2 font-medium">{taxEfficiency.taxEfficiencyScore.toFixed(1)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Taxable</p>
                <p className="font-medium">{formatCurrency(taxEfficiency.taxableValue)}</p>
                <p className="text-xs text-muted-foreground">
                  {(
                    (taxEfficiency.taxableValue /
                      (taxEfficiency.taxableValue + taxEfficiency.taxDeferredValue + taxEfficiency.taxFreeValue)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Tax-Deferred</p>
                <p className="font-medium">{formatCurrency(taxEfficiency.taxDeferredValue)}</p>
                <p className="text-xs text-muted-foreground">
                  {(
                    (taxEfficiency.taxDeferredValue /
                      (taxEfficiency.taxableValue + taxEfficiency.taxDeferredValue + taxEfficiency.taxFreeValue)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Tax-Free</p>
                <p className="font-medium">{formatCurrency(taxEfficiency.taxFreeValue)}</p>
                <p className="text-xs text-muted-foreground">
                  {(
                    (taxEfficiency.taxFreeValue /
                      (taxEfficiency.taxableValue + taxEfficiency.taxDeferredValue + taxEfficiency.taxFreeValue)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium">Tax-Loss Harvesting Opportunities</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  taxLossHarvestingOpportunities.reduce((total, opp) => total + opp.harvestingBenefit, 0),
                )}
              </p>
              <p className="text-xs text-muted-foreground">Potential tax savings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tax Strategy Overview</TabsTrigger>
          <TabsTrigger value="location">Tax Location Optimization</TabsTrigger>
          <TabsTrigger value="harvesting">Tax-Loss Harvesting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Optimization Strategies</CardTitle>
              <CardDescription>Key strategies to minimize taxes on your investments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <h3 className="font-medium">Tax-Efficient Asset Location</h3>
                    <p className="text-sm text-muted-foreground">
                      Place investments in the most tax-advantaged accounts based on their tax characteristics.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• Hold tax-inefficient assets in tax-advantaged accounts</li>
                      <li>• Keep tax-efficient investments in taxable accounts</li>
                      <li>• Maximize use of tax-free accounts for highest growth assets</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Tax-Loss Harvesting</h3>
                    <p className="text-sm text-muted-foreground">
                      Sell investments at a loss to offset capital gains and reduce your tax liability.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• Offset capital gains with capital losses</li>
                      <li>• Deduct up to $3,000 against ordinary income</li>
                      <li>• Replace sold investments with similar (but not identical) assets</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Tax-Efficient Withdrawal Strategy</h3>
                    <p className="text-sm text-muted-foreground">
                      Withdraw from accounts in the optimal order to minimize lifetime taxes.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• Start with required minimum distributions (RMDs)</li>
                      <li>• Then taxable accounts (using specific lot identification)</li>
                      <li>• Then tax-deferred accounts</li>
                      <li>• Finally, tax-free accounts</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-muted/50 mt-4">
                  <h3 className="font-medium mb-2">Your Tax Optimization Opportunities</h3>
                  <ul className="space-y-2">
                    {taxEfficiency.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-muted text-xs">
                          {index + 1}
                        </div>
                        <p>{recommendation}</p>
                      </li>
                    ))}
                    {taxLossHarvestingOpportunities.length > 0 && (
                      <li className="flex items-start gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-muted text-xs">
                          {taxEfficiency.recommendations.length + 1}
                        </div>
                        <p>
                          Consider harvesting losses from underperforming investments to offset capital gains (potential
                          tax savings:{" "}
                          {formatCurrency(
                            taxLossHarvestingOpportunities.reduce((total, opp) => total + opp.harvestingBenefit, 0),
                          )}
                          ).
                        </p>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Location Recommendations</CardTitle>
              <CardDescription>Optimal placement of investments across account types</CardDescription>
            </CardHeader>
            <CardContent>
              <TaxLocationRecommendations investments={investments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="harvesting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax-Loss Harvesting Opportunities</CardTitle>
              <CardDescription>
                Investments with unrealized losses that could be harvested for tax benefits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaxLossHarvestingTable opportunities={taxLossHarvestingOpportunities} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

