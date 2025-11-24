"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
import type { Investment } from "@/lib/investments/calculations"

interface TaxLocationRecommendationsProps {
  investments: Investment[]
}

export function TaxLocationRecommendations({ investments }: TaxLocationRecommendationsProps) {
  // Generate tax location recommendations
  const recommendations = investments.map((investment) => {
    let recommendedLocation: "taxable" | "tax_deferred" | "tax_free" = investment.taxLocation || "taxable"
    let reason = ""

    // Determine optimal location based on investment characteristics
    if (investment.type === "bond" || (investment.dividendYield && investment.dividendYield > 2.5)) {
      recommendedLocation = "tax_deferred"
      reason = "High income-generating investments are best held in tax-deferred accounts"
    } else if (investment.type === "stock" && (!investment.dividendYield || investment.dividendYield < 1.0)) {
      recommendedLocation = "taxable"
      reason = "Growth-oriented investments with low dividends are tax-efficient in taxable accounts"
    } else if (investment.type === "etf" && (!investment.dividendYield || investment.dividendYield < 1.5)) {
      recommendedLocation = "taxable"
      reason = "Tax-efficient ETFs work well in taxable accounts"
    } else if (investment.type === "real_estate") {
      recommendedLocation = "tax_deferred"
      reason = "Real estate investments often generate taxable income"
    }

    // For high growth potential, tax-free accounts are ideal
    if (investment.type === "stock" && investment.value > 20000) {
      recommendedLocation = "tax_free"
      reason = "High-growth potential investments benefit most from tax-free growth"
    }

    return {
      investment,
      currentLocation: investment.taxLocation || "taxable",
      recommendedLocation,
      needsChange: investment.taxLocation !== recommendedLocation,
      reason,
    }
  })

  // Sort by need for change (changes first)
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    if (a.needsChange && !b.needsChange) return -1
    if (!a.needsChange && b.needsChange) return 1
    return 0
  })

  // Format tax location for display
  const formatTaxLocation = (location: string) => {
    switch (location) {
      case "taxable":
        return "Taxable"
      case "tax_deferred":
        return "Tax-Deferred"
      case "tax_free":
        return "Tax-Free"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Investment</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Current Location</TableHead>
            <TableHead>Recommended</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRecommendations.map((rec) => (
            <TableRow key={rec.investment.id} className={rec.needsChange ? "bg-muted/50" : undefined}>
              <TableCell className="font-medium">
                {rec.investment.name}
                {rec.investment.ticker && <span className="text-muted-foreground ml-1">({rec.investment.ticker})</span>}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {rec.investment.type.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>{formatTaxLocation(rec.currentLocation)}</TableCell>
              <TableCell>
                {rec.needsChange ? (
                  <div className="flex items-center">
                    <span className="line-through text-muted-foreground mr-1">
                      {formatTaxLocation(rec.currentLocation)}
                    </span>
                    <ArrowRight className="h-3 w-3 mx-1" />
                    <span className="font-medium">{formatTaxLocation(rec.recommendedLocation)}</span>
                  </div>
                ) : (
                  <span className="text-green-600">✓ {formatTaxLocation(rec.recommendedLocation)}</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{rec.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="p-4 border rounded-lg bg-muted/50">
        <h3 className="font-medium mb-2">Tax Location Strategy</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="font-medium">Taxable Accounts</p>
            <ul className="text-sm space-y-1 mt-1">
              <li>• Tax-efficient ETFs</li>
              <li>• Low-dividend stocks</li>
              <li>• Municipal bonds</li>
              <li>• Index funds</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Tax-Deferred Accounts</p>
            <ul className="text-sm space-y-1 mt-1">
              <li>• Corporate bonds</li>
              <li>• REITs</li>
              <li>• High-dividend stocks</li>
              <li>• Actively managed funds</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Tax-Free Accounts</p>
            <ul className="text-sm space-y-1 mt-1">
              <li>• High-growth stocks</li>
              <li>• Small-cap stocks</li>
              <li>• Aggressive funds</li>
              <li>• Assets with highest return potential</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

