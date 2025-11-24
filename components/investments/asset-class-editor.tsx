"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { getAssetClasses, saveTargetAllocation } from "@/app/actions/investments"

export interface AssetClass {
  id: string
  name: string
  targetAllocation: number
  currentAllocation: number
}

interface AssetClassEditorProps {
  initialAssetClasses?: AssetClass[]
}

export function AssetClassEditor({ initialAssetClasses }: AssetClassEditorProps) {
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>(initialAssetClasses || [])
  const [editedAssetClasses, setEditedAssetClasses] = useState<AssetClass[]>(assetClasses)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!initialAssetClasses)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!initialAssetClasses) {
      const fetchAssetClasses = async () => {
        try {
          const assetClassNames = await getAssetClasses()
          
          // Create asset class objects from the string array
          const formattedAssetClasses = assetClassNames.map((name, index) => ({
            id: `asset-class-${index}`,
            name,
            targetAllocation: 25, // Default equal distribution
            currentAllocation: 0,
          }))
          
          // Adjust allocations to sum to 100%
          const equalAllocation = 100 / formattedAssetClasses.length
          const adjustedAssetClasses = formattedAssetClasses.map((ac, index) => ({
            ...ac,
            targetAllocation: index === formattedAssetClasses.length - 1 
              ? 100 - (Math.floor(equalAllocation) * (formattedAssetClasses.length - 1)) 
              : Math.floor(equalAllocation)
          }))
          
          setAssetClasses(adjustedAssetClasses)
          setEditedAssetClasses(adjustedAssetClasses)
        } catch (error) {
          console.error("Error fetching asset classes:", error)
          setError("Failed to load asset classes")
        } finally {
          setIsLoading(false)
        }
      }

      fetchAssetClasses()
    }
  }, [initialAssetClasses])

  // Calculate total allocation
  const totalAllocation = editedAssetClasses.reduce((total, assetClass) => total + assetClass.targetAllocation, 0)

  // Handle slider change
  const handleSliderChange = (id: string, value: number[]) => {
    const newValue = value[0]

    // Update the asset class
    const updatedAssetClasses = editedAssetClasses.map((ac) =>
      ac.id === id ? { ...ac, targetAllocation: newValue } : ac,
    )

    setEditedAssetClasses(updatedAssetClasses)

    // Check if total is 100%
    const newTotal = updatedAssetClasses.reduce((total, assetClass) => total + assetClass.targetAllocation, 0)

    if (newTotal !== 100) {
      setError(`Total allocation is ${newTotal.toFixed(1)}%. It should be 100%.`)
    } else {
      setError(null)
    }
  }

  // Handle input change
  const handleInputChange = (id: string, value: string) => {
    const numValue = Number.parseFloat(value)

    if (isNaN(numValue)) return

    // Update the asset class
    const updatedAssetClasses = editedAssetClasses.map((ac) =>
      ac.id === id ? { ...ac, targetAllocation: numValue } : ac,
    )

    setEditedAssetClasses(updatedAssetClasses)

    // Check if total is 100%
    const newTotal = updatedAssetClasses.reduce((total, assetClass) => total + assetClass.targetAllocation, 0)

    if (newTotal !== 100) {
      setError(`Total allocation is ${newTotal.toFixed(1)}%. It should be 100%.`)
    } else {
      setError(null)
    }
  }

  // Save changes
  const handleSave = async () => {
    if (totalAllocation !== 100) {
      setError("Cannot save. Total allocation must be 100%.")
      return
    }

    setIsSaving(true)
    setSaveSuccess(false)
    try {
      // Create form data with all asset class allocations
      const formData = new FormData()
      
      // Add each asset class target allocation
      editedAssetClasses.forEach(assetClass => {
        formData.append(`target_${assetClass.name}`, assetClass.targetAllocation.toString())
      })

      // Save all allocations at once
      await saveTargetAllocation(formData)

      setAssetClasses(editedAssetClasses)
      setError(null)
      setSaveSuccess(true)
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error updating asset classes:", error)
      setError("Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading asset classes...</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {saveSuccess && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-700">Asset allocation saved successfully!</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {editedAssetClasses.map((assetClass) => (
          <div key={assetClass.id} className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="font-medium">{assetClass.name}</p>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={assetClass.targetAllocation}
                  onChange={(e) => handleInputChange(assetClass.id, e.target.value)}
                  className="w-20"
                />
                <span>%</span>
              </div>
            </div>
            <Slider
              value={[assetClass.targetAllocation]}
              min={0}
              max={100}
              step={0.1}
              onValueChange={(value) => handleSliderChange(assetClass.id, value)}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t">
        <div>
          <p className="text-sm font-medium">Total Allocation</p>
          <p className={totalAllocation === 100 ? "text-green-600" : "text-red-600"}>{totalAllocation.toFixed(1)}%</p>
        </div>
        <Button onClick={handleSave} disabled={totalAllocation !== 100 || isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
