"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getSubscriptionROI } from "@/app/actions/subscriptions"
import { formatCurrency } from "@/lib/utils"
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface SubscriptionROIItem {
  id: string
  name: string
  provider: string
  monthlyAmount: number
  usageScore: number
  usageHours: number
  costPerUse: number
  costPerHour: number
  roiScore: number
  valueCategory: "good" | "average" | "poor"
  recommendation: string
}

export function SubscriptionROI() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionROIItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchROI = async () => {
      try {
        const data = await getSubscriptionROI()
        setSubscriptions(data)
      } catch (err) {
        setError("Error calculating subscription ROI")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchROI()
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

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="font-medium">No subscriptions to analyze</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add subscriptions to see their value analysis.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Value Analysis</CardTitle>
          <CardDescription>See which subscriptions provide the best value for your money</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{sub.name}</h3>
                    <p className="text-sm text-muted-foreground">{sub.provider}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(sub.monthlyAmount)}/month</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(sub.costPerUse)} per use • {formatCurrency(sub.costPerHour)} per hour
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Progress
                    value={sub.roiScore}
                    className={`h-2 ${
                      sub.valueCategory === "good"
                        ? "bg-green-100"
                        : sub.valueCategory === "average"
                          ? "bg-amber-100"
                          : "bg-red-100"
                    }`}
                  />
                  <span className="text-sm font-medium w-8">{Math.round(sub.roiScore)}%</span>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  {sub.valueCategory === "good" ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : sub.valueCategory === "poor" ? (
                    <TrendingDown className="h-4 w-4 text-red-600 mt-0.5" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5" />
                  )}
                  <p
                    className={`${
                      sub.valueCategory === "good"
                        ? "text-green-600"
                        : sub.valueCategory === "average"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {sub.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

