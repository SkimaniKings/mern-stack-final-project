"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Bell, Plus, Share2, Trash2, UserPlus } from "lucide-react"
import Link from "next/link"
import { CollaborativeBudgetTable } from "@/components/budgeting/collaborative-budget-table"
import { CollaborativeActivityFeed } from "@/components/budgeting/collaborative-activity-feed"

export default function CollaborativeBudgetingPage() {
  const [activeTab, setActiveTab] = useState<string>("shared-budgets")
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)

  const sharedBudgets = [
    {
      id: "1",
      name: "Household Budget",
      description: "Shared budget for household expenses",
      owner: {
        id: "user1",
        name: "You",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      collaborators: [
        {
          id: "user2",
          name: "Alex Smith",
          avatar: "/placeholder.svg?height=32&width=32",
          role: "editor",
        },
      ],
      categories: [
        { id: "c1", name: "Rent", amount: 1500, locked: true },
        { id: "c2", name: "Utilities", amount: 300, locked: false },
        { id: "c3", name: "Groceries", amount: 600, locked: false },
        { id: "c4", name: "Internet", amount: 80, locked: true },
        { id: "c5", name: "Streaming Services", amount: 50, locked: false },
        { id: "c6", name: "Household Supplies", amount: 100, locked: false },
        { id: "c7", name: "Dining Out", amount: 400, locked: false },
        { id: "c8", name: "Entertainment", amount: 200, locked: false },
      ],
      totalBudget: 3230,
      activityFeed: [
        {
          id: "a1",
          user: {
            id: "user2",
            name: "Alex Smith",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          action: "updated",
          category: "Groceries",
          oldValue: 500,
          newValue: 600,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          id: "a2",
          user: {
            id: "user1",
            name: "You",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          action: "locked",
          category: "Rent",
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          id: "a3",
          user: {
            id: "user1",
            name: "You",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          action: "added",
          category: "Streaming Services",
          newValue: 50,
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    {
      id: "2",
      name: "Vacation Planning",
      description: "Budget for our summer vacation",
      owner: {
        id: "user1",
        name: "You",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      collaborators: [
        {
          id: "user2",
          name: "Alex Smith",
          avatar: "/placeholder.svg?height=32&width=32",
          role: "viewer",
        },
        {
          id: "user3",
          name: "Jamie Doe",
          avatar: "/placeholder.svg?height=32&width=32",
          role: "editor",
        },
      ],
      categories: [
        { id: "c1", name: "Flights", amount: 1200, locked: true },
        { id: "c2", name: "Accommodation", amount: 1500, locked: false },
        { id: "c3", name: "Food", amount: 800, locked: false },
        { id: "c4", name: "Activities", amount: 600, locked: false },
        { id: "c5", name: "Transportation", amount: 300, locked: false },
        { id: "c6", name: "Souvenirs", amount: 200, locked: false },
      ],
      totalBudget: 4600,
      activityFeed: [
        {
          id: "a1",
          user: {
            id: "user3",
            name: "Jamie Doe",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          action: "added",
          category: "Souvenirs",
          newValue: 200,
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
        {
          id: "a2",
          user: {
            id: "user1",
            name: "You",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          action: "updated",
          category: "Accommodation",
          oldValue: 1200,
          newValue: 1500,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ],
    },
  ]

  const invitations = [
    {
      id: "inv1",
      budgetName: "Wedding Budget",
      from: {
        id: "user4",
        name: "Taylor Johnson",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      role: "editor",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getSelectedBudget = () => {
    return sharedBudgets.find((budget) => budget.id === selectedBudgetId) || null
  }

  const handleSelectBudget = (budgetId: string) => {
    setSelectedBudgetId(budgetId)
    setActiveTab("budget-details")
  }

  const handleCreateNewBudget = () => {
    // In a real app, this would open a form to create a new budget
    alert("This would open a form to create a new collaborative budget")
  }

  const handleShareBudget = () => {
    // In a real app, this would open a sharing dialog
    alert("This would open a dialog to share the budget with others")
  }

  const handleAcceptInvitation = (invitationId: string) => {
    // In a real app, this would accept the invitation
    alert(`Invitation ${invitationId} accepted`)
  }

  const handleDeclineInvitation = (invitationId: string) => {
    // In a real app, this would decline the invitation
    alert(`Invitation ${invitationId} declined`)
  }

  const selectedBudget = getSelectedBudget()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collaborative Budgeting</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage shared budgets with your partner, family, or roommates
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/budgeting">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Budgeting
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="shared-budgets">Shared Budgets</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations {invitations.length > 0 && `(${invitations.length})`}
          </TabsTrigger>
          <TabsTrigger value="budget-details" disabled={!selectedBudget}>
            Budget Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shared-budgets" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreateNewBudget}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Shared Budget
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sharedBudgets.map((budget) => (
              <Card
                key={budget.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSelectBudget(budget.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle>{budget.name}</CardTitle>
                  <CardDescription>{budget.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Budget</p>
                    <p className="text-xl font-medium">{formatCurrency(budget.totalBudget)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Collaborators</p>
                    <div className="flex -space-x-2">
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={budget.owner.avatar} alt={budget.owner.name} />
                        <AvatarFallback>{budget.owner.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {budget.collaborators.map((collaborator) => (
                        <Avatar key={collaborator.id} className="h-8 w-8 border-2 border-background">
                          <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                          <AvatarFallback>{collaborator.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">{budget.categories.length} categories</p>
                    <Badge variant="outline">{budget.owner.id === "user1" ? "Owner" : "Collaborator"}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Pending Invitations</h3>
                <p className="text-muted-foreground mt-2">
                  When someone invites you to collaborate on a budget, it will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{invitation.budgetName}</CardTitle>
                        <CardDescription>
                          Invited by {invitation.from.name} ({invitation.timestamp.toLocaleDateString()})
                        </CardDescription>
                      </div>
                      <Badge>{invitation.role === "editor" ? "Editor" : "Viewer"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage src={invitation.from.avatar} alt={invitation.from.name} />
                          <AvatarFallback>{invitation.from.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{invitation.from.name}</p>
                          <p className="text-sm text-muted-foreground">Wants to collaborate with you</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleDeclineInvitation(invitation.id)}>
                          Decline
                        </Button>
                        <Button size="sm" onClick={() => handleAcceptInvitation(invitation.id)}>
                          Accept
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="budget-details" className="space-y-4">
          {selectedBudget && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedBudget.name}</h2>
                  <p className="text-muted-foreground">{selectedBudget.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleShareBudget}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Budget Categories</CardTitle>
                    <CardDescription>Manage your shared budget categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CollaborativeBudgetTable
                      categories={selectedBudget.categories}
                      isOwner={selectedBudget.owner.id === "user1"}
                    />
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Collaborators</CardTitle>
                      <CardDescription>People with access to this budget</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar>
                            <AvatarImage src={selectedBudget.owner.avatar} alt={selectedBudget.owner.name} />
                            <AvatarFallback>{selectedBudget.owner.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{selectedBudget.owner.name}</p>
                            <p className="text-xs text-muted-foreground">Owner</p>
                          </div>
                        </div>
                      </div>

                      {selectedBudget.collaborators.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                              <AvatarFallback>{collaborator.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{collaborator.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{collaborator.role}</p>
                            </div>
                          </div>
                          {selectedBudget.owner.id === "user1" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}

                      <Button variant="outline" className="w-full">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite Collaborator
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Settings</CardTitle>
                      <CardDescription>Control how you're notified about changes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="notify-changes">Budget Changes</Label>
                          <p className="text-sm text-muted-foreground">Notify when categories are updated</p>
                        </div>
                        <Switch id="notify-changes" defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="notify-comments">Comments</Label>
                          <p className="text-sm text-muted-foreground">Notify when someone comments</p>
                        </div>
                        <Switch id="notify-comments" defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="notify-overspending">Overspending</Label>
                          <p className="text-sm text-muted-foreground">Notify when a category is overspent</p>
                        </div>
                        <Switch id="notify-overspending" defaultChecked />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Feed</CardTitle>
                  <CardDescription>Recent changes to this budget</CardDescription>
                </CardHeader>
                <CardContent>
                  <CollaborativeActivityFeed activities={selectedBudget.activityFeed} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

