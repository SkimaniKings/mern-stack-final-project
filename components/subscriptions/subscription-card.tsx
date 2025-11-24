"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Edit, Trash2, AlertCircle, Calendar, DollarSign, BarChart } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Subscription } from "@/types/subscription"
import { ROICalculator } from "./roi-calculator"

// Categories with icons
const categoryIcons: Record<string, string> = {
  entertainment: "🎬",
  utilities: "🔌",
  software: "💻",
  health: "🏥",
  education: "🎓",
  food: "🍔",
  transportation: "🚗",
  housing: "🏠",
  insurance: "🛡️",
  investments: "📈",
  other: "📦",
}

// Recurrence to human-readable format
const recurrenceLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  bi_weekly: "Bi-Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
  yearly: "Yearly",
}

interface SubscriptionCardProps {
  subscription: Subscription
  onEdit: (subscription: Subscription) => void
  onDelete: (subscriptionId: string) => Promise<void>
}

export function SubscriptionCard({
  subscription,
  onEdit,
  onDelete,
}: SubscriptionCardProps) {
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showRoi, setShowRoi] = useState(false)
  
  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  
  // Handle delete
  const handleDelete = async () => {
    try {
      setDeleteLoading(true)
      await onDelete(subscription.id)
      toast.success("Subscription deleted successfully")
    } catch (error) {
      console.error("Error deleting subscription:", error)
      toast.error("Failed to delete subscription")
    } finally {
      setDeleteLoading(false)
    }
  }
  
  // Get category icon
  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || "📦"
  }
  
  return (
    <Card className={subscription.is_active ? "" : "opacity-70"}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getCategoryIcon(subscription.category)}</span>
            <div>
              <CardTitle>{subscription.name}</CardTitle>
              {subscription.service_provider && (
                <CardDescription>{subscription.service_provider}</CardDescription>
              )}
            </div>
          </div>
          
          <Badge variant={subscription.is_active ? "default" : "outline"}>
            {subscription.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {formatCurrency(subscription.amount, subscription.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {recurrenceLabels[subscription.recurrence] || subscription.recurrence}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {format(new Date(subscription.start_date), "MMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {subscription.end_date 
                  ? `Until ${format(new Date(subscription.end_date), "MMM d, yyyy")}`
                  : "Ongoing"
                }
              </p>
            </div>
          </div>
        </div>
        
        {subscription.description && (
          <p className="text-sm mt-4 text-muted-foreground">
            {subscription.description}
          </p>
        )}
        
        {subscription.roi_expected && (
          <div className="mt-4 flex items-center space-x-2">
            <BarChart className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Expected Return: {formatCurrency(subscription.roi_expected, subscription.currency)}
              </p>
              {subscription.roi_notes && (
                <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                  {subscription.roi_notes}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRoi(true)}
        >
          <BarChart className="h-4 w-4 mr-2" />
          ROI Calculator
        </Button>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(subscription)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the "{subscription.name}" subscription?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
      
      {/* ROI Calculator Dialog */}
      <Dialog open={showRoi} onOpenChange={setShowRoi}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>ROI Calculator: {subscription.name}</DialogTitle>
            <DialogDescription>
              Return on investment analysis for this subscription
            </DialogDescription>
          </DialogHeader>
          <ROICalculator subscriptionId={subscription.id} />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
