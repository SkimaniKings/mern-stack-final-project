"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Users, Receipt, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { SplitExpenseList } from "@/components/expenses/split-expense-list"
import { SplitExpenseDetail } from "@/components/expenses/split-expense-detail"
import { getFormattedSplitExpenses, settleSplitExpense, sendSplitExpenseReminder } from "@/app/actions/split-expenses"
import { useToast } from "@/components/ui/use-toast"

export default function SplitTransactionsPage() {
  const [activeTab, setActiveTab] = useState<string>("active")
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const [splitExpenses, setSplitExpenses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSettling, setIsSettling] = useState<boolean>(false)
  const [isSendingReminder, setIsSendingReminder] = useState<boolean>(false)
  const { toast } = useToast()

  // Fetch split expenses on component mount
  useEffect(() => {
    const fetchSplitExpenses = async () => {
      setIsLoading(true)
      try {
        const expenses = await getFormattedSplitExpenses()
        setSplitExpenses(expenses)
      } catch (error) {
        console.error("Error fetching split expenses:", error)
        toast({
          title: "Error",
          description: "Failed to load split expenses. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSplitExpenses()
  }, [])

  // Define interface for participants
  interface Participant {
    id: string;
    name: string;
    avatar: string;
    amount: number;
    status: string;
  }

  // Define interface for split expenses
  interface SplitExpense {
    id: string;
    merchant: string;
    category: string;
    amount: number;
    date: Date;
    status: 'active' | 'settled';
    participants: Participant[];
    pendingAmount: number;
  }
  
  // Filter expenses based on active tab
  const getFilteredExpenses = () => {
    if (activeTab === "active") {
      return splitExpenses.filter((expense: SplitExpense) => expense.status === "active")
    } else if (activeTab === "settled") {
      return splitExpenses.filter((expense: SplitExpense) => expense.status === "settled")
    }
    return splitExpenses
  }

  const filteredExpenses = getFilteredExpenses()
  const selectedExpense = filteredExpenses.find((expense) => expense.id === selectedExpenseId)

  // Handle settling a split expense
  const handleSettleExpense = async (splitId: string) => {
    setIsSettling(true)
    try {
      await settleSplitExpense(splitId)
      toast({
        title: "Success",
        description: "Split expense has been settled.",
      })
      // Refresh the expenses list
      const expenses = await getFormattedSplitExpenses()
      setSplitExpenses(expenses)
      // If the settled expense was selected, clear the selection
      if (selectedExpenseId === splitId) {
        setSelectedExpenseId(null)
      }
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
      // Refresh the expenses list
      const expenses = await getFormattedSplitExpenses()
      setSplitExpenses(expenses)
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

  const handleExpenseSelect = (expenseId: string) => {
    setSelectedExpenseId(expenseId)
  }

  const handleCreateSplitExpense = () => {
    // Navigate to create expense page with split option pre-selected
    window.location.href = "/expenses/new?split=true"
  }

  // Handle participant payment status change
  const handleParticipantStatusChange = async (participantId: string, expenseId: string) => {
    // Check if this is a direct split (expense ID) or a split record (split ID)
    const isDirectSplit = participantId.startsWith('other-')
    const splitId = isDirectSplit ? expenseId : participantId

    await handleSettleExpense(splitId)
  }

  // Calculate total owed to you
  const totalOwed = splitExpenses.reduce((sum: number, expense: SplitExpense) => {
    if (expense.status === "active") {
      return sum + expense.participants
        .filter((p: Participant) => p.status === "pending")
        .reduce((innerSum: number, p: Participant) => innerSum + p.amount, 0)
    }
    return sum
  }, 0)

  // Calculate total you owe others (commented out as it's not used in this example)
  /*
  const totalYouOwe = splitExpenses
    .filter((expense: SplitExpense) => expense.status === "active")
    .reduce((total: number, expense: SplitExpense) => {
      const yourParticipation = expense.participants.find((p: Participant) => p.id === "user1")
      if (!yourParticipation) return total

      const othersOwingYou = expense.participants
        .filter((p: Participant) => p.id !== "user1" && p.status === "pending")
        .reduce((sum: number, p: Participant) => sum + p.amount, 0)

      return total + othersOwingYou
    }, 0)
  */

  // Calculate total you owe
  const totalYouOwe = 0 // In this example, you've paid for everything

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Split Transactions</h1>
          <p className="text-muted-foreground mt-2">Easily split and track shared expenses with others</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/expenses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Expenses
            </Link>
          </Button>
          <Button onClick={handleCreateSplitExpense}>
            <Plus className="mr-2 h-4 w-4" />
            Split Expense
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Split Summary</CardTitle>
            <CardDescription>Overview of your shared expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Others Owe You</p>
                    <p className="text-3xl font-bold text-green-600">${totalOwed.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      From {splitExpenses.filter((e: SplitExpense) => e.status === "active").length} active expenses
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Split Expense Summary</h2>
                    <p className="text-3xl font-bold">${splitExpenses.length} expenses</p>
                    <p className="text-sm text-muted-foreground">Track who owes you money</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <h3 className="font-medium mb-4">People You Split With</h3>
              <div className="flex flex-wrap gap-4">
                {Array.from(
                  new Set(
                    splitExpenses
                      .flatMap((e) => e.participants)
                      .filter((p) => p.id !== "user1")
                      .map((p) => p.id),
                  ),
                ).map((id) => {
                  const participant = splitExpenses.flatMap((e) => e.participants).find((p) => p.id === id)
                  if (!participant) return null

                  const owedAmount = splitExpenses
                    .filter((e) => e.status === "active")
                    .reduce((total, expense) => {
                      const participantInExpense = expense.participants.find((p) => p.id === id)
                      if (participantInExpense && participantInExpense.status === "pending") {
                        return total + participantInExpense.amount
                      }
                      return total
                    }, 0)

                  return (
                    <div key={id} className="flex items-center gap-2 p-2 border rounded-md">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.avatar} alt={participant.name} />
                        <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{participant.name}</p>
                        {owedAmount > 0 ? (
                          <p className="text-xs text-green-600">Owes you ${owedAmount.toFixed(2)}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">All settled up</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates on your shared expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {splitExpenses
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, 3)
                .map((expense) => {
                  const pendingParticipants = expense.participants.filter((p) => p.status === "pending")

                  return (
                    <div key={expense.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{expense.merchant}</p>
                        <p className="text-xs text-muted-foreground">{expense.date.toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${expense.amount.toFixed(2)}</p>
                        {pendingParticipants.length > 0 ? (
                          <Badge variant="outline" className="text-xs">
                            {pendingParticipants.length} pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                            Settled
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Active Splits
          </TabsTrigger>
          <TabsTrigger value="settled" className="flex items-center">
            <Check className="mr-2 h-4 w-4" />
            Settled
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg flex items-center">
                    <Receipt className="mr-2 h-4 w-4" />
                    Split Expenses
                  </CardTitle>
                  <CardDescription>
                    {filteredExpenses.length} {filteredExpenses.length === 1 ? "expense" : "expenses"} found
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <SplitExpenseList
                    expenses={filteredExpenses}
                    onSelectExpense={handleExpenseSelect}
                    selectedExpenseId={selectedExpenseId}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              {isLoading ? (
                <Card className="h-full">
                  <CardContent className="flex flex-col items-center justify-center h-full py-20 text-center">
                    <Loader2 className="h-16 w-16 text-muted-foreground mb-4 animate-spin" />
                    <h3 className="text-lg font-medium">Loading Split Expenses</h3>
                    <p className="text-muted-foreground mt-2 max-w-md">
                      Please wait while we load your split expenses...
                    </p>
                  </CardContent>
                </Card>
              ) : selectedExpense ? (
                <div>
                  <SplitExpenseDetail expense={selectedExpense} />
                  
                  {/* Action buttons for the selected expense */}
                  <div className="mt-4 flex flex-col space-y-2">
                    {selectedExpense.status === "active" && (
                      <>
                        {/* Find pending participants */}
                        {selectedExpense.participants.filter((p: Participant) => p.status === "pending").map((participant: Participant) => (
                          <Card key={participant.id} className="p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{participant.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{participant.name}</p>
                                  <p className="text-sm text-muted-foreground">They owe you ${participant.amount.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendReminder(participant.id)}
                                  disabled={isSendingReminder}
                                >
                                  {isSendingReminder ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  ) : null}
                                  Send Reminder
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleParticipantStatusChange(participant.id, selectedExpense.id)}
                                  disabled={isSettling}
                                >
                                  {isSettling ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="mr-2 h-3 w-3" />
                                  )}
                                  Mark as Paid
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <Card className="h-full">
                  <CardContent className="flex flex-col items-center justify-center h-full py-20 text-center">
                    <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Select a Split Expense</h3>
                    <p className="text-muted-foreground mt-2 max-w-md">
                      Select a split expense from the list to view details, or create a new split expense to get
                      started.
                    </p>
                    <Button className="mt-4" onClick={handleCreateSplitExpense}>
                      <Plus className="mr-2 h-4 w-4" />
                      Split Expense
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settled" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg flex items-center">
                    <Check className="mr-2 h-4 w-4" />
                    Settled Expenses
                  </CardTitle>
                  <CardDescription>
                    {filteredExpenses.length} {filteredExpenses.length === 1 ? "expense" : "expenses"} found
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <SplitExpenseList
                    expenses={filteredExpenses}
                    onSelectExpense={handleExpenseSelect}
                    selectedExpenseId={selectedExpenseId}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              {isLoading ? (
                <Card className="h-full">
                  <CardContent className="flex flex-col items-center justify-center h-full py-20 text-center">
                    <Loader2 className="h-16 w-16 text-muted-foreground mb-4 animate-spin" />
                    <h3 className="text-lg font-medium">Loading Split Expenses</h3>
                    <p className="text-muted-foreground mt-2 max-w-md">
                      Please wait while we load your split expenses...
                    </p>
                  </CardContent>
                </Card>
              ) : selectedExpense ? (
                <SplitExpenseDetail expense={selectedExpense} />
              ) : (
                <Card className="h-full">
                  <CardContent className="flex flex-col items-center justify-center h-full py-20 text-center">
                    <Check className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Select a Settled Expense</h3>
                    <p className="text-muted-foreground mt-2 max-w-md">
                      Select a settled expense from the list to view details.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
