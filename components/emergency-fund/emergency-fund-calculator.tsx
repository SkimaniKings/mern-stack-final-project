"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { formatCurrency } from "@/lib/utils"

export function EmergencyFundCalculator() {
  const [monthlyExpenses, setMonthlyExpenses] = useState(2500)
  const [months, setMonths] = useState(6)
  const [currentSavings, setCurrentSavings] = useState(8500)
  const [monthlySavings, setMonthlySavings] = useState(500)

  const targetAmount = monthlyExpenses * months
  const amountNeeded = Math.max(0, targetAmount - currentSavings)
  const timeToGoal = amountNeeded > 0 ? Math.ceil(amountNeeded / monthlySavings) : 0

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="monthly-expenses">Monthly Expenses</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm">$</span>
              <Input
                id="monthly-expenses"
                type="number"
                min="0"
                step="100"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(Number.parseInt(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your average monthly expenses including rent/mortgage, utilities, food, etc.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="months">Months of Coverage</Label>
            <div className="space-y-4">
              <Slider
                id="months"
                min={1}
                max={12}
                step={1}
                value={[months]}
                onValueChange={(value) => setMonths(value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 month</span>
                <span>3 months</span>
                <span>6 months</span>
                <span>9 months</span>
                <span>12 months</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Financial experts recommend 3-6 months of expenses saved in an emergency fund.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-savings">Current Emergency Savings</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm">$</span>
              <Input
                id="current-savings"
                type="number"
                min="0"
                step="100"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(Number.parseInt(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground">How much you currently have saved in your emergency fund.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly-savings">Monthly Contribution</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm">$</span>
              <Input
                id="monthly-savings"
                type="number"
                min="0"
                step="50"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(Number.parseInt(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              How much you can contribute to your emergency fund each month.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Target Emergency Fund</div>
                  <div className="text-3xl font-bold">{formatCurrency(targetAmount)}</div>
                  <div className="text-sm text-muted-foreground">
                    {months} month{months !== 1 ? "s" : ""} of expenses
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Current Progress</div>
                  <div className="text-3xl font-bold">{formatCurrency(currentSavings)}</div>
                  <div className="text-sm text-muted-foreground">
                    {Math.min(months, (currentSavings / monthlyExpenses).toFixed(1))} month
                    {Math.min(months, (currentSavings / monthlyExpenses).toFixed(1)) !== 1 ? "s" : ""} of coverage
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Amount Still Needed</div>
                  <div className="text-3xl font-bold">{formatCurrency(amountNeeded)}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Time to Reach Goal</div>
                  <div className="text-3xl font-bold">
                    {timeToGoal} month{timeToGoal !== 1 ? "s" : ""}
                  </div>
                  <div className="text-sm text-muted-foreground">At {formatCurrency(monthlySavings)} per month</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full">Update My Goal</Button>
        </div>
      </div>
    </div>
  )
}

