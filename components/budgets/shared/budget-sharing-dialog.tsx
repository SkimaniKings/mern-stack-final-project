"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Users } from "lucide-react"
import { toast } from "sonner"

interface BudgetSharingDialogProps {
  budgetId: string
  currentMembers: {
    id: string
    email: string
    role: string
  }[]
}

export function BudgetSharingDialog({ budgetId, currentMembers }: BudgetSharingDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("viewer")
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient()

  const handleShare = async () => {
    setIsLoading(true)
    try {
      // Find user by email
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single()

      if (userError || !users) {
        toast.error("User not found")
        return
      }

      // Check if already a member
      if (currentMembers.some(member => member.email === email)) {
        toast.error("User is already a member of this budget")
        return
      }

      // Add user to shared_budget_members
      const { error: shareError } = await supabase
        .from("shared_budget_members")
        .insert({
          budget_id: budgetId,
          user_id: users.id,
          role,
        })

      if (shareError) {
        toast.error("Failed to share budget")
        return
      }

      toast.success("Budget shared successfully")
      setEmail("")
    } catch (error) {
      console.error("Error sharing budget:", error)
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("shared_budget_members")
        .delete()
        .eq("budget_id", budgetId)
        .eq("user_id", userId)

      if (error) {
        toast.error("Failed to remove member")
        return
      }

      toast.success("Member removed successfully")
    } catch (error) {
      console.error("Error removing member:", error)
      toast.error("An error occurred")
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Share Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Budget</DialogTitle>
          <DialogDescription>
            Add members to collaborate on this budget
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={handleShare}
            disabled={isLoading || !email}
          >
            {isLoading ? "Sharing..." : "Share Budget"}
          </Button>

          {currentMembers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Current Members</h4>
              <div className="space-y-2">
                {currentMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted"
                  >
                    <div>
                      <p className="text-sm font-medium">{member.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.role}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
