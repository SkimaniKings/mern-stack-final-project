"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { createSubscription, updateSubscription } from "@/app/actions/subscriptions"
import { X, ChevronDown } from "lucide-react"

interface Subscription {
  id: string
  name: string
  provider?: string
  amount: number
  billing_cycle?: string
  billing_frequency?: string
  payment_cycle?: string
  start_date?: string
  next_billing_date?: string
  next_payment_date?: string
  status?: string
  is_active?: boolean
  auto_renew?: boolean
  auto_pay?: boolean
  cancellation_url?: string | null
  usage_frequency?: string
  usage_value?: number
  usage_level?: string
  category_id?: string
  payment_method?: string
  payment_method_id?: string
  notes?: string
  biller?: {
    id?: string
    name?: string
    category?: string
    website_url?: string
    support_contact?: string
  }
  categories?: { name: string; color: string }
  payment_methods?: { name: string; type: string }
}

interface SubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: Subscription | null
  onSave: () => void
}

export function SubscriptionDialog({ open, onOpenChange, subscription, onSave }: SubscriptionDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [isAutoRenew, setIsAutoRenew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (subscription) {
      setIsAutoRenew(subscription.auto_renew ?? true)
    } else {
      setIsAutoRenew(true)
    }
  }, [subscription, open])
  
  useEffect(() => {
    const checkScroll = () => {
      if (!contentRef.current) return;
      const { scrollHeight, clientHeight, scrollTop } = contentRef.current;
      
      // If scrolled to the bottom or content doesn't need scrolling
      if (scrollTop + clientHeight >= scrollHeight - 20 || scrollHeight <= clientHeight) {
        setShowScrollIndicator(false);
      } else {
        setShowScrollIndicator(true);
      }
    };
    
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', checkScroll);
      // Initial check
      checkScroll();
    }
    
    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', checkScroll);
      }
    };
  }, [open])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)

      if (subscription) {
        await updateSubscription(subscription.id, formData)
      } else {
        await createSubscription(formData)
      }

      onSave()
    } catch (err) {
      console.error("Error saving subscription:", err)
      setError("Failed to save subscription. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <style jsx global>{`
          .scroll-smooth {
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
          }
          .scroll-smooth::-webkit-scrollbar {
            width: 8px;
          }
          .scroll-smooth::-webkit-scrollbar-track {
            background: transparent;
          }
          .scroll-smooth::-webkit-scrollbar-thumb {
            background-color: rgba(155, 155, 155, 0.5);
            border-radius: 20px;
            border: transparent;
          }
        `}</style>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden relative">
          <DialogHeader>
            <DialogTitle>{subscription ? "Edit Subscription" : "Add New Subscription"}</DialogTitle>
            <DialogDescription>
              {subscription ? "Update your subscription details" : "Enter the details of your subscription"}
            </DialogDescription>
          </DialogHeader>

          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">{error}</div>}

          <div ref={contentRef} className="grid gap-4 py-4 overflow-y-auto pr-2 scroll-smooth max-h-[60vh]">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" name="name" defaultValue={subscription?.name} className="col-span-3" required />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider" className="text-right">
                Provider
              </Label>
              <Input
                id="provider"
                name="provider"
                defaultValue={subscription?.provider || subscription?.biller?.name || ""}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={subscription?.amount}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="billing_cycle" className="text-right">
                Billing Cycle
              </Label>
              <Select name="billing_cycle" defaultValue={subscription?.billing_cycle || subscription?.billing_frequency || subscription?.payment_cycle || "monthly"}>
                <SelectTrigger id="billing_cycle" className="col-span-3">
                  <SelectValue placeholder="Select billing cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annually">Semi-annually</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Start Date
              </Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={subscription?.start_date}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="next_billing_date" className="text-right">
                Next Billing
              </Label>
              <Input
                id="next_billing_date"
                name="next_billing_date"
                type="date"
                defaultValue={subscription?.next_billing_date || subscription?.next_payment_date}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category_id" className="text-right">
                Category
              </Label>
              <Select name="category_id" defaultValue={subscription?.category_id || subscription?.biller?.category || "uncategorized"}>
                <SelectTrigger id="category_id" className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="streaming">Streaming</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="cloud_storage">Cloud Storage</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="food_delivery">Food Delivery</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_method_id" className="text-right">
                Payment Method
              </Label>
              <Select name="payment_method_id" defaultValue={subscription?.payment_method_id || "not_specified"}>
                <SelectTrigger id="payment_method_id" className="col-span-3">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_specified">Not specified</SelectItem>
                  <SelectItem value="bank_account">Bank Account</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Auto-renew</Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="auto_renew"
                  name="auto_renew"
                  value="true"
                  checked={isAutoRenew}
                  onCheckedChange={setIsAutoRenew}
                />
                <Label htmlFor="auto_renew">This subscription renews automatically</Label>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="usage_frequency" className="text-right">
                Usage
              </Label>
              <Select name="usage_frequency" defaultValue={subscription?.usage_frequency || subscription?.usage_level || "medium"}>
                <SelectTrigger id="usage_frequency" className="col-span-3">
                  <SelectValue placeholder="Select usage frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High (Use frequently)</SelectItem>
                  <SelectItem value="medium">Medium (Use occasionally)</SelectItem>
                  <SelectItem value="low">Low (Rarely use)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cancellation_url" className="text-right">
                Cancellation URL
              </Label>
              <Input
                id="cancellation_url"
                name="cancellation_url"
                type="url"
                defaultValue={subscription?.cancellation_url || ""}
                className="col-span-3"
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea id="notes" name="notes" defaultValue={subscription?.notes} className="col-span-3" rows={3} />
            </div>
          </div>

          {showScrollIndicator && (
            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 animate-bounce bg-primary/10 rounded-full p-1 cursor-pointer z-10" 
                 onClick={() => contentRef.current?.scrollBy({ top: 100, behavior: 'smooth' })}>
              <ChevronDown className="h-5 w-5 text-primary" />
            </div>
          )}
          <DialogFooter className="border-t pt-4 mt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : subscription ? "Update Subscription" : "Add Subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

