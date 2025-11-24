"use client"

import { useState } from "react"
import { Edit, Trash2, MoreHorizontal, TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

export interface TaxPrediction {
  id: string
  scenario: string
  description?: string
  current_tax_burden: number
  predicted_tax_burden: number
  difference: number
  notes?: string
  // API fields that might be used instead
  decision_type?: string
  estimated_tax_impact?: number
}

interface TaxPredictionItemProps {
  prediction: TaxPrediction
  onEdit: (prediction: TaxPrediction) => void
  onDelete: (id: string) => void
}

export function TaxPredictionItem({ 
  prediction, 
  onEdit, 
  onDelete 
}: TaxPredictionItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete(prediction.id)
      setConfirmDelete(false)
      toast({
        title: "Prediction deleted",
        description: "The tax prediction has been successfully deleted.",
      })
    } catch (error) {
      toast({
        title: "Error deleting prediction",
        description: "There was a problem deleting the tax prediction.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Extract metadata from notes if it exists
  let metadataValues: Record<string, any> = {};
  if (prediction.notes && prediction.notes.startsWith('{')) {
    try {
      metadataValues = JSON.parse(prediction.notes);
    } catch (e) {
      console.log('Could not parse notes as JSON:', e);
    }
  }
  
  // Get the tax burden values, checking both direct properties and metadata
  const currentTaxBurden = prediction.current_tax_burden !== undefined ? prediction.current_tax_burden : 
                          metadataValues.current_tax_burden !== undefined ? metadataValues.current_tax_burden : 0;
                          
  const predictedTaxBurden = prediction.predicted_tax_burden !== undefined ? prediction.predicted_tax_burden : 
                            metadataValues.predicted_tax_burden !== undefined ? metadataValues.predicted_tax_burden : 0;
  
  // Calculate the raw difference (current - predicted)
  // This is the opposite of what we had before
  // Positive means savings (current > predicted), negative means cost (current < predicted)
  const rawDifference = currentTaxBurden - predictedTaxBurden;
  
  // Get the difference value, checking all possible sources
  let differenceValue = prediction.difference !== undefined ? prediction.difference : 
                       prediction.estimated_tax_impact !== undefined ? prediction.estimated_tax_impact : 
                       rawDifference;
  
  // For consistency with the UI expectations, we need to ensure the sign is correct
  // If the difference is stored with the opposite convention, we need to flip it
  if (prediction.difference !== undefined || prediction.estimated_tax_impact !== undefined) {
    // If the stored difference doesn't match our calculation direction, we need to flip it
    // This handles cases where the API might store it as (predicted - current) instead of (current - predicted)
    const storedDiffSign = Math.sign(differenceValue);
    const calculatedDiffSign = Math.sign(rawDifference);
    
    // If the signs don't match and neither is zero, we might need to flip
    if (storedDiffSign !== 0 && calculatedDiffSign !== 0 && storedDiffSign !== calculatedDiffSign) {
      // Only flip if we're confident the convention is different
      if (Math.abs(predictedTaxBurden - currentTaxBurden) > 0) {
        differenceValue = -differenceValue;
      }
    }
  }
  
  // Determine if the prediction is positive (profit/green) or negative (loss/red)
  // Positive difference (current > predicted) is green
  // Negative difference (current < predicted) is red
  const isPositive = differenceValue > 0;
  
  // The display value is just the difference value - no need to modify it further
  const displayValue = differenceValue;
  
  // Get the actual notes content (if it's not JSON or if there are user_notes in the metadata)
  const displayNotes = metadataValues.user_notes || 
                     (!prediction.notes?.startsWith('{') ? prediction.notes : '')
  
  return (
    <>
      <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="mt-1">
          {isPositive ? (
            <TrendingDown className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingUp className="h-5 w-5 text-red-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{prediction.scenario}</h4>
            <div className="flex items-center space-x-2">
              <Badge variant={isPositive ? "default" : "destructive"}>
                {isPositive ? "Savings" : "Cost"}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(prediction)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {prediction.description && (
            <p className="text-sm text-muted-foreground mt-1">{prediction.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div>
              <p className="text-sm text-muted-foreground">Current Tax Burden</p>
              <p className="font-medium">{formatCurrency(currentTaxBurden)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Predicted Tax Burden</p>
              <p className="font-medium">{formatCurrency(predictedTaxBurden)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Difference</p>
              <p className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(displayValue)}
              </p>
            </div>
          </div>
          
          {displayNotes && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Note: {displayNotes}
            </p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tax Prediction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{prediction.scenario}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
