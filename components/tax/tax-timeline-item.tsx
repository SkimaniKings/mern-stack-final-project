"use client"

import { useState } from "react"
import { Clock, CheckCircle, Edit, Trash2, MoreHorizontal, AlertCircle } from "lucide-react"
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
import { formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

export interface TaxTimelineItem {
  id: string
  title: string
  description: string
  due_date: string
  is_recurring: boolean
  recurrence_pattern?: string
  is_completed: boolean
  type?: string
}

interface TaxTimelineItemProps {
  timelineItem: TaxTimelineItem
  onEdit: (timelineItem: TaxTimelineItem) => void
  onDelete: (id: string) => void
  onToggleComplete: (id: string, isCompleted: boolean) => void
}

export function TaxTimelineItem({ 
  timelineItem, 
  onEdit, 
  onDelete, 
  onToggleComplete 
}: TaxTimelineItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleToggleComplete = async () => {
    setIsLoading(true)
    try {
      await onToggleComplete(timelineItem.id, !timelineItem.is_completed)
      toast({
        title: timelineItem.is_completed ? "Marked as pending" : "Marked as completed",
        description: `"${timelineItem.title}" has been updated.`,
      })
    } catch (error) {
      toast({
        title: "Error updating status",
        description: "There was a problem updating the timeline item status.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete(timelineItem.id)
      setConfirmDelete(false)
      toast({
        title: "Timeline item deleted",
        description: "The timeline item has been successfully deleted.",
      })
    } catch (error) {
      toast({
        title: "Error deleting timeline item",
        description: "There was a problem deleting the timeline item.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate if the due date is in the past and the item is not completed
  const isPastDue = new Date(timelineItem.due_date) < new Date() && !timelineItem.is_completed

  return (
    <>
      <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="mt-1">
          {timelineItem.is_completed ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : isPastDue ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <Clock className="h-5 w-5 text-amber-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{timelineItem.title}</h4>
            <div className="flex items-center space-x-2">
              <Badge variant={
                timelineItem.is_completed 
                  ? "default" 
                  : isPastDue 
                    ? "destructive" 
                    : "outline"
              }>
                {timelineItem.is_completed 
                  ? "Completed" 
                  : isPastDue 
                    ? "Past Due" 
                    : formatDate(timelineItem.due_date)
                }
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(timelineItem)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleComplete}>
                    {timelineItem.is_completed ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 text-amber-500" />
                        Mark as Pending
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Mark as Completed
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{timelineItem.description}</p>
          {timelineItem.is_recurring && (
            <div className="flex items-center mt-1">
              <Badge variant="secondary" className="text-xs">
                {timelineItem.recurrence_pattern || "Recurring"}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Timeline Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{timelineItem.title}"? This action cannot be undone.
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
