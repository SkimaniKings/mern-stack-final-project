"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Budget } from "@/types/budget"
import { deleteBudget } from "@/app/actions/budgets"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog"
import { BudgetForm } from "./budget-form"

interface BudgetMenuProps {
  budget: Budget
  onAction: () => void
}

export function BudgetMenu({ budget, onAction }: BudgetMenuProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEditSuccess = () => {
    setIsEditOpen(false)
    onAction()
    toast.success("Budget updated successfully")
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteBudget(budget.id)
      toast.success("Budget deleted successfully")
      setIsDeleteOpen(false)
      onAction()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete budget")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Edit Dialog: Controlled externally */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Update your budget details and allocations
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <BudgetForm
              budget={budget}
              onSuccess={handleEditSuccess}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog: Controlled externally */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the budget "{budget.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dropdown Menu which triggers the dialogs */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsDeleteOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
            <Trash className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
