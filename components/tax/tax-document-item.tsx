"use client"

import { useState } from "react"
import { FileText, Edit, Trash2, CheckCircle, AlertCircle, MoreHorizontal, Download } from "lucide-react"
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

export interface TaxDocument {
  id: string
  name: string
  type: string
  status: string
  due_date: string
  file_url?: string
  notes?: string
  categories?: {
    id: string
    name: string
    type: string
    color: string
  }
}

interface TaxDocumentItemProps {
  document: TaxDocument
  onEdit: (document: TaxDocument) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
}

export function TaxDocumentItem({ document, onEdit, onDelete, onStatusChange }: TaxDocumentItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleStatusChange = async (status: string) => {
    setIsLoading(true)
    try {
      onStatusChange(document.id, status)
      toast({
        title: "Status updated",
        description: `Document status changed to ${status}`,
      })
    } catch (error) {
      toast({
        title: "Error updating status",
        description: "There was a problem updating the document status.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete(document.id)
      setConfirmDelete(false)
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      })
    } catch (error) {
      toast({
        title: "Error deleting document",
        description: "There was a problem deleting the document.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "received":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "processed":
        return "bg-green-100 text-green-800 border-green-200"
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <>
      <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="mt-1">
          <FileText className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{document.name}</h4>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs font-medium">
                  {document.type}
                </Badge>
                <Badge className={getStatusColor(document.status)}>
                  {document.status}
                </Badge>
              </div>
            </div>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {document.file_url && (
                    <DropdownMenuItem onClick={() => window.open(document.file_url, '_blank')}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(document)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("pending")}
                    disabled={document.status === "pending"}
                  >
                    <AlertCircle className="mr-2 h-4 w-4 text-yellow-500" />
                    Mark as Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("received")}
                    disabled={document.status === "received"}
                  >
                    <FileText className="mr-2 h-4 w-4 text-blue-500" />
                    Mark as Received
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("processed")}
                    disabled={document.status === "processed"}
                  >
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Mark as Processed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {document.categories && (
            <div className="flex items-center space-x-2 mt-1">
              <Badge 
                variant="outline" 
                style={{ 
                  backgroundColor: document.categories.color + '20', 
                  color: document.categories.color 
                }}
              >
                {document.categories.name}
              </Badge>
            </div>
          )}
          {document.due_date && (
            <p className="text-sm text-muted-foreground mt-1">
              Due: {formatDate(document.due_date)}
            </p>
          )}
          {document.notes && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {document.notes}
            </p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{document.name}"? This action cannot be undone.
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
