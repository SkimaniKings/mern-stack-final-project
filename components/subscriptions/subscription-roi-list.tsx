"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ArrowUpDown, MoreHorizontal, ExternalLink, BarChart2, AlertTriangle } from "lucide-react"

interface Subscription {
  id: string
  name: string
  provider: string
  monthlyAmount: number
  usageScore: number
  usageHours: number
  costPerUse: number
  costPerHour: number
  roiScore: number
  valueCategory: "poor" | "average" | "good"
  recommendation: string
}

interface SubscriptionROIListProps {
  subscriptions: Subscription[]
}

type SortField = "name" | "monthlyAmount" | "usageScore" | "costPerUse" | "roiScore"
type SortDirection = "asc" | "desc"

export function SubscriptionROIList({ subscriptions }: SubscriptionROIListProps) {
  const [sortField, setSortField] = useState<SortField>("roiScore")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedSubscriptions = [...subscriptions].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return sortDirection === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
  })

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 font-medium"
                >
                  Subscription
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("monthlyAmount")}
                  className="flex items-center gap-1 font-medium"
                >
                  Monthly Cost
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("usageScore")}
                  className="flex items-center gap-1 font-medium"
                >
                  Usage
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("costPerUse")}
                  className="flex items-center gap-1 font-medium"
                >
                  Cost/Use
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("roiScore")}
                  className="flex items-center gap-1 font-medium"
                >
                  ROI Score
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSubscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{subscription.name}</span>
                    <span className="text-xs text-muted-foreground">{subscription.provider}</span>
                  </div>
                </TableCell>
                <TableCell>${subscription.monthlyAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          subscription.usageScore >= 7
                            ? "bg-green-500"
                            : subscription.usageScore >= 4
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${subscription.usageScore * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-xs">{subscription.usageScore.toFixed(1)}</span>
                  </div>
                </TableCell>
                <TableCell>${subscription.costPerUse.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      subscription.valueCategory === "good"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : subscription.valueCategory === "average"
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          : "bg-red-100 text-red-800 hover:bg-red-100"
                    }
                  >
                    {subscription.roiScore.toFixed(0)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/subscriptions/${subscription.id}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/subscriptions/${subscription.id}/usage`}>
                          <BarChart2 className="h-4 w-4 mr-2" />
                          Record Usage
                        </Link>
                      </DropdownMenuItem>
                      {subscription.valueCategory === "poor" && (
                        <DropdownMenuItem asChild>
                          <Link href={`/subscriptions/${subscription.id}/cancel`}>
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Cancel Subscription
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

