"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Trash2 } from "lucide-react"
import { deleteInvestment } from "@/app/actions/add-investment"

interface DeleteInvestmentProps {
  investmentId: string;
  investmentName: string;
  onInvestmentDeleted?: () => void;
  className?: string;
}

export function DeleteInvestment({ 
  investmentId, 
  investmentName, 
  onInvestmentDeleted, 
  className 
}: DeleteInvestmentProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      const result = await deleteInvestment(investmentId)
      
      if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(result.error as string)
      }
      
      // Show success message
      toast({
        title: "Investment Deleted",
        description: `Successfully deleted ${investmentName} from your portfolio.`,
      })
      
      // Close dialog
      setOpen(false)
      
      // Notify parent component
      if (onInvestmentDeleted) {
        onInvestmentDeleted()
      }
    } catch (error) {
      console.error("Error deleting investment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete investment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={className} variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Investment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {investmentName}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Delete Investment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
