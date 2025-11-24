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
import { PlusCircle } from "lucide-react"
import { getAssetClasses } from "@/app/actions/investments"
import { addInvestment } from "@/app/actions/add-investment"

interface AddInvestmentFormProps {
  onInvestmentAdded?: () => void;
  className?: string;
  investment?: any; // For edit mode
  isEditMode?: boolean;
}

export function AddInvestmentForm({ onInvestmentAdded, className, investment, isEditMode = false }: AddInvestmentFormProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [assetClasses, setAssetClasses] = useState<string[]>([])
  const { toast } = useToast()

  // Helper function to format date as YYYY-MM-DD for input[type="date"]
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  }

  // Get today's date formatted for the date input
  const today = formatDateForInput(new Date());

  // Form state
  const [name, setName] = useState(investment?.name || "")
  const [ticker, setTicker] = useState(investment?.ticker || "")
  const [type, setType] = useState(investment?.type || "")
  const [value, setValue] = useState(investment?.value?.toString() || "")
  const [costBasis, setCostBasis] = useState(investment?.cost_basis?.toString() || "")
  const [accountName, setAccountName] = useState(investment?.accounts?.name || "Default")
  const [currency, setCurrency] = useState(investment?.currency || "USD")
  const [quantity, setQuantity] = useState(investment?.quantity?.toString() || "")
  const [initialPrice, setInitialPrice] = useState(investment?.initial_price?.toString() || "")
  const [currentPrice, setCurrentPrice] = useState(investment?.current_price?.toString() || "")
  const [purchaseDate, setPurchaseDate] = useState(investment?.purchase_date || today)

  // Predefined account types
  const accountTypes = ["Default", "401k", "IRA", "Taxable", "HSA", "Brokerage", "Roth IRA"]
  
  // Currencies
  const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]

  const updateDerivedValues = (quantity: string, initialPrice: string, currentPrice: string) => {
    if (quantity && initialPrice && !isNaN(parseFloat(quantity)) && !isNaN(parseFloat(initialPrice))) {
      const calculatedCostBasis = parseFloat(quantity) * parseFloat(initialPrice)
      setCostBasis(calculatedCostBasis.toFixed(2))
    }
    
    if (quantity && currentPrice && !isNaN(parseFloat(quantity)) && !isNaN(parseFloat(currentPrice))) {
      const calculatedValue = parseFloat(quantity) * parseFloat(currentPrice)
      setValue(calculatedValue.toFixed(2))
    }
  }

  // Set default asset types on component mount
  useEffect(() => {
    const defaultAssetTypes = [
      "Stocks", 
      "Bonds", 
      "Cash", 
      "Alternative",
      "Shares",
      "Bills",
      "Crypto",
      "Real Estate"
    ];
    
    // If no asset classes are set yet, use the defaults
    if (assetClasses.length === 0) {
      setAssetClasses(defaultAssetTypes);
      if (!type) {
        setType(defaultAssetTypes[0]);
      }
    }
  }, []);

  // Fetch asset classes when dialog opens
  useEffect(() => {
    if (open) {
      const fetchAssetClasses = async () => {
        try {
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
          const classes = await getAssetClasses();
          let validClasses: string[] = [];
          if (classes && Array.isArray(classes)) {
            validClasses = classes.filter((c): c is string => typeof c === 'string' && c.trim() !== '');
          }
          // Merge and deduplicate
          const mergedClasses = Array.from(new Set([...defaultClasses, ...validClasses]));
          setAssetClasses(mergedClasses);
          if (!type || !mergedClasses.includes(type)) {
            setType(mergedClasses[0]);
          }
        } catch (error) {
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
          setAssetClasses(defaultClasses);
          if (!type) {
            setType(defaultClasses[0]);
          }
        }
      };
      fetchAssetClasses();
    }
  }, [open, type]);

  // Reset form fields
  const resetForm = () => {
    setName("")
    setTicker("")
    setType(assetClasses[0] || "")
    setValue("")
    setCostBasis("")
    setAccountName("Default")
    setCurrency("USD")
    setQuantity("")
    setInitialPrice("")
    setCurrentPrice("")
    setPurchaseDate(today)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Create form data for server action
      const formData = new FormData()
      
      // Add basic investment data
      formData.append("name", name)
      formData.append("type", type)
      formData.append("value", value)
      formData.append("cost_basis", costBasis)
      formData.append("purchase_date", purchaseDate)
      
      // Add optional fields with null checks
      if (ticker) formData.append("ticker", ticker)
      if (accountName) formData.append("account_name", accountName)
      if (currency) formData.append("currency", currency)
      
      // Add new fields only if they have values
      if (quantity !== undefined && quantity !== null) {
        formData.append("quantity", quantity)
      }
      
      if (initialPrice !== undefined && initialPrice !== null) {
        formData.append("initial_price", initialPrice)
      }
      
      if (currentPrice !== undefined && currentPrice !== null) {
        formData.append("current_price", currentPrice)
      }
      
      // If in edit mode, add the ID
      if (isEditMode && investment?.id) {
        formData.append("id", investment.id)
      }
      
      // Log form data for debugging
      console.log("Form data being submitted with purchase date:", purchaseDate)
      console.log("Submitting form with data:", Object.fromEntries(formData.entries()))
      
      const result = await addInvestment(formData)
      
      console.log("Form submitted successfully:", result)
      
      if (result.success) {
        toast({
          title: "Success",
          description: isEditMode ? "Investment updated successfully" : "Investment added to portfolio",
        })
        resetForm()
        setOpen(false)
        
        // Call the callback to refresh the portfolio data
        if (onInvestmentAdded) {
          onInvestmentAdded()
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add investment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "adding"} investment:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${isEditMode ? "update" : "add"} investment. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={className} variant={isEditMode ? "outline" : "default"}>
          {isEditMode ? (
            "Edit Investment"
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Investment
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Investment" : "Add New Investment"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update the details of your investment." 
              : "Enter the details of your investment to add it to your portfolio."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
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
              <Label htmlFor="ticker" className="text-right">
                Ticker
              </Label>
              <Input
                id="ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="col-span-3"
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <div className="col-span-3">
                <Select 
                  value={type} 
                  onValueChange={(value) => {
                    console.log("Type selected:", value);
                    setType(value);
                  }} 
                  required
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetClasses.length > 0 ? (
                      assetClasses.map((assetClass) => (
                        <SelectItem key={assetClass} value={assetClass}>
                          {assetClass}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>Loading asset types...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {assetClasses.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Loading asset types...
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  updateDerivedValues(e.target.value, initialPrice, currentPrice);
                }}
                className="col-span-3"
                placeholder="Number of shares/units"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="initialPrice" className="text-right">
                Initial Price
              </Label>
              <Input
                id="initialPrice"
                type="number"
                value={initialPrice}
                onChange={(e) => {
                  setInitialPrice(e.target.value);
                  updateDerivedValues(quantity, e.target.value, currentPrice);
                }}
                className="col-span-3"
                placeholder="Cost per unit"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentPrice" className="text-right">
                Current Price
              </Label>
              <Input
                id="currentPrice"
                type="number"
                value={currentPrice}
                onChange={(e) => {
                  setCurrentPrice(e.target.value);
                  updateDerivedValues(quantity, initialPrice, e.target.value);
                }}
                className="col-span-3"
                placeholder="Current market price"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Value
              </Label>
              <Input
                id="value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="costBasis" className="text-right">
                Cost Basis
              </Label>
              <Input
                id="costBasis"
                type="number"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="account" className="text-right">
                Account
              </Label>
              <Select value={accountName} onValueChange={setAccountName}>
                <SelectTrigger id="account" className="col-span-3">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((account) => (
                    <SelectItem key={account} value={account}>
                      {account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">
                Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency" className="col-span-3">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      {curr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchaseDate" className="text-right">
                Date Purchased
              </Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update Investment" : "Add Investment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
