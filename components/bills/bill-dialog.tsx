"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { createBill, updateBill } from "@/app/actions/bills"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { CalendarIcon, CheckCircle2, AlertCircle, Clock, Plus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { BillCategorySelector } from "./bill-category-selector";

interface Bill {
  id: string
  name: string
  amount?: number
  amount_due?: number
  next_payment_date?: string
  next_due_date?: string
  is_recurring: boolean
  billing_frequency?: string
  frequency?: string
  auto_pay: boolean
  is_automatic?: boolean
  payment_schedule?: { status: string; scheduled_date: string }[]
  billers?: { name: string; category: string }
  notes?: string
  description?: string
  type?: string
  category_id?: string
  category?: { id: string; name: string; description: string }
  status?: string
  vendor?: string
  expected_payment_account?: string
  currency?: string
}

interface BillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bill: Bill | null
  onSave: () => void
}

export function BillDialog({ open, onOpenChange, bill, onSave }: BillDialogProps) {
  const [isRecurring, setIsRecurring] = useState(false)
  const [isAutoPay, setIsAutoPay] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [status, setStatus] = useState<string>("unpaid")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  useEffect(() => {
    if (bill) {
      // Handle is_recurring/auto_pay with fallbacks for different field names
      setIsRecurring(bill.is_recurring || false)
      setIsAutoPay(bill.auto_pay || bill.is_automatic || false)
      setSelectedCategoryId(bill.category_id || "")
      
      // Set status from bill status if available, otherwise determine from payment_schedule
      if (bill.status) {
        setStatus(bill.status);
      } else if (bill.payment_schedule && bill.payment_schedule.length > 0) {
        const latestSchedule = bill.payment_schedule[0];
        setStatus(latestSchedule.status || "unpaid");
      } else {
        // If no status info, determine based on due date
        try {
          // Handle different field names for due date
          const dueDateStr = bill.next_due_date || bill.next_payment_date;
          if (dueDateStr) {
            const dueDate = new Date(dueDateStr);
            const today = new Date();
            
            if (isNaN(dueDate.getTime())) {
              setStatus("unpaid");
            } else if (dueDate < today) {
              setStatus("overdue");
            } else {
              setStatus("unpaid");
            }
          } else {
            setStatus("unpaid");
          }
        } catch (e) {
          setStatus("unpaid");
        }
      }
      
      // Format the date properly if it exists (handle different field names)
      const dueDateStr = bill.next_due_date || bill.next_payment_date;
      if (dueDateStr) {
        try {
          // Parse the date string properly
          const date = parseISO(dueDateStr)
          if (!isNaN(date.getTime())) {
            setDueDate(date)
          } else {
            // Try alternative parsing if parseISO fails
            const fallbackDate = new Date(dueDateStr)
            if (!isNaN(fallbackDate.getTime())) {
              setDueDate(fallbackDate)
            } else {
              setDueDate(undefined)
            }
          }
        } catch (e) {
          setDueDate(undefined)
        }
      } else {
        setDueDate(undefined)
      }
    } else {
      // For new bills, don't set defaults except for status
      setIsRecurring(false)
      setIsAutoPay(false)
      // Don't set a default date for new bills
      // setDueDate(undefined)
      setStatus("unpaid")
      setSelectedCategoryId("")
    }
  }, [bill, open])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    if (!dueDate) {
      setError("Due date is required.");
      setLoading(false);
      return;
    }
    
    const formattedDate = format(dueDate, "yyyy-MM-dd");
    // Use 'due_date' as expected by the server action
    formData.set("due_date", formattedDate);
    formData.delete("next_payment_date"); // Clean up old incorrect field

    // Use 'frequency' as expected by the server action
    if (isRecurring) {
      let frequency = (formData.get("recurrence_pattern") as string) || "monthly";
      if (frequency === "biweekly") {
        frequency = "bi_weekly"; // Map to DB enum value
      }
      formData.set("frequency", frequency);
    } else {
      formData.set("frequency", "once");
    }
    formData.delete("recurrence_pattern"); // Clean up old incorrect field

    // Use 'is_automatic' as expected by the server action
    formData.set("is_automatic", isAutoPay ? "on" : "off");
    formData.delete("auto_pay"); // Clean up old incorrect field
    
    formData.delete("is_recurring");

    try {
      if (bill) {
        await updateBill(bill.id, formData);
      } else {
        await createBill(formData);
      }

      onSave();
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving bill:", err);
      setError(err instanceof Error ? err.message : "Failed to save bill. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Status option renderer with icons and colors
  const statusOptions = [
    { value: "paid", label: "Paid", icon: CheckCircle2, color: "text-green-500" },
    { value: "unpaid", label: "Unpaid", icon: Clock, color: "text-gray-500" },
    { value: "overdue", label: "Overdue", icon: AlertCircle, color: "text-red-500" }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{bill ? "Edit Bill" : "Add New Bill"}</DialogTitle>
            <DialogDescription>
              {bill ? "Update your bill details" : "Enter the details of your bill"}
            </DialogDescription>
          </DialogHeader>

          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">{error}</div>}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" name="name" defaultValue={bill?.name} className="col-span-3" required />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount_due" className="text-right">
                Amount
              </Label>
              <Input
                id="amount_due"
                name="amount_due"
                defaultValue={bill?.amount_due !== undefined ? bill.amount_due : (bill?.amount !== undefined ? bill.amount : "")}
                className="col-span-3"
                type="number"
                step="0.01"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="next_payment_date" className="text-right">
                Next Payment Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal col-span-3",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                    <input
                      type="hidden"
                      name="next_payment_date"
                      value={dueDate ? format(dueDate, "yyyy-MM-dd") : ""}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Recurring</Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="is_recurring"
                  name="is_recurring"
                  value="true"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
                <Label htmlFor="is_recurring">This is a recurring bill</Label>
              </div>
            </div>

            {isRecurring && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recurrence_pattern" className="text-right">
                  Frequency
                </Label>
                <Select name="recurrence_pattern" defaultValue={bill?.frequency || bill?.billing_frequency || "monthly"}>
                  <SelectTrigger id="recurrence_pattern" className="col-span-3">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semiannually">Semi-annually</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Auto-pay</Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch id="auto_pay" name="auto_pay" value="true" checked={isAutoPay} onCheckedChange={setIsAutoPay} />
                <Label htmlFor="auto_pay">This bill is paid automatically</Label>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category_id" className="text-right">
                Category
              </Label>
                            <div className="col-span-3">
                <BillCategorySelector
                  value={selectedCategoryId}
                  onChange={setSelectedCategoryId}
                  placeholder="Select bill category"
                />
                <input type="hidden" name="category_id" value={selectedCategoryId} />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea id="description" name="description" defaultValue={bill?.description || bill?.notes || ""} className="col-span-3" rows={3} />
            </div>
          </div>

          {error && (
            <div className="my-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-bold">An error occurred:</p>
              <p>{error}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : bill ? "Update Bill" : "Add Bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      
    </Dialog>
  )
}
