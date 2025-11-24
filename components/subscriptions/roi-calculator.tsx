"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ROICalculation } from "@/types/subscription"

interface ROICalculatorProps {
  subscriptionId: string
}

export function ROICalculator({ subscriptionId }: ROICalculatorProps) {
  const [loading, setLoading] = useState(true)
  const [roiData, setRoiData] = useState<ROICalculation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchROIData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch("/api/subscriptions/roi", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subscriptionId }),
        })
        
        if (!response.ok) {
          throw new Error("Failed to fetch ROI data")
        }
        
        const data = await response.json()
        setRoiData(data)
      } catch (err) {
        console.error("Error fetching ROI data:", err)
        setError("Failed to load ROI data")
      } finally {
        setLoading(false)
      }
    }
    
    if (subscriptionId) {
      fetchROIData()
    }
  }, [subscriptionId])
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ROI Calculator</CardTitle>
          <CardDescription>Calculating return on investment...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ROI Calculator</CardTitle>
          <CardDescription>There was an error loading the ROI data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }
  
  if (!roiData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ROI Calculator</CardTitle>
          <CardDescription>No ROI data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Add expected return information to see ROI calculations
          </p>
        </CardContent>
      </Card>
    )
  }
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  
  // Calculate ROI color based on percentage
  const getRoiColor = (percentage: number) => {
    if (percentage <= 0) return "text-destructive"
    if (percentage < 100) return "text-amber-500"
    return "text-green-500"
  }
  
  // Calculate progress color
  const getProgressColor = (percentage: number) => {
    if (percentage <= 0) return "bg-destructive"
    if (percentage < 100) return "bg-amber-500"
    return "bg-green-500"
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>ROI Calculator</CardTitle>
        <CardDescription>
          Return on investment analysis for this subscription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ROI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Total Cost</p>
            <p className="text-2xl font-bold">{formatCurrency(roiData.total_cost)}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(roiData.monthly_cost)} monthly · {formatCurrency(roiData.annual_cost)} annually
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Expected Return</p>
            <p className="text-2xl font-bold">{formatCurrency(roiData.expected_return)}</p>
            {roiData.actual_return !== null && (
              <p className="text-xs text-muted-foreground">
                Actual: {formatCurrency(roiData.actual_return)}
              </p>
            )}
          </div>
        </div>
        
        {/* ROI Percentage */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <p className="text-sm font-medium">ROI Percentage</p>
            <p className={`text-sm font-bold ${getRoiColor(roiData.roi_percentage)}`}>
              {roiData.roi_percentage.toFixed(2)}%
            </p>
          </div>
          <Progress 
            value={Math.min(Math.max(roiData.roi_percentage, 0), 200)} 
            max={200}
            className={`h-2 ${getProgressColor(roiData.roi_percentage)}`}
          />
          <p className="text-xs text-muted-foreground">
            {roiData.roi_percentage <= 0 
              ? "This subscription is not providing a positive return"
              : roiData.roi_percentage < 100
                ? "This subscription is providing some return, but not breaking even"
                : "This subscription is providing a positive return on investment"
            }
          </p>
        </div>
        
        {/* Break-even Analysis */}
        {roiData.break_even_months !== null && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Break-even Analysis</p>
            <p className="text-lg">
              {roiData.break_even_months <= 0 
                ? "This subscription will never break even at current rates"
                : `Breaks even after ${roiData.break_even_months.toFixed(1)} months`
              }
            </p>
            {roiData.break_even_months > 0 && (
              <Progress 
                value={Math.min(12, roiData.break_even_months)} 
                max={12}
                className="h-2"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {roiData.break_even_months <= 0 
                ? "Consider if this subscription provides non-monetary value"
                : roiData.break_even_months <= 1
                  ? "Excellent ROI - breaks even in less than a month"
                  : roiData.break_even_months <= 3
                    ? "Good ROI - breaks even within a quarter"
                    : roiData.break_even_months <= 12
                      ? "Moderate ROI - breaks even within a year"
                      : "Long-term ROI - takes over a year to break even"
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
