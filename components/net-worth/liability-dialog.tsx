"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { LiabilityForm } from "./liability-form"
import { deleteLiability } from "@/app/actions/net-worth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Liability {
  id: string
  name: string
  type: string
  amount: number
  interest_rate?: number
  due_date?: string
  description?: string
}

interface LiabilityDialogProps {
  liability?: Liability
  variant?: "add" | "edit" | "delete"
  trigger?: React.ReactNode
  className?: string
}

export function LiabilityDialog({ 
  liability, 
  variant = "add", 
  trigger,
  className
}: LiabilityDialogProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    setOpen(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!liability?.id) return
    
    setIsDeleting(true)
    try {
      await deleteLiability(liability.id)
      toast.success("Liability deleted successfully")
      router.refresh()
    } catch (error) {
      console.error("Error deleting liability:", error)
      toast.error("Failed to delete liability")
    } finally {
      setIsDeleting(false)
    }
  }

  // For Add/Edit variants
  if (variant === "add" || variant === "edit") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button 
              variant={variant === "add" ? "default" : "outline"} 
              size={variant === "add" ? "sm" : "icon"}
              className={className}
            >
              {variant === "add" ? (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Liability
                </>
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {variant === "add" ? "Add New Liability" : "Edit Liability"}
            </DialogTitle>
            <DialogDescription>
              {variant === "add" 
                ? "Add a new liability to track in your net worth calculation." 
                : "Update the details of your existing liability."}
            </DialogDescription>
          </DialogHeader>
          <LiabilityForm 
            liability={liability} 
            onSuccess={handleSuccess} 
            onCancel={() => setOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    )
  }

  // For Delete variant
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="icon"
            className={className}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Liability</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {liability?.name}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
