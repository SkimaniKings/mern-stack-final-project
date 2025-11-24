"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type Investment, formatCurrency } from "@/lib/investments/calculations"
import { AlternativeInvestmentTable } from "@/components/investments/alternative-investment-table"
import { AlternativeAllocationChart } from "@/components/investments/alternative-allocation-chart"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"

// Sample alternative investments
const alternativeInvestments: Investment[] = [
  {
    id: "alt-1",
    name: "Rental Property - 123 Main St",
    type: "real_estate",
    value: 350000,
    costBasis: 300000,
    allocation: 70,
    dividendYield: 4.5, // Rental yield
    region: "US",
    taxLocation: "taxable",
  },
  {
    id: "alt-2",
    name: "Private Equity Fund - Growth Partners",
    type: "alternative",
    value: 50000,
    costBasis: 50000,
    allocation: 10,
    region: "US",
    taxLocation: "taxable",
  },
  {
    id: "alt-3",
    name: "Fine Art Collection",
    type: "alternative",
    value: 25000,
    costBasis: 20000,
    allocation: 5,
    region: "Global",
    taxLocation: "taxable",
  },
  {
    id: "alt-4",
    name: "Cryptocurrency - Bitcoin",
    type: "alternative",
    value: 15000,
    costBasis: 10000,
    allocation: 3,
    region: "Global",
    taxLocation: "taxable",
  },
  {
    id: "alt-5",
    name: "Cryptocurrency - Ethereum",
    type: "alternative",
    value: 10000,
    costBasis: 8000,
    allocation: 2,
    region: "Global",
    taxLocation: "taxable",
  },
  {
    id: "alt-6",
    name: "Crowdfunded Real Estate - Office Building",
    type: "real_estate",
    value: 30000,
    costBasis: 30000,
    allocation: 6,
    dividendYield: 6.0,
    region: "US",
    taxLocation: "taxable",
  },
  {
    id: "alt-7",
    name: "Wine Collection",
    type: "alternative",
    value: 20000,
    costBasis: 15000,
    allocation: 4,
    region: "Global",
    taxLocation: "taxable",
  },
]

export default function AlternativeInvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>(alternativeInvestments)
  const [activeTab, setActiveTab] = useState<string>("overview")

  // Calculate total alternative investment value
  const totalValue = investments.reduce((sum, inv) => sum + inv.value, 0)

  // Calculate total gain/loss
  const totalCost = investments.reduce((sum, inv) => sum + inv.costBasis, 0)
  const totalGain = totalValue - totalCost
  const totalGainPercent = (totalGain / totalCost) * 100

  // Calculate income from alternatives
  const annualIncome = investments.reduce((sum, inv) => {
    if (inv.dividendYield) {
      return sum + (inv.value * inv.dividendYield) / 100
    }
    return sum
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alternative Investments</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage non-traditional investments like real estate, collectibles, and private equity
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
            <CardTitle>Alternative Investment Allocation</CardTitle>
            <CardDescription>Breakdown of your alternative investment portfolio</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <AlternativeAllocationChart investments={investments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alternative Investment Summary</CardTitle>
            <CardDescription>Overview of your alternative investments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
              <p className={`text-xl font-medium ${totalGain >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(totalGain)} ({totalGainPercent.toFixed(1)}%)
              </p>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground">Annual Income</p>
              <p className="text-xl font-medium">{formatCurrency(annualIncome)}</p>
              <p className="text-xs text-muted-foreground">{((annualIncome / totalValue) * 100).toFixed(2)}% yield</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Asset Count</p>
              <p className="text-xl font-medium">{investments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Investment Overview</TabsTrigger>
          <TabsTrigger value="real-estate">Real Estate</TabsTrigger>
          <TabsTrigger value="collectibles">Collectibles & Other</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Alternative Investment Portfolio</CardTitle>
                  <CardDescription>All your alternative investments</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Investment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AlternativeInvestmentTable investments={investments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="real-estate" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Real Estate Investments</CardTitle>
                  <CardDescription>Properties and real estate investment vehicles</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AlternativeInvestmentTable investments={investments.filter((inv) => inv.type === "real_estate")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Real Estate Investment Strategies</CardTitle>
              <CardDescription>Different approaches to real estate investing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <h3 className="font-medium">Direct Ownership</h3>
                  <p className="text-sm text-muted-foreground">
                    Directly owning and managing residential or commercial properties.
                  </p>

                  <ul className="text-sm space-y-1 mt-2">
                    <li>• Rental income and potential appreciation</li>
                    <li>• Tax benefits through depreciation</li>
                    <li>• Requires active management</li>
                    <li>• Higher capital requirements</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">REITs</h3>
                  <p className="text-sm text-muted-foreground">Real Estate Investment Trusts that trade like stocks.</p>
                  <ul className="text-sm space-y-1 mt-2">
                    <li>• Liquid investments with regular dividends</li>
                    <li>• Professional management</li>
                    <li>• Diversification across properties</li>
                    <li>• No direct control over properties</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Crowdfunding</h3>
                  <p className="text-sm text-muted-foreground">
                    Investing in real estate projects through online platforms.
                  </p>
                  <ul className="text-sm space-y-1 mt-2">
                    <li>• Lower minimum investments</li>
                    <li>• Access to commercial properties</li>
                    <li>• Passive investment approach</li>
                    <li>• Limited liquidity and higher risk</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collectibles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Collectibles & Other Alternatives</CardTitle>
                  <CardDescription>
                    Art, collectibles, private equity, and other alternative investments
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Investment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AlternativeInvestmentTable
                investments={investments.filter(
                  (inv) =>
                    inv.type === "alternative" ||
                    (inv.type !== "real_estate" &&
                      inv.type !== "stock" &&
                      inv.type !== "etf" &&
                      inv.type !== "bond" &&
                      inv.type !== "cash"),
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alternative Investment Considerations</CardTitle>
              <CardDescription>Key factors to consider with alternative investments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-medium">Liquidity Constraints</h3>
                    <p className="text-sm text-muted-foreground">
                      Many alternative investments have limited liquidity and longer investment horizons.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• Private equity typically has 7-10 year lockups</li>
                      <li>• Real estate can take months to sell</li>
                      <li>• Collectibles require finding the right buyer</li>
                      <li>• Consider your liquidity needs before investing</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Valuation Challenges</h3>
                    <p className="text-sm text-muted-foreground">
                      Determining accurate values for alternative investments can be difficult.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• Limited market pricing information</li>
                      <li>• Subjective valuation methods</li>
                      <li>• Infrequent valuation updates</li>
                      <li>• Consider professional appraisals for significant assets</li>
                    </ul>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-medium">Tax Considerations</h3>
                    <p className="text-sm text-muted-foreground">
                      Alternative investments often have complex tax implications.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• Collectibles may face higher capital gains rates (28%)</li>
                      <li>• Real estate offers depreciation benefits</li>
                      <li>• Private equity may generate K-1 tax forms</li>
                      <li>• Consult with a tax professional for guidance</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Diversification Benefits</h3>
                    <p className="text-sm text-muted-foreground">
                      Alternative investments can provide portfolio diversification.
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>• Often have low correlation with stocks and bonds</li>
                      <li>• Can provide inflation protection</li>
                      <li>• May offer unique return drivers</li>
                      <li>• Consider limiting alternatives to 5-20% of portfolio</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

