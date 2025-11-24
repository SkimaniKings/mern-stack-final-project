"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils/formatting"
import { Check, Clock, Receipt, Send, Loader2, Edit, Save, X } from "lucide-react"
import { settleSplitExpense, sendSplitExpenseReminder, updateSplitExpense } from "@/app/actions/split-expenses"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Participant {
  id: string
  name: string
  avatar: string
  amount: number
  status: "paid" | "pending"
}

interface SplitExpense {
  id: string
  merchant: string
  category: string
  amount: number
  date: Date
  status: "active" | "settled"
  participants: Participant[]
  notes?: string
}

interface SplitExpenseDetailProps {
  expense: SplitExpense
}

export function SplitExpenseDetail({ expense }: SplitExpenseDetailProps) {
  const [isSettling, setIsSettling] = useState(false)
  const [isSendingReminder, setIsSendingReminder] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  // State for the current expense with updates
  const [currentExpense, setCurrentExpense] = useState<SplitExpense>(expense)

  // State for editing split details
  const [editedName, setEditedName] = useState<string>("") 
  const [editedAmount, setEditedAmount] = useState<number>(0)
  const [editedNote, setEditedNote] = useState<string>("") 

  // Calculate their share (the amount owed by the other person)
  const theirShare = currentExpense.participants.find((p: { name: string }) => p.name !== "You")?.amount || 0
  
  // Calculate pending amount
  const pendingAmount = currentExpense.participants
    .filter((p: { status: string }) => p.status === "pending")
    .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
  
  // Get pending participants count
  const pendingParticipants = currentExpense.participants.filter((p: { status: string }) => p.status === "pending").length
  
  // Check if you paid
  const youPaid = currentExpense.participants.find((p: { name: string }) => p.name === "You")?.status === "paid"

  // Get the other participant (the one who is not "You")
  const otherParticipant = currentExpense.participants.find((p: { name: string }) => p.name !== "You")
  
  // Handle settling a split expense
  const handleSettleExpense = async (splitId: string) => {
    setIsSettling(true)
    try {
      await settleSplitExpense(splitId)
      toast({
        title: "Success",
        description: "Split expense has been settled.",
      })
    } catch (error) {
      console.error("Error settling split expense:", error)
      toast({
        title: "Error",
        description: "Failed to settle the split expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSettling(false)
    }
  }
  
  // Handle sending a reminder for a split expense
  const handleSendReminder = async (splitId: string) => {
    setIsSendingReminder(true)
    try {
      const result = await sendSplitExpenseReminder(splitId)
      toast({
        title: "Success",
        description: result.message || "Reminder sent successfully.",
      })
    } catch (error) {
      console.error("Error sending reminder:", error)
      toast({
        title: "Error",
        description: "Failed to send reminder. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingReminder(false)
    }
  }
  
  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Cancel editing
      setIsEditing(false)
    } else {
      // Enter edit mode - initialize with current values
      if (otherParticipant) {
        setEditedName(otherParticipant.name)
        setEditedAmount(otherParticipant.amount)
        setEditedNote(currentExpense.notes || '')
      }
      setIsEditing(true)
    }
  }
  
  // Handle updating split expense details
  const handleUpdateSplitDetails = async () => {
    setIsUpdating(true)
    try {
      // Get the ID of the other participant
      const splitId = otherParticipant?.id
      
      if (!splitId) {
        throw new Error("Split ID not found")
      }
      
      // First ensure the database structure is correct
      try {
        // Call the API to fix database structure
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const fixResponse = await fetch(`${baseUrl}/api/database/fix-split-expenses`);
        if (!fixResponse.ok) {
          console.warn('Database structure fix attempt failed, but continuing with operation');
        }
      } catch (fixError) {
        console.warn('Error attempting to fix database structure:', fixError);
        // Continue with the operation even if the fix fails
      }
      
      // Update the split expense
      const updatedSplit = await updateSplitExpense(splitId, {
        shared_with_name: editedName,
        amount: editedAmount,
        notes: editedNote
      })
      
      // Update the local state with the new values
      const updatedParticipants = [...currentExpense.participants];
      const otherParticipantIndex = updatedParticipants.findIndex(p => p.name !== "You");
      
      if (otherParticipantIndex !== -1) {
        updatedParticipants[otherParticipantIndex] = {
          ...updatedParticipants[otherParticipantIndex],
          name: editedName,
          amount: editedAmount
        };
      }
      
      // Update the current expense state
      setCurrentExpense({
        ...currentExpense,
        notes: editedNote,
        participants: updatedParticipants
      });
      
      // Dispatch an event to notify other components that a split expense was updated
      if (typeof window !== 'undefined') {
        // Update localStorage to trigger events in other components
        localStorage.setItem('split-expense-updated', Date.now().toString());
        
        // Dispatch both storage and custom events
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'split-expense-updated',
          newValue: Date.now().toString()
        }));
        
        // Custom event for same-window updates
        window.dispatchEvent(new Event('split-expense-updated'));
      }
      
      toast({
        title: "Success",
        description: "Split expense details updated successfully.",
      })
      
      // Exit edit mode
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating split expense:", error)
      toast({
        title: "Error",
        description: "Failed to update split expense details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{currentExpense.merchant}</CardTitle>
            <CardDescription>{currentExpense.category} • {formatDate(new Date(currentExpense.date))}</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrency(currentExpense.amount)}</div>
            <div className="text-sm text-muted-foreground">
              Their share: {formatCurrency(theirShare)}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Split Details</h3>
            {currentExpense.status === "active" && (
              <Button variant="ghost" size="sm" onClick={toggleEditMode}>
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-4 p-3 rounded-md border">
              <div className="space-y-2">
                <Label htmlFor="split-name">Split With</Label>
                <Input
                  id="split-name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter name of person"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="split-amount">Their Share (Amount)</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="split-amount"
                    type="number"
                    value={editedAmount}
                    onChange={(e) => setEditedAmount(parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="split-note">Note</Label>
                <Textarea
                  id="split-note"
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  placeholder="Add any details about this split..."
                  className="min-h-[80px]"
                />
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleUpdateSplitDetails}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {currentExpense.participants.map((participant) => (
                <div key={participant.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.avatar} alt={participant.name} />
                      <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{participant.name}</div>
                      <div className="text-sm text-muted-foreground">{formatCurrency(participant.amount)}</div>
                    </div>
                  </div>
                  <div>
                    {participant.status === "paid" ? (
                      <Badge variant="outline" className="text-emerald-500 border-emerald-200 bg-emerald-50">
                        <Check className="mr-1 h-3 w-3" />
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {currentExpense.notes && (
                <div className="mt-2 text-sm text-muted-foreground p-2 rounded-md bg-muted/50">
                  <p className="font-medium mb-1">Note:</p>
                  <p>{currentExpense.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {currentExpense.status === "active" && (
          <div>
            <h3 className="text-sm font-medium mb-2">Payment Status</h3>
            <div className="p-3 rounded-md bg-muted/50">
              {pendingParticipants > 0 ? (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>
                      <span className="font-medium">{pendingParticipants}</span> pending payment
                      {pendingParticipants > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="font-medium text-amber-500">
                    {formatCurrency(pendingAmount)}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">All payments complete</span>
                  </div>
                  <div className="font-medium text-emerald-500">
                    {formatCurrency(currentExpense.amount)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2">
        {currentExpense.status === "active" && !youPaid && (
          <Button className="w-full">
            <Send className="mr-2 h-4 w-4" />
            Pay Your Share
          </Button>
        )}
        
        {currentExpense.status === "active" && pendingParticipants > 0 && (
          <div className="flex gap-2 w-full">
            {/* Find a pending participant to send reminder to */}
            {currentExpense.participants.find((p: { status: string }) => p.status === "pending") && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  // Get the ID of the first pending participant
                  const pendingParticipant = currentExpense.participants.find((p: { status: string }) => p.status === "pending");
                  if (pendingParticipant) {
                    handleSendReminder(pendingParticipant.id);
                  }
                }}
                disabled={isSendingReminder}
              >
                {isSendingReminder ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Reminder
              </Button>
            )}
            
            <Button 
              className="flex-1"
              onClick={() => handleSettleExpense(currentExpense.id)}
              disabled={isSettling}
            >
              {isSettling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Mark as Settled
            </Button>
          </div>
        )}
        
        {currentExpense.status === "settled" && (
          <Button variant="outline" className="w-full">
            <Receipt className="mr-2 h-4 w-4" />
            View Receipt
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
