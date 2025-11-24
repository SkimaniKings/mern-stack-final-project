"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Brain, Loader2 } from "lucide-react"
import Link from "next/link"
import { AIBudgetResult } from "@/components/budgeting/ai-budget-result"

export default function AIBudgetGeneratorPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedBudget, setGeneratedBudget] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("inputs")

  // Mock function to simulate AI budget generation
  const generateBudget = () => {
    setIsGenerating(true)
    setActiveTab("result")

    // Simulate API call delay
    setTimeout(() => {
      const mockBudget = {
        monthlyIncome: 5000,
        categories: [
          { name: "Housing", amount: 1500, percentage: 30 },
          { name: "Food", amount: 600, percentage: 12 },
          { name: "Transportation", amount: 400, percentage: 8 },
          { name: "Utilities", amount: 300, percentage: 6 },
          { name: "Insurance", amount: 200, percentage: 4 },
          { name: "Debt Repayment", amount: 500, percentage: 10 },
          { name: "Savings", amount: 750, percentage: 15 },
          { name: "Entertainment", amount: 250, percentage: 5 },
          { name: "Personal Care", amount: 150, percentage: 3 },
          { name: "Miscellaneous", amount: 350, percentage: 7 },
        ],
        savingsGoal: {
          name: "Emergency Fund",
          targetAmount: 15000,
          currentAmount: 5000,
          monthlyContribution: 500,
          estimatedCompletionDate: "2024-06-15",
        },
        recommendations: [
          "Consider reducing your entertainment budget by $50 to increase your savings rate.",
          "Your housing costs are within the recommended 30% of income.",
          "Look into refinancing your debt to reduce interest payments.",
          "Set up automatic transfers to your savings account on payday.",
        ],
      }

      setGeneratedBudget(mockBudget)
      setIsGenerating(false)
    }, 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Budget Generator</h1>
          <p className="text-muted-foreground mt-2">
            Create a personalized budget based on your financial goals and spending history
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/budgeting">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Budgeting
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="inputs">Budget Inputs</TabsTrigger>
          <TabsTrigger value="result" disabled={!generatedBudget && !isGenerating}>
            Generated Budget
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inputs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>Provide details about your income and financial situation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monthly-income">Monthly Income (after tax)</Label>
                  <Input id="monthly-income" placeholder="$5,000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="City, State" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="household-size">Household Size</Label>
                  <Select defaultValue="1">
                    <SelectTrigger id="household-size">
                      <SelectValue placeholder="Select household size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 person</SelectItem>
                      <SelectItem value="2">2 people</SelectItem>
                      <SelectItem value="3">3 people</SelectItem>
                      <SelectItem value="4">4 people</SelectItem>
                      <SelectItem value="5">5+ people</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="housing-type">Housing Type</Label>
                  <Select defaultValue="rent">
                    <SelectTrigger id="housing-type">
                      <SelectValue placeholder="Select housing type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Renting</SelectItem>
                      <SelectItem value="own">Homeowner with mortgage</SelectItem>
                      <SelectItem value="paid">Homeowner (paid off)</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Goals</CardTitle>
              <CardDescription>Tell us about your financial goals to help customize your budget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary-goal">Primary Financial Goal</Label>
                <Select defaultValue="emergency">
                  <SelectTrigger id="primary-goal">
                    <SelectValue placeholder="Select your primary goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">Build emergency fund</SelectItem>
                    <SelectItem value="debt">Pay off debt</SelectItem>
                    <SelectItem value="save">Save for large purchase</SelectItem>
                    <SelectItem value="invest">Invest for retirement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="savings-target">Monthly Savings Target</Label>
                <div className="flex items-center space-x-2">
                  <Slider id="savings-target" defaultValue={[20]} max={50} step={1} />
                  <span className="w-12 text-center">20%</span>
                </div>
                <p className="text-xs text-muted-foreground">Percentage of income you aim to save each month</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-description">Goal Description (optional)</Label>
                <Textarea
                  id="goal-description"
                  placeholder="Describe your financial goals in more detail..."
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget Preferences</CardTitle>
              <CardDescription>Customize how your budget should be structured</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget-model">Budget Model</Label>
                <Select defaultValue="50-30-20">
                  <SelectTrigger id="budget-model">
                    <SelectValue placeholder="Select budget model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50-30-20">50/30/20 Rule</SelectItem>
                    <SelectItem value="zero-based">Zero-based Budget</SelectItem>
                    <SelectItem value="envelope">Envelope System</SelectItem>
                    <SelectItem value="traditional">Traditional Budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="use-history" />
                <Label htmlFor="use-history">Use my spending history to inform budget</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="auto-adjust" defaultChecked />
                <Label htmlFor="auto-adjust">Enable automatic budget adjustments</Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={generateBudget} className="w-full sm:w-auto">
              <Brain className="mr-2 h-4 w-4" />
              Generate AI Budget
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="result" className="space-y-4">
          {isGenerating ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-center text-muted-foreground">
                  Our AI is analyzing your financial information and generating a personalized budget...
                </p>
              </CardContent>
            </Card>
          ) : generatedBudget ? (
            <AIBudgetResult budget={generatedBudget} />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}

