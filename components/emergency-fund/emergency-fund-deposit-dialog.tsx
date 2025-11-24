"use client"

import type React from "react"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EmergencyFundDepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isDeposit: boolean
}

export function EmergencyFundDepositDialog({ open, onOpenChange, isDeposit }: EmergencyFundDepositDialogProps) {
  const [amount, setAmount] = useState("")
  const [account, setAccount] = useState("checking")
  const [note, setNote] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would save the transaction to your database
    console.log({
      type: isDeposit ? "deposit" : "withdrawal",
      amount: Number.parseFloat(amount),
      account,
      note,
      date: new Date(),
    })
    onOpenChange(false)
    setAmount("")
    setAccount("checking")
    setNote("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isDeposit ? "Deposit to" : "Withdraw from"} Emergency Fund</DialogTitle>
            <DialogDescription>
              {isDeposit
                ? "Add money to your emergency fund."
                : "Withdraw money from your emergency fund for unexpected expenses."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <div className="col-span-3 flex items-center">
                <span className="mr-2">$</span>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="account" className="text-right">
                {isDeposit ? "From Account" : "To Account"}
              </Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger id="account" className="col-span-3">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking Account</SelectItem>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="note" className="text-right">
                Note
              </Label>
              <Textarea
                id="note"
                placeholder={isDeposit ? "Reason for deposit" : "Reason for withdrawal"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">{isDeposit ? "Deposit" : "Withdraw"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

