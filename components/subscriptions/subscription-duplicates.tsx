"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { findDuplicateServices } from "@/app/actions/subscriptions"
import { formatCurrency } from "@/lib/utils"
import { AlertCircle, AlertTriangle } from "lucide-react"

interface DuplicateGroup {
  category: string
  subscriptions: {
    id: string
    name: string
    provider: string
    amount: number
    billing_cycle: string
    categories?: { name: string }
  }[]
  reason: string
  recommendation: string
}

export function SubscriptionDuplicates() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDuplicates = async () => {
      try {
        const data = await findDuplicateServices()
        setDuplicates(data)
      } catch (err) {
        setError("Error finding duplicate services")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDuplicates()
  }, [])

  if (loading) {
    return <Skeleton className="h-[400px] w-full" />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-destructive mr-2" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (duplicates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="font-medium">No duplicate services found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your subscription portfolio looks optimized!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Potential Duplicate Services</CardTitle>
          <CardDescription>Identify overlapping subscriptions to reduce costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {duplicates.map((group, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">{group.reason}</h3>
                    <p className="text-sm text-muted-foreground">{group.category} category</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.subscriptions.map((sub) => (
                    <div key={sub.id} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                      <div>
                        <div className="font-medium">{sub.name}</div>
                        <div className="text-xs text-muted-foreground">{sub.provider}</div>
                      </div>
                      <div className="text-right">
                        <div>{formatCurrency(sub.amount)}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {sub.billing_cycle ? sub.billing_cycle.replace("_", " ") : "monthly"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <p className="text-sm font-medium">Recommendation:</p>
                  <p className="text-sm">{group.recommendation}</p>

                  <div className="mt-3 text-sm">
                    <p className="font-medium">Potential savings:</p>
                    <p>
                      {formatCurrency(
                        group.subscriptions.reduce((sum, sub) => {
                          let monthlyAmount = sub.amount
                          switch (sub.billing_cycle) {
                            case "weekly":
                              monthlyAmount *= 4.33
                              break
                            case "biweekly":
                              monthlyAmount *= 2.17
                              break
                            case "quarterly":
                              monthlyAmount /= 3
                              break
                            case "semiannually":
                              monthlyAmount /= 6
                              break
                            case "annually":
                              monthlyAmount /= 12
                              break
                          }
                          return sum + monthlyAmount
                        }, 0) / 2,
                      )}{" "}
                      per month by optimizing these services
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

