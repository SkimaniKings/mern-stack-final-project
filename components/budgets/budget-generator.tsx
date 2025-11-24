"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { generateAIBudget, generate503020Budget, generateTraditionalBudget, generateZeroBasedBudget } from "@/lib/budget/budget-models"
import type { BudgetModel, BudgetModelType, RiskLevel } from "@/types/budget"

interface BudgetGeneratorProps {
  monthlyIncome: number
  spendingHistory: any[]
  onBudgetGenerated: (budget: BudgetModel) => void
}

export function BudgetGenerator({ monthlyIncome, spendingHistory, onBudgetGenerated }: BudgetGeneratorProps) {
  const [selectedModel, setSelectedModel] = useState<BudgetModelType>("traditional")
  const [riskTolerance, setRiskTolerance] = useState<RiskLevel>("medium")
  const [goals, setGoals] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      let budget: BudgetModel

      if (selectedModel === "ai") {
        budget = await generateAIBudget(monthlyIncome, spendingHistory, goals, riskTolerance)
      } else {
        switch (selectedModel) {
          case "50-30-20":
            budget = generate503020Budget(monthlyIncome)
            break
          case "zero-based":
            budget = generateZeroBasedBudget(monthlyIncome, [])
            break
          default:
            budget = generateTraditionalBudget(monthlyIncome)
        }
      }

      onBudgetGenerated(budget)
    } catch (error) {
      console.error("Error generating budget:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>AI Budget Generator</CardTitle>
        <CardDescription>
          Generate a personalized budget based on your income, goals, and risk tolerance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Budget Model</Label>
          <Select value={selectedModel} onValueChange={(value: BudgetModelType) => setSelectedModel(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a budget model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="traditional">Traditional Budget</SelectItem>
              <SelectItem value="50-30-20">50/30/20 Rule</SelectItem>
              <SelectItem value="zero-based">Zero-Based Budget</SelectItem>
              <SelectItem value="envelope">Envelope System</SelectItem>
              <SelectItem value="ai">AI Recommended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Risk Tolerance</Label>
          <Select value={riskTolerance} onValueChange={(value: RiskLevel) => setRiskTolerance(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select risk tolerance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Conservative</SelectItem>
              <SelectItem value="medium">Moderate</SelectItem>
              <SelectItem value="high">Aggressive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Monthly Savings Goal</Label>
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Enter amount"
              onChange={(e) => {
                const goal = {
                  type: "savings",
                  target: parseFloat(e.target.value),
                  priority: 1,
                  currentProgress: 0,
                }
                setGoals([goal])
              }}
            />
            <span className="text-sm text-gray-500">$</span>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? "Generating..." : "Generate Budget"}
        </Button>
      </CardContent>
    </Card>
  )
}
