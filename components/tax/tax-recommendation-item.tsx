"use client"

import { useState } from "react"
import { Edit, Trash2, MoreHorizontal, AlertTriangle, CheckCircle, PiggyBank } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

export interface TaxRecommendation {
  id: string
  type: string
  priority: string
  title: string
  description: string
  potential_savings?: number
  action_items?: string[]
  deadline?: string
  is_completed: boolean
}

interface TaxRecommendationItemProps {
  recommendation: TaxRecommendation
  onEdit: (recommendation: TaxRecommendation) => void
  onDelete: (id: string) => void
  onToggleComplete: (id: string, isCompleted: boolean) => void
}

export function TaxRecommendationItem({ 
  recommendation, 
  onEdit, 
  onDelete,
  onToggleComplete 
}: TaxRecommendationItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleToggleComplete = async () => {
    setIsLoading(true)
    try {
      await onToggleComplete(recommendation.id, !recommendation.is_completed)
      toast({
        title: recommendation.is_completed ? "Marked as pending" : "Marked as completed",
        description: `"${recommendation.title}" has been updated.`,
      })
    } catch (error) {
      toast({
        title: "Error updating status",
        description: "There was a problem updating the recommendation status.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete(recommendation.id)
      setConfirmDelete(false)
      toast({
        title: "Recommendation deleted",
        description: "The recommendation has been successfully deleted.",
      })
    } catch (error) {
      toast({
        title: "Error deleting recommendation",
        description: "There was a problem deleting the recommendation.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="mt-1">
          {recommendation.priority === "urgent" ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : recommendation.priority === "high" ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{recommendation.title}</h4>
            <div className="flex items-center space-x-2">
              <Badge variant={
                recommendation.priority === "urgent" ? "destructive" : 
                recommendation.priority === "high" ? "default" : 
                "secondary"
              }>
                {recommendation.priority}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(recommendation)}>
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
          
          <p className="text-sm text-muted-foreground mt-1">{recommendation.description}</p>
          
          {recommendation.potential_savings && (
            <p className="text-sm font-medium text-green-600 mt-1 flex items-center">
              <PiggyBank className="mr-1 h-4 w-4" />
              Potential savings: {formatCurrency(recommendation.potential_savings)}
            </p>
          )}
          
          {recommendation.action_items && recommendation.action_items.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium">Action Items:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {recommendation.action_items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            {recommendation.deadline && (
              <p className="text-xs text-muted-foreground">
                Deadline: {formatDate(recommendation.deadline)}
              </p>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`complete-${recommendation.id}`}
                checked={recommendation.is_completed}
                onCheckedChange={handleToggleComplete}
              />
              <label
                htmlFor={`complete-${recommendation.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {recommendation.is_completed ? "Completed" : "Mark as completed"}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recommendation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{recommendation.title}"? This action cannot be undone.
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
