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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { PlusCircle, Edit, Trash } from "lucide-react"
import { 
  getPortfolioHoldings, 
  addHolding, 
  updateHolding, 
  deleteHolding,
  getAssetClasses,
  InvestmentHolding,
  AssetClass
} from "@/app/actions/investment-portfolios"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PortfolioAssetAllocation } from "./portfolio-asset-allocation"

interface PortfolioHoldingsProps {
  portfolioId: string
  portfolioName: string
}

export function PortfolioHoldings({ portfolioId, portfolioName }: PortfolioHoldingsProps) {
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([])
  const [assetClasses, setAssetClasses] = useState<string[]>([])
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(true)
  const { toast } = useToast()

  // Form state for add/edit
  const [symbol, setSymbol] = useState("")
  const [name, setName] = useState("")
  const [assetClass, setAssetClass] = useState<AssetClass>("stocks")
  const [units, setUnits] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [currentPrice, setCurrentPrice] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [acquiredAt, setAcquiredAt] = useState("")
  const [soldAt, setSoldAt] = useState("")
  const [status, setStatus] = useState("active")
  const [currentHolding, setCurrentHolding] = useState<InvestmentHolding | null>(null)

  // Currencies
  const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]

  // Status options
  const statusOptions = ["active", "sold", "inactive"]

  // Fetch holdings and asset classes on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingHoldings(true)
      try {
        // Fetch holdings
        const holdingsResult = await getPortfolioHoldings(portfolioId)
        if (holdingsResult.error) {
          toast({
            title: "Error",
            description: holdingsResult.error,
            variant: "destructive",
          })
        } else if (holdingsResult.data) {
          setHoldings(holdingsResult.data)
        }

        // Fetch asset classes
        const defaultClasses = [
          "Stocks", 
          "Bonds", 
          "Cash", 
          "Alternative",
          "Shares",
          "Bills",
          "Crypto",
          "Real Estate"
        ];
        let mergedClasses: string[] = [...defaultClasses];
        try {
          const assetClassesResult = await getAssetClasses();
          let validClasses: string[] = [];
          if (assetClassesResult && assetClassesResult.data && Array.isArray(assetClassesResult.data)) {
            validClasses = assetClassesResult.data.filter((c: any): c is string => typeof c === 'string' && c.trim() !== '');
          }
          mergedClasses = Array.from(new Set([...defaultClasses, ...validClasses]));
        } catch (err) {
          // fallback to defaultClasses
        }
        setAssetClasses(mergedClasses);
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load holdings",
          variant: "destructive",
        })
      } finally {
        setIsLoadingHoldings(false)
      }
    }

    fetchData()
  }, [portfolioId, toast])

  // Reset form fields
  const resetForm = () => {
    setSymbol("")
    setName("")
    setAssetClass("stocks")
    setUnits("")
    setPurchasePrice("")
    setCurrentPrice("")
    setCurrency("USD")
    setAcquiredAt(new Date().toISOString().split('T')[0])
    setSoldAt("")
    setStatus("active")
    setCurrentHolding(null)
  }

  // Set form fields for editing
  const setFormForEdit = (holding: InvestmentHolding) => {
    setSymbol(holding.symbol)
    setName(holding.name || "")
    setAssetClass(holding.asset_class)
    setUnits(holding.units.toString())
    setPurchasePrice(holding.purchase_price.toString())
    setCurrentPrice(holding.current_price?.toString() || "")
    setCurrency(holding.currency)
    setAcquiredAt(holding.acquired_at)
    setSoldAt(holding.sold_at || "")
    setStatus(holding.status)
    setCurrentHolding(holding)
    setEditDialogOpen(true)
  }

  // Handle add holding submission
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Create form data for server action
      const formData = new FormData()
      formData.append("portfolio_id", portfolioId)
      formData.append("symbol", symbol)
      formData.append("name", name)
      formData.append("asset_class", assetClass)
      formData.append("units", units)
      formData.append("purchase_price", purchasePrice)
      if (currentPrice) formData.append("current_price", currentPrice)
      formData.append("currency", currency)
      formData.append("acquired_at", acquiredAt)
      formData.append("status", status)
      
      const result = await addHolding(formData)
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Holding added successfully",
        })
        resetForm()
        setAddDialogOpen(false)
        
        // Refresh holdings
        const holdingsResult = await getPortfolioHoldings(portfolioId)
        if (holdingsResult.data) {
          setHoldings(holdingsResult.data)
        }
      }
    } catch (error) {
      console.error("Error adding holding:", error)
      toast({
        title: "Error",
        description: "Failed to add holding",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle update holding submission
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      if (!currentHolding) {
        throw new Error("No holding selected for update")
      }
      
      // Create form data for server action
      const formData = new FormData()
      formData.append("id", currentHolding.id)
      formData.append("portfolio_id", portfolioId)
      formData.append("symbol", symbol)
      formData.append("name", name)
      formData.append("asset_class", assetClass)
      formData.append("units", units)
      formData.append("purchase_price", purchasePrice)
      if (currentPrice) formData.append("current_price", currentPrice)
      formData.append("currency", currency)
      formData.append("acquired_at", acquiredAt)
      if (soldAt) formData.append("sold_at", soldAt)
      formData.append("status", status)
      
      const result = await updateHolding(formData)
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Holding updated successfully",
        })
        resetForm()
        setEditDialogOpen(false)
        
        // Refresh holdings
        const holdingsResult = await getPortfolioHoldings(portfolioId)
        if (holdingsResult.data) {
          setHoldings(holdingsResult.data)
        }
      }
    } catch (error) {
      console.error("Error updating holding:", error)
      toast({
        title: "Error",
        description: "Failed to update holding",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle delete holding
  const handleDelete = async (id: string) => {
    setIsLoading(true)
    
    try {
      const result = await deleteHolding(id, portfolioId)
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Holding deleted successfully",
        })
        
        // Refresh holdings
        const holdingsResult = await getPortfolioHoldings(portfolioId)
        if (holdingsResult.data) {
          setHoldings(holdingsResult.data)
        }
      }
    } catch (error) {
      console.error("Error deleting holding:", error)
      toast({
        title: "Error",
        description: "Failed to delete holding",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate portfolio summary
  const calculatePortfolioSummary = () => {
    const activeHoldings = holdings.filter(h => h.status === 'active')
    
    const totalValue = activeHoldings.reduce((sum, holding) => {
      const price = holding.current_price || holding.purchase_price
      return sum + (holding.units * price)
    }, 0)
    
    const totalCost = activeHoldings.reduce((sum, holding) => {
      return sum + (holding.units * holding.purchase_price)
    }, 0)
    
    const totalGain = totalValue - totalCost
    const totalGainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0
    
    const assetClassDistribution = activeHoldings.reduce((acc, holding) => {
      const assetClass = holding.asset_class
      const value = (holding.current_price || holding.purchase_price) * holding.units
      
      if (!acc[assetClass]) {
        acc[assetClass] = 0
      }
      
      acc[assetClass] += value
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalValue,
      totalCost,
      totalGain,
      totalGainPercentage,
      assetClassDistribution,
      holdingsCount: activeHoldings.length
    }
  }

  const summary = calculatePortfolioSummary()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{portfolioName} - Holdings</h2>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm()
              setAcquiredAt(new Date().toISOString().split('T')[0])
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Holding
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Holding</DialogTitle>
              <DialogDescription>
                Add a new investment holding to your portfolio.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="symbol" className="text-right">
                    Symbol
                  </Label>
                  <Input
                    id="symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="asset-class" className="text-right">
                    Asset Class
                  </Label>
                  <Select
                    value={assetClass}
                    onValueChange={(value) => setAssetClass(value as AssetClass)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select asset class" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetClasses.map((ac) => (
                        <SelectItem key={ac} value={ac}>
                          {ac.charAt(0).toUpperCase() + ac.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="units" className="text-right">
                    Units
                  </Label>
                  <Input
                    id="units"
                    type="number"
                    step="0.000001"
                    min="0"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="purchase-price" className="text-right">
                    Purchase Price
                  </Label>
                  <Input
                    id="purchase-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="current-price" className="text-right">
                    Current Price
                  </Label>
                  <Input
                    id="current-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="currency" className="text-right">
                    Currency
                  </Label>
                  <Select
                    value={currency}
                    onValueChange={setCurrency}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="acquired-at" className="text-right">
                    Acquired Date
                  </Label>
                  <Input
                    id="acquired-at"
                    type="date"
                    value={acquiredAt}
                    onChange={(e) => setAcquiredAt(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Holding"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingHoldings ? "Loading..." : `$${summary.totalValue.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.holdingsCount} active holdings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingHoldings ? "Loading..." : `$${summary.totalCost.toFixed(2)}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isLoadingHoldings ? "Loading..." : `$${summary.totalGain.toFixed(2)} (${summary.totalGainPercentage.toFixed(2)}%)`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Allocation Chart */}
      {!isLoadingHoldings && holdings.length > 0 && (
        <PortfolioAssetAllocation />
      )}

      {/* Holdings Table */}
      {isLoadingHoldings ? (
        <div className="flex justify-center py-8">
          <p>Loading holdings...</p>
        </div>
      ) : holdings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No holdings found. Add your first holding to get started.</p>
        </div>
      ) : (
        <Table>
          <TableCaption>List of all holdings in {portfolioName}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Asset Class</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Purchase Price</TableHead>
              <TableHead className="text-right">Current Price</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Gain/Loss</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => {
              const currentPrice = holding.current_price || holding.purchase_price
              const value = holding.units * currentPrice
              const cost = holding.units * holding.purchase_price
              const gain = value - cost
              const gainPercentage = (gain / cost) * 100

              return (
                <TableRow key={holding.id}>
                  <TableCell className="font-medium">{holding.symbol}</TableCell>
                  <TableCell>{holding.name || holding.symbol}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {holding.asset_class.charAt(0).toUpperCase() + 
                       holding.asset_class.slice(1).replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{holding.units.toFixed(4)}</TableCell>
                  <TableCell className="text-right">
                    {holding.purchase_price.toLocaleString('en-US', {
                      style: 'currency',
                      currency: holding.currency
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {currentPrice.toLocaleString('en-US', {
                      style: 'currency',
                      currency: holding.currency
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {value.toLocaleString('en-US', {
                      style: 'currency',
                      currency: holding.currency
                    })}
                  </TableCell>
                  <TableCell className={`text-right ${gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {gain.toLocaleString('en-US', {
                      style: 'currency',
                      currency: holding.currency
                    })}
                    <span className="text-xs block">
                      ({gainPercentage.toFixed(2)}%)
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={holding.status === 'active' ? 'default' : 'secondary'}>
                      {holding.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFormForEdit(holding)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this holding.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(holding.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {/* Add Holding Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Holding</DialogTitle>
            <DialogDescription>
              Add a new investment holding to your portfolio.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="symbol" className="text-right">
                  Symbol
                </Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="asset-class" className="text-right">
                  Asset Class
                </Label>
                <Select
                  value={assetClass}
                  onValueChange={(value) => setAssetClass(value as AssetClass)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select asset class" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetClasses.map((ac) => (
                      <SelectItem key={ac} value={ac}>
                        {ac.charAt(0).toUpperCase() + ac.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="units" className="text-right">
                  Units
                </Label>
                <Input
                  id="units"
                  type="number"
                  step="0.000001"
                  min="0"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchase-price" className="text-right">
                  Purchase Price
                </Label>
                <Input
                  id="purchase-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="current-price" className="text-right">
                  Current Price
                </Label>
                <Input
                  id="current-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currency" className="text-right">
                  Currency
                </Label>
                <Select
                  value={currency}
                  onValueChange={setCurrency}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="acquired-at" className="text-right">
                  Acquired Date
                </Label>
                <Input
                  id="acquired-at"
                  type="date"
                  value={acquiredAt}
                  onChange={(e) => setAcquiredAt(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Holding"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Holding Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Holding</DialogTitle>
            <DialogDescription>
              Update your investment holding details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-symbol" className="text-right">
                  Symbol
                </Label>
                <Input
                  id="edit-symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-asset-class" className="text-right">
                  Asset Class
                </Label>
                <Select
                  value={assetClass}
                  onValueChange={(value) => setAssetClass(value as AssetClass)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select asset class" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetClasses.map((ac) => (
                      <SelectItem key={ac} value={ac}>
                        {ac.charAt(0).toUpperCase() + ac.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-units" className="text-right">
                  Units
                </Label>
                <Input
                  id="edit-units"
                  type="number"
                  step="0.000001"
                  min="0"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-purchase-price" className="text-right">
                  Purchase Price
                </Label>
                <Input
                  id="edit-purchase-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-current-price" className="text-right">
                  Current Price
                </Label>
                <Input
                  id="edit-current-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-currency" className="text-right">
                  Currency
                </Label>
                <Select
                  value={currency}
                  onValueChange={setCurrency}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-acquired-at" className="text-right">
                  Acquired Date
                </Label>
                <Input
                  id="edit-acquired-at"
                  type="date"
                  value={acquiredAt}
                  onChange={(e) => setAcquiredAt(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-sold-at" className="text-right">
                  Sold Date
                </Label>
                <Input
                  id="edit-sold-at"
                  type="date"
                  value={soldAt}
                  onChange={(e) => setSoldAt(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Status
                </Label>
                <Select
                  value={status}
                  onValueChange={setStatus}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Holding"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
