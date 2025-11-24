"use client"

import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { PlusCircle, Edit, Trash } from "lucide-react"
import { createPortfolio, updatePortfolio, deletePortfolio, InvestmentPortfolio } from "@/app/actions/investment-portfolios"
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

interface PortfolioManagementProps {
  portfolios: InvestmentPortfolio[]
  onPortfolioAdded?: () => void
  onPortfolioUpdated?: () => void
  onPortfolioDeleted?: () => void
}

export function PortfolioManagement({ 
  portfolios, 
  onPortfolioAdded, 
  onPortfolioUpdated, 
  onPortfolioDeleted 
}: PortfolioManagementProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Form state for create/edit
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [baseCurrency, setBaseCurrency] = useState("USD")
  const [targetAllocation, setTargetAllocation] = useState<Record<string, number>>({})
  const [currentPortfolio, setCurrentPortfolio] = useState<InvestmentPortfolio | null>(null)

  // Currencies
  const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]

  // Reset form fields
  const resetForm = () => {
    setName("")
    setDescription("")
    setBaseCurrency("USD")
    setTargetAllocation({})
    setCurrentPortfolio(null)
  }

  // Set form fields for editing
  const setFormForEdit = (portfolio: InvestmentPortfolio) => {
    setName(portfolio.name)
    setDescription(portfolio.description || "")
    setBaseCurrency(portfolio.base_currency)
    setTargetAllocation(portfolio.target_allocation || {})
    setCurrentPortfolio(portfolio)
    setEditDialogOpen(true)
  }

  // Handle create portfolio submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Create form data for server action
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("base_currency", baseCurrency)
      formData.append("target_allocation", JSON.stringify(targetAllocation))
      
      const result = await createPortfolio(formData)
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Portfolio created successfully",
        })
        resetForm()
        setCreateDialogOpen(false)
        if (onPortfolioAdded) onPortfolioAdded()
      }
    } catch (error) {
      console.error("Error creating portfolio:", error)
      toast({
        title: "Error",
        description: "Failed to create portfolio",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle update portfolio submission
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      if (!currentPortfolio) {
        throw new Error("No portfolio selected for update")
      }
      
      // Create form data for server action
      const formData = new FormData()
      formData.append("id", currentPortfolio.id)
      formData.append("name", name)
      formData.append("description", description)
      formData.append("base_currency", baseCurrency)
      formData.append("target_allocation", JSON.stringify(targetAllocation))
      
      const result = await updatePortfolio(formData)
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Portfolio updated successfully",
        })
        resetForm()
        setEditDialogOpen(false)
        if (onPortfolioUpdated) onPortfolioUpdated()
      }
    } catch (error) {
      console.error("Error updating portfolio:", error)
      toast({
        title: "Error",
        description: "Failed to update portfolio",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle delete portfolio
  const handleDelete = async (id: string) => {
    setIsLoading(true)
    
    try {
      const result = await deletePortfolio(id)
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Portfolio deleted successfully",
        })
        if (onPortfolioDeleted) onPortfolioDeleted()
      }
    } catch (error) {
      console.error("Error deleting portfolio:", error)
      toast({
        title: "Error",
        description: "Failed to delete portfolio",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Investment Portfolios</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
              <DialogDescription>
                Create a new investment portfolio to track your holdings.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="currency" className="text-right">
                    Currency
                  </Label>
                  <Select
                    value={baseCurrency}
                    onValueChange={setBaseCurrency}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Portfolio"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {portfolios.map((portfolio) => (
          <Card key={portfolio.id}>
            <CardHeader>
              <CardTitle>{portfolio.name}</CardTitle>
              <CardDescription>{portfolio.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Base Currency:</span>
                <Badge variant="outline">{portfolio.base_currency}</Badge>
              </div>
              <div className="text-sm">
                <span className="font-medium">Created:</span>{" "}
                {new Date(portfolio.created_at).toLocaleDateString()}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setFormForEdit(portfolio)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the portfolio and all its holdings.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(portfolio.id)}>
                      {isLoading ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Edit Portfolio Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Portfolio</DialogTitle>
            <DialogDescription>
              Update your investment portfolio details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-currency" className="text-right">
                  Currency
                </Label>
                <Select
                  value={baseCurrency}
                  onValueChange={setBaseCurrency}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Portfolio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
