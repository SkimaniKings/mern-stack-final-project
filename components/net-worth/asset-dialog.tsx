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
import { AssetForm } from "./asset-form"
import { deleteAsset } from "@/app/actions/net-worth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Asset {
  id: string
  name: string
  type: string
  value: number
  acquired_at?: string
  description?: string
}

interface AssetDialogProps {
  asset?: Asset
  variant?: "add" | "edit" | "delete"
  trigger?: React.ReactNode
  className?: string
}

export function AssetDialog({ 
  asset, 
  variant = "add", 
  trigger,
  className
}: AssetDialogProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    setOpen(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!asset?.id) return
    
    setIsDeleting(true)
    try {
      await deleteAsset(asset.id)
      toast.success("Asset deleted successfully")
      router.refresh()
    } catch (error) {
      console.error("Error deleting asset:", error)
      toast.error("Failed to delete asset")
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
                  Add Asset
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
              {variant === "add" ? "Add New Asset" : "Edit Asset"}
            </DialogTitle>
            <DialogDescription>
              {variant === "add" 
                ? "Add a new asset to track in your net worth calculation." 
                : "Update the details of your existing asset."}
            </DialogDescription>
          </DialogHeader>
          <AssetForm 
            asset={asset} 
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
          <AlertDialogTitle>Delete Asset</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {asset?.name}? This action cannot be undone.
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
