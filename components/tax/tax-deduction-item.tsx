"use client"

import { useState } from "react"
import { Edit, Trash2, MoreHorizontal, DollarSign, Percent } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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

export interface TaxDeduction {
  id: string
  name: string
  description?: string
  amount: number
  max_amount?: number
  category_id?: string
  category?: {
    id: string
    name: string
    type: string
    color: string
  }
  tax_year: string
  date_added?: string
  notes?: string
}

interface TaxDeductionItemProps {
  deduction: TaxDeduction
  onEdit: (deduction: TaxDeduction) => void
  onDelete: (id: string) => void
}

export function TaxDeductionItem({ 
  deduction, 
  onEdit, 
  onDelete 
}: TaxDeductionItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete(deduction.id)
      setConfirmDelete(false)
      toast({
        title: "Deduction deleted",
        description: "The tax deduction has been successfully deleted.",
      })
    } catch (error) {
      toast({
        title: "Error deleting deduction",
        description: "There was a problem deleting the tax deduction.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate percentage of max amount used
  const percentUsed = deduction.max_amount 
    ? Math.min(Math.round((deduction.amount / deduction.max_amount) * 100), 100) 
    : 100

  // Determine progress color based on percentage
  const getProgressColor = () => {
    if (percentUsed < 50) return "bg-green-500"
    if (percentUsed < 80) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <>
      <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="mt-1">
          <DollarSign className="h-5 w-5 text-green-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{deduction.name}</h4>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {deduction.tax_year}
              </Badge>
              {deduction.category && (
                <Badge 
                  variant="outline" 
                  style={{ 
                    backgroundColor: `${deduction.category.color}20`, 
                    color: deduction.category.color 
                  }}
                >
                  {deduction.category.name}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(deduction)}>
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
          
          {deduction.description && (
            <p className="text-sm text-muted-foreground mt-1">{deduction.description}</p>
          )}
          
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{formatCurrency(deduction.amount)}</span>
              {deduction.max_amount && (
                <span className="text-xs text-muted-foreground">
                  of {formatCurrency(deduction.max_amount)}
                </span>
              )}
            </div>
            
            {deduction.max_amount && (
              <div className="w-full">
                <Progress 
                  value={percentUsed} 
                  className="h-2" 
                  indicatorClassName={getProgressColor()}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Percent className="h-3 w-3 mr-1" />
                    {percentUsed}% used
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {deduction.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Note: {deduction.notes}
            </p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tax Deduction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deduction.name}"? This action cannot be undone.
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
