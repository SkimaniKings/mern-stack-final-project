"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { addGoalContribution } from "@/app/actions/goals"

interface AddContributionFormProps {
  goalId: string
  onComplete?: () => void
}

export function AddContributionForm({ goalId, onComplete }: AddContributionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [source, setSource] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate inputs
      const numAmount = parseFloat(amount)
      if (isNaN(numAmount) || numAmount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid positive amount",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Create form data
      const formData = new FormData()
      formData.append("amount", amount)
      formData.append("source", source || "Manual Contribution")

      console.log("Submitting contribution:", { goalId, amount, source })

      // Call server action
      const result = await addGoalContribution(goalId, formData)

      if (result.error) {
        console.error("Contribution error:", result.error)
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Success handling
      console.log("Contribution success:", result)
      toast({
        title: "Success",
        description: "Contribution added successfully!",
      })

      // Reset form
      setAmount("")
      setSource("")

      // Force a refresh to update the UI
      router.refresh()
      
      // Notify parent component
      if (onComplete) {
        setTimeout(() => {
          onComplete()
        }, 500) // Small delay to ensure the refresh has time to work
      }
    } catch (error) {
      console.error("Contribution submission error:", error)
      toast({
        title: "Error",
        description: "Failed to add contribution. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Add Contribution</CardTitle>
          <CardDescription>Record a new contribution towards your goal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source (Optional)</Label>
            <Input
              id="source"
              placeholder="e.g., Salary, Bonus, Investment Return, Gift"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Describe where this money came from</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onComplete?.()} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Contribution
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
