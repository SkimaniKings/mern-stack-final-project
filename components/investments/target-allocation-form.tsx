"use client"

import { useState, useEffect } from "react"
import { saveTargetAllocation } from "@/app/actions/investments"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface TargetAllocationFormProps {
  currentTargets: Record<string, number>
  currentAllocation: Record<string, number>
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A28DFF",
  "#FF6B6B",
  "#4ECDC4",
  "#FF9F1C",
  "#6A0572",
  "#AB83A1",
]

export function TargetAllocationForm({ currentTargets, currentAllocation }: TargetAllocationFormProps) {
  const { toast } = useToast()
  const [targets, setTargets] = useState<Record<string, number>>(currentTargets || {})
  const [total, setTotal] = useState(100)
  const [isAdjusting, setIsAdjusting] = useState(false)

  // Initialize with default asset types if none exist
  useEffect(() => {
    if (Object.keys(targets).length === 0) {
      setTargets({
        Stocks: 60,
        Bonds: 30,
        Cash: 5,
        Alternative: 5,
      })
    }
  }, [targets])

  // Calculate total whenever targets change
  useEffect(() => {
    const newTotal = Object.values(targets).reduce((sum, value) => sum + value, 0)
    setTotal(newTotal)
  }, [targets])

  const handleSliderChange = (type: string, value: number[]) => {
    setIsAdjusting(true)
    setTargets((prev) => {
      const newTargets = { ...prev, [type]: value[0] }
      return newTargets
    })
  }

  const handleInputChange = (type: string, value: string) => {
    const numValue = Number.parseFloat(value) || 0
    setTargets((prev) => ({ ...prev, [type]: numValue }))
  }

  const handleAddAssetType = () => {
    setTargets((prev) => ({ ...prev, [`New Asset Type ${Object.keys(prev).length + 1}`]: 0 }))
  }

  const handleRemoveAssetType = (type: string) => {
    setTargets((prev) => {
      const newTargets = { ...prev }
      delete newTargets[type]
      return newTargets
    })
  }

  const handleReset = () => {
    setTargets(currentTargets)
  }

  const handleAutoBalance = () => {
    // Distribute the remainder to make total 100%
    const currentTotal = Object.values(targets).reduce((sum, value) => sum + value, 0)
    const remainder = 100 - currentTotal

    if (remainder === 0) return

    // Distribute proportionally to current allocation
    const types = Object.keys(targets)
    const adjustments = types.map((type) => {
      const currentValue = targets[type]
      const proportion = currentValue / currentTotal
      return {
        type,
        adjustment: remainder * proportion,
      }
    })

    const newTargets = { ...targets }
    adjustments.forEach(({ type, adjustment }) => {
      newTargets[type] = Math.max(0, Math.round((targets[type] + adjustment) * 10) / 10)
    })

    // Ensure we hit exactly 100% by adjusting the largest allocation if needed
    const newTotal = Object.values(newTargets).reduce((sum, value) => sum + value, 0)
    if (newTotal !== 100) {
      const largestType = Object.entries(newTargets).sort((a, b) => b[1] - a[1])[0][0]
      newTargets[largestType] += 100 - newTotal
    }

    setTargets(newTargets)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      // Create FormData from targets
      const formData = new FormData()
      Object.entries(targets).forEach(([type, value]) => {
        formData.append(`target_${type}`, value.toString())
      })

      await saveTargetAllocation(formData)

      toast({
        title: "Target allocation saved",
        description: "Your investment allocation targets have been updated.",
      })
    } catch (error) {
      toast({
        title: "Error saving targets",
        description: "There was an error saving your allocation targets.",
        variant: "destructive",
      })
    }
  }

  // Prepare data for pie chart
  const chartData = Object.entries(targets).map(([type, value]) => ({
    name: type,
    value,
    current: currentAllocation[type] || 0,
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Target Asset Allocation</CardTitle>
          <CardDescription>Set your desired investment allocation targets</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {Object.entries(targets).map(([type, value]) => (
              <div key={type} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor={`target-${type}`} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: COLORS[Object.keys(targets).indexOf(type) % COLORS.length],
                      }}
                    />
                    {type}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`target-${type}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={value}
                      onChange={(e) => handleInputChange(type, e.target.value)}
                      className="w-16 text-right"
                    />
                    <span className="text-sm">%</span>
                    {Object.keys(targets).length > 2 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAssetType(type)}>
                        &times;
                      </Button>
                    )}
                  </div>
                </div>
                <Slider
                  value={[value]}
                  min={0}
                  max={100}
                  step={0.1}
                  onValueChange={(value) => handleSliderChange(type, value)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Current: {(currentAllocation[type] || 0).toFixed(1)}%</span>
                  <span>Difference: {((value || 0) - (currentAllocation[type] || 0)).toFixed(1)}%</span>
                </div>
              </div>
            ))}

            <div className={`text-sm font-medium ${Math.abs(total - 100) > 0.1 ? "text-red-500" : "text-green-500"}`}>
              Total: {total.toFixed(1)}% {Math.abs(total - 100) > 0.1 ? "(Should be 100%)" : "✓"}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleAddAssetType}>
                Add Asset Type
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAutoBalance} disabled={total === 100}>
                Auto-Balance to 100%
              </Button>
            </div>

            <Button type="submit" className="w-full" disabled={Math.abs(total - 100) > 0.1}>
              Save Target Allocation
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target vs Current Allocation</CardTitle>
          <CardDescription>Visual comparison of your target and current allocation</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value.toFixed(2)}%`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Allocation Differences</h4>
            {chartData.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm">{item.name}</span>
                </div>
                <div className="text-sm">
                  <span
                    className={
                      Math.abs(item.value - item.current) > 5
                        ? "text-red-500"
                        : Math.abs(item.value - item.current) > 2
                          ? "text-amber-500"
                          : "text-green-500"
                    }
                  >
                    {item.value.toFixed(1)}% vs {item.current.toFixed(1)}% ({(item.value - item.current).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {Math.abs(total - 100) > 0.1
              ? "Adjust your allocation to total 100% before saving"
              : "Your allocation is balanced and ready to save"}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

