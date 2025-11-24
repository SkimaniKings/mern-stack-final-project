"use client"

import { useEffect, useState } from "react"
import { InfoIcon } from "lucide-react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function FinancialHealthScore() {
  const [score, setScore] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => {
      setScore(78)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) return null

  // Calculate colors and status based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }

  const getScoreStatus = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    if (score >= 40) return "Fair"
    return "Needs Improvement"
  }

  const scoreColor = getScoreColor(score)
  const scoreStatus = getScoreStatus(score)

  // Calculate the circumference and offset for the SVG circle
  const radius = 85
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center p-4 animate-in">
      <div className="relative flex items-center justify-center">
        {/* Background circle */}
        <svg width="200" height="200" className="transform -rotate-90">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-muted/20"
          />
          {/* Foreground circle with animation */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={mounted ? offset : circumference}
            className={`transition-all duration-1000 ease-out ${scoreColor}`}
          />
        </svg>

        {/* Score text in the middle */}
        <div className="absolute flex flex-col items-center justify-center">
          <div className={`text-5xl font-bold ${scoreColor}`}>{score}</div>
          <div className="text-sm text-muted-foreground">out of 100</div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="flex items-center justify-center space-x-2">
          <h3 className={`text-xl font-semibold ${scoreColor}`}>{scoreStatus}</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Your financial health score is calculated based on savings rate, debt-to-income ratio, emergency fund,
                  and investment diversification.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Your financial health is good, but there's room for improvement in your emergency fund.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="finance-stat">
          <div className="finance-stat-label">Savings Rate</div>
          <div className="finance-stat-value text-green-500">45.6%</div>
        </div>
        <div className="finance-stat">
          <div className="finance-stat-label">Debt Ratio</div>
          <div className="finance-stat-value text-yellow-500">28.3%</div>
        </div>
        <div className="finance-stat">
          <div className="finance-stat-label">Emergency Fund</div>
          <div className="finance-stat-value text-orange-500">2.1 mo</div>
        </div>
        <div className="finance-stat">
          <div className="finance-stat-label">Investments</div>
          <div className="finance-stat-value text-green-500">72.5%</div>
        </div>
      </div>
    </div>
  )
}

