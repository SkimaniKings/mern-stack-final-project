"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AddInvestmentForm } from "@/components/investments/add-investment-form"
import { DeleteInvestment } from "@/components/investments/delete-investment"
import { formatCurrency } from "@/lib/utils/formatting"
import { BarChart, Pencil, RefreshCw } from "lucide-react"
import { getInvestments } from "@/app/actions/investments"
import { getTaxLossHarvestingOpportunities, getBenchmarkComparisons, getDividendReinvestmentProjection } from "@/app/actions/investment-analytics"

interface Investment {
  id: string
  name: string
  ticker?: string
  type: string
  value: number
  costBasis: number
  allocation: number
  gainLoss: number
  percentage: number
  account?: string
  category?: string
  currency?: string
  quantity?: number
  currentPrice?: number
  initialPrice?: number
  purchaseDate?: string
}

interface InvestmentListProps {
  initialInvestments?: Investment[]
}

export function InvestmentList({ initialInvestments }: InvestmentListProps) {
  const [investments, setInvestments] = useState<Investment[]>(initialInvestments || [])
  const [isLoading, setIsLoading] = useState(!initialInvestments)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!initialInvestments) {
      fetchInvestments()
    }
  }, [initialInvestments])

  const fetchInvestments = async () => {
    setIsLoading(true)
    try {
      const data = await getInvestments()
      if (data && Array.isArray(data)) {
        const formattedInvestments = data.map((inv) => {
          const value = parseFloat(inv.value) || 0;
          const costBasis = parseFloat(inv.cost_basis) || 0;
          const gainLoss = value - costBasis;
          const percentage = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

          return {
            id: inv.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
            name: inv.name || "Unnamed Investment",
            ticker: inv.ticker || undefined,
            type: inv.type || "Other",
            value,
            costBasis,
            allocation: parseFloat(inv.allocation) || 0,
            gainLoss,
            percentage,
            account: inv.accounts?.name || (inv.account_id ? "Unknown Account" : undefined),
            currency: inv.currency || "USD",
            category: inv.categories?.name || (inv.category_id ? "Unknown Category" : undefined),
            quantity: inv.quantity,
            currentPrice: inv.current_price,
            initialPrice: inv.initial_price,
            purchaseDate: inv.purchase_date
          };
        });
        setInvestments(formattedInvestments)
      } else {
        console.error("Invalid data format from getInvestments:", data)
        setInvestments([])
      }
    } catch (error) {
      console.error("Error fetching investments:", error)
      setInvestments([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchInvestments()
    setIsRefreshing(false)
  }



  if (isLoading) {
    return <div>Loading investments...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Investments</CardTitle>
            <CardDescription>A list of your current investments.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <AddInvestmentForm onInvestmentAdded={fetchInvestments} />
            <Button onClick={handleRefresh} disabled={isRefreshing} size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investment</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Allocation</TableHead>
              <TableHead>Cost Basis</TableHead>
              <TableHead>Gain/Loss</TableHead>
              <TableHead>Account</TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.length > 0 ? (
              investments.map((investment) => (
                <TableRow key={investment.id}>
                  <TableCell>
                    <div className="font-medium">{investment.name}{investment.ticker && <span className="text-sm text-muted-foreground ml-2">({investment.ticker.toUpperCase()})</span>}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{investment.type}</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(investment.value)}</TableCell>
                  <TableCell>{investment.allocation.toFixed(1)}%</TableCell>
                  <TableCell>{formatCurrency(investment.costBasis)}</TableCell>
                  <TableCell className={investment.gainLoss >= 0 ? "text-green-500" : "text-red-500"}>
                    {formatCurrency(investment.gainLoss)} ({investment.percentage.toFixed(1)}%)
                  </TableCell>
                  <TableCell>{investment.account || 'Default'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No investments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
