"use client"

import type React from "react"

import { useState } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"

interface DebtStrategyProps {
  strategy: "avalanche" | "snowball"
  onStrategyChange: (strategy: "avalanche" | "snowball") => void
  extraPayment: number
  onExtraPaymentChange: (amount: number) => void
}

export function DebtStrategySelector({
  strategy,
  onStrategyChange,
  extraPayment,
  onExtraPaymentChange,
}: DebtStrategyProps) {
  const [sliderValue, setSliderValue] = useState(extraPayment)

  const handleStrategyChange = (value: string) => {
    onStrategyChange(value as "avalanche" | "snowball")
  }

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value[0])
    onExtraPaymentChange(value[0])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value) || 0
    setSliderValue(value)
    onExtraPaymentChange(value)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Choose your payoff strategy</h3>
        <RadioGroup
          value={strategy}
          onValueChange={handleStrategyChange}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="flex items-start space-x-2 rounded-md border p-4">
            <RadioGroupItem value="avalanche" id="avalanche" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="avalanche" className="font-medium">
                Debt Avalanche
              </Label>
              <p className="text-sm text-muted-foreground">
                Pay off highest interest rate debts first. This saves the most money over time.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2 rounded-md border p-4">
            <RadioGroupItem value="snowball" id="snowball" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="snowball" className="font-medium">
                Debt Snowball
              </Label>
              <p className="text-sm text-muted-foreground">
                Pay off smallest balances first. This provides psychological wins to keep you motivated.
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Extra monthly payment</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              min="0"
              max="1000"
              value={sliderValue}
              onChange={handleInputChange}
              className="w-20 h-8"
            />
          </div>
        </div>
        <Slider value={[sliderValue]} min={0} max={1000} step={25} onValueChange={handleSliderChange} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>$0</span>
          <span>$250</span>
          <span>$500</span>
          <span>$750</span>
          <span>$1,000</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Adding an extra {formatCurrency(extraPayment)} to your monthly payments can significantly reduce your payoff
          time.
        </p>
      </div>
    </div>
  )
}

