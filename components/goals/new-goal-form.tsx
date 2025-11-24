"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createGoal } from "@/app/actions/goals"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Target, ImageIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function NewGoalForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [targetDate, setTargetDate] = useState<Date>()
  const [showFundingOptions, setShowFundingOptions] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      formData.set("start_date", format(startDate, "yyyy-MM-dd"))
      formData.set("target_date", targetDate ? format(targetDate, "yyyy-MM-dd") : "")

      const result = await createGoal(formData)

      if (result.success && result.goal) {
        router.push(`/goals/${result.goal.id}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the basic details for your financial goal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Goal Name</Label>
              <Input id="name" name="name" placeholder="e.g., Emergency Fund, Down Payment for House" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your goal and why it's important to you"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue="emergency_fund">
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                    <SelectItem value="retirement">Retirement</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="home_purchase">Home Purchase</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="car_purchase">Car Purchase</SelectItem>
                    <SelectItem value="debt_payoff">Debt Payoff</SelectItem>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
            <CardDescription>Set your target amount and timeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="target_amount">Target Amount ($)</Label>
              <Input
                id="target_amount"
                name="target_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="10000"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>Target Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !targetDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {targetDate ? format(targetDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={targetDate}
                      onSelect={(date) => date && setTargetDate(date)}
                      initialFocus
                      disabled={(date) => date < startDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="funding_toggle" checked={showFundingOptions} onCheckedChange={setShowFundingOptions} />
              <Label htmlFor="funding_toggle">Set up automatic funding</Label>
            </div>

            {showFundingOptions && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="grid gap-2">
                  <Label htmlFor="funding_source">Funding Source</Label>
                  <Input id="funding_source" name="funding_source" placeholder="e.g., Checking Account" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="funding_amount">Amount ($)</Label>
                  <Input
                    id="funding_amount"
                    name="funding_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="100"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="funding_frequency">Frequency</Label>
                  <Select name="funding_frequency" defaultValue="monthly">
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Options</CardTitle>
            <CardDescription>Customize your goal with additional settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="image_url">Goal Image URL (Optional)</Label>
              <div className="flex gap-2">
                <Input id="image_url" name="image_url" placeholder="https://example.com/image.jpg" />
                <Button type="button" variant="outline" size="icon">
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Add an image that represents your goal for better visualization
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="is_shared" name="is_shared" />
              <Label htmlFor="is_shared">Share this goal publicly</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.push("/goals")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Creating Goal...</>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Create Goal
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  )
}

