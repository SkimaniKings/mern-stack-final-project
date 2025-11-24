"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Plus, ArrowDown } from "lucide-react"
import { useState } from "react"
import { EmergencyFundDepositDialog } from "./emergency-fund-deposit-dialog"

export function EmergencyFundOverview() {
  const [depositDialogOpen, setDepositDialogOpen] = useState(false)
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)

  // This would come from your database in a real app
  const emergencyFundData = {
    currentAmount: 8500,
    targetAmount: 15000,
    monthlyContribution: 500,
    timeToGoal: 13, // months
    riskCoverage: 3.4, // months
    monthlyExpenses: 2500,
    lastDeposit: {
      amount: 500,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  }

  const progressPercentage = Math.min(
    100,
    Math.round((emergencyFundData.currentAmount / emergencyFundData.targetAmount) * 100),
  )

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Current Balance</CardTitle>
            <CardDescription>Your emergency fund savings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(emergencyFundData.currentAmount)}</div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress to goal</span>
                <span className="font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            <div className="mt-4 flex space-x-2">
              <Button onClick={() => setDepositDialogOpen(true)} className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Deposit
              </Button>
              <Button variant="outline" onClick={() => setWithdrawDialogOpen(true)} className="flex-1">
                <ArrowDown className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Goal Progress</CardTitle>
            <CardDescription>Your emergency fund target</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Target Amount</div>
              <div className="text-2xl font-bold">{formatCurrency(emergencyFundData.targetAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Monthly Contribution</div>
              <div className="text-2xl font-bold">{formatCurrency(emergencyFundData.monthlyContribution)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Time to Goal</div>
              <div className="text-2xl font-bold">
                {emergencyFundData.timeToGoal} month{emergencyFundData.timeToGoal !== 1 ? "s" : ""}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Risk Coverage</CardTitle>
            <CardDescription>How long your fund will last</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Months of Expenses Covered</div>
              <div className="text-2xl font-bold">{emergencyFundData.riskCoverage.toFixed(1)} months</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Monthly Expenses</div>
              <div className="text-2xl font-bold">{formatCurrency(emergencyFundData.monthlyExpenses)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Last Deposit</div>
              <div className="text-lg font-medium">
                {formatCurrency(emergencyFundData.lastDeposit.amount)} on{" "}
                {emergencyFundData.lastDeposit.date.toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EmergencyFundDepositDialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen} isDeposit={true} />

      <EmergencyFundDepositDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen} isDeposit={false} />
    </>
  )
}

