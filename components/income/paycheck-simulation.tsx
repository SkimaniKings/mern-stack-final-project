"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { PlusCircle, MinusCircle, Calculator, Save, ArrowRight, DollarSign, BarChart4, FileText } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { getIncomeSources } from "@/app/actions/income-sources"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface Deduction {
  id: string
  name: string
  amount: number
}

interface SimulationResult {
  baseSalary: number
  deductions: {
    preTax: Deduction[]
    postTax: Deduction[]
  }
  taxes: {
    total: number
    brackets: {
      rate: string
      amount: number
      incomeRange: string
    }[]
  }
  estimatedTakeHome: number
  id?: string
}

export function PaycheckSimulation() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [baseSalary, setBaseSalary] = useState("")
  const [preTaxDeductions, setPreTaxDeductions] = useState<Deduction[]>([
    { id: "1", name: "401(k)", amount: 0 }
  ])
  const [postTaxDeductions, setPostTaxDeductions] = useState<Deduction[]>([
    { id: "1", name: "Health Insurance", amount: 0 }
  ])
  const [country, setCountry] = useState("US")
  const [region, setRegion] = useState("Federal")
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [savedSimulations, setSavedSimulations] = useState<SimulationResult[]>([])
  const [activeTab, setActiveTab] = useState("simulation")
  const [incomeSources, setIncomeSources] = useState<any[]>([])
  const [isLoadingIncome, setIsLoadingIncome] = useState(false)
  const [selectedIncomeSource, setSelectedIncomeSource] = useState<string | null>(null)

  // Load saved simulations and income sources on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch saved simulations
        const simulationsResponse = await fetch("/api/income/paycheck-simulation")
        if (simulationsResponse.ok) {
          const data = await simulationsResponse.json()
          setSavedSimulations(data)
        }

        // Fetch income sources
        setIsLoadingIncome(true)
        const sources = await fetchIncomeSources()
        setIncomeSources(sources || [])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoadingIncome(false)
      }
    }

    fetchData()
  }, [])

  const fetchIncomeSources = async () => {
    try {
      // Use the server action to get income sources
      return await getIncomeSources()
    } catch (error) {
      console.error("Error fetching income sources:", error)
      return []
    }
  }

  const loadIncomeSourceData = (sourceId: string) => {
    const source = incomeSources.find(source => source.id === sourceId)
    if (!source) return

    // Convert to annual amount based on frequency
    let annualAmount = Number(source.amount)
    switch (source.frequency) {
      case 'weekly':
        annualAmount *= 52
        break
      case 'bi-weekly':
        annualAmount *= 26
        break
      case 'monthly':
        annualAmount *= 12
        break
      case 'annually':
        // Already annual
        break
      default:
        // Default to annual
        break
    }

    setBaseSalary(annualAmount.toString())
    setSelectedIncomeSource(sourceId)
    
    toast({
      title: "Income source loaded",
      description: `Loaded data from ${source.name}`,
    })
  }

  const addDeduction = (type: "preTax" | "postTax") => {
    const newDeduction = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      amount: 0
    }
    
    if (type === "preTax") {
      setPreTaxDeductions([...preTaxDeductions, newDeduction])
    } else {
      setPostTaxDeductions([...postTaxDeductions, newDeduction])
    }
  }

  const removeDeduction = (type: "preTax" | "postTax", id: string) => {
    if (type === "preTax") {
      setPreTaxDeductions(preTaxDeductions.filter(d => d.id !== id))
    } else {
      setPostTaxDeductions(postTaxDeductions.filter(d => d.id !== id))
    }
  }

  const updateDeduction = (
    type: "preTax" | "postTax", 
    id: string, 
    field: "name" | "amount", 
    value: string
  ) => {
    if (type === "preTax") {
      setPreTaxDeductions(
        preTaxDeductions.map((deduction) => 
          deduction.id === id 
            ? { 
                ...deduction, 
                [field]: field === "amount" ? Number(value) : value 
              } 
            : deduction
        )
      )
    } else {
      setPostTaxDeductions(
        postTaxDeductions.map((deduction) => 
          deduction.id === id 
            ? { 
                ...deduction, 
                [field]: field === "amount" ? Number(value) : value 
              } 
            : deduction
        )
      )
    }
  }

  const runSimulation = async () => {
    if (!baseSalary || isNaN(Number(baseSalary)) || Number(baseSalary) <= 0) {
      toast({
        title: "Invalid salary",
        description: "Please enter a valid base salary amount",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      // Log the request payload for debugging
      const payload = {
        baseSalary: Number(baseSalary),
        deductions: {
          preTax: preTaxDeductions.filter(d => d.name && d.amount > 0),
          postTax: postTaxDeductions.filter(d => d.name && d.amount > 0)
        },
        taxInfo: {
          country,
          region
        }
      }
      
      console.log("Simulation request payload:", payload)

      // Add a timeout to the fetch to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      try {
        const response = await fetch("/api/income/paycheck-simulation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        })
        
        // Clear the timeout since the request completed
        clearTimeout(timeoutId)
        
        console.log("Simulation response status:", response.status)
        
        if (response.ok) {
          let result
          try {
            result = await response.json()
            console.log("Simulation result:", result)
          } catch (parseError) {
            console.error("Error parsing JSON response:", parseError)
            toast({
              title: "Simulation error",
              description: "Failed to parse simulation results",
              variant: "destructive"
            })
            setIsLoading(false)
            return
          }
          
          // Ensure the result has all required properties
          if (result && typeof result.baseSalary !== 'undefined' && 
              typeof result.estimatedTakeHome !== 'undefined' && 
              result.taxes && result.deductions) {
            
            // Define interfaces for type safety
            interface TaxBracket {
              rate: string;
              amount: number;
              incomeRange: string;
            }
            
            interface SimulationDeduction {
              id: string;
              name: string;
              amount: number;
            }
            
            // Convert all numeric values to ensure they're treated as numbers
            const processedResult = {
              ...result,
              baseSalary: Number(result.baseSalary),
              estimatedTakeHome: Number(result.estimatedTakeHome),
              taxes: {
                ...result.taxes,
                total: Number(result.taxes.total),
                brackets: Array.isArray(result.taxes.brackets) 
                  ? result.taxes.brackets.map((bracket: any) => ({
                      ...bracket,
                      amount: Number(bracket.amount)
                    })) 
                  : []
              },
              deductions: {
                preTax: Array.isArray(result.deductions.preTax) 
                  ? result.deductions.preTax.map((d: any) => ({
                      ...d,
                      amount: Number(d.amount)
                    })) 
                  : [],
                postTax: Array.isArray(result.deductions.postTax) 
                  ? result.deductions.postTax.map((d: any) => ({
                      ...d,
                      amount: Number(d.amount)
                    })) 
                  : []
              }
            }
            
            console.log("Processed simulation result:", processedResult)
            setSimulationResult(processedResult)
            
            // Force the active tab to switch to results
            setTimeout(() => {
              setActiveTab("results")
            }, 100)
            
            toast({
              title: "Simulation complete",
              description: "Your paycheck simulation has been calculated"
            })
          } else {
            console.error("Invalid simulation result structure:", result)
            toast({
              title: "Simulation error",
              description: "Received invalid simulation result structure",
              variant: "destructive"
            })
          }
        } else {
          let errorMessage = "An error occurred during simulation"
          try {
            const error = await response.json()
            console.error("Simulation API error:", error)
            errorMessage = error.error || errorMessage
          } catch (e) {
            console.error("Error parsing error response:", e)
          }
          
          toast({
            title: "Simulation failed",
            description: errorMessage,
            variant: "destructive"
          })
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          console.error("Simulation request timed out")
          toast({
            title: "Simulation timed out",
            description: "The request took too long to complete. Please try again.",
            variant: "destructive"
          })
        } else {
          console.error("Fetch error:", fetchError)
          toast({
            title: "Simulation failed",
            description: "Failed to connect to the simulation service",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error("Simulation error:", error)
      toast({
        title: "Simulation failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Prepare data for the waterfall chart
  const getWaterfallData = () => {
    if (!simulationResult) return []

    // Ensure all values are numbers
    const totalPreTaxDeductions = simulationResult.deductions.preTax.reduce(
      (sum, d) => sum + Number(d.amount), 0
    )
    
    const totalPostTaxDeductions = simulationResult.deductions.postTax.reduce(
      (sum, d) => sum + Number(d.amount), 0
    )

    return [
      {
        name: "Gross Salary",
        amount: Number(simulationResult.baseSalary),
        fill: "#4ade80"
      },
      {
        name: "Pre-Tax Deductions",
        amount: -totalPreTaxDeductions,
        fill: "#fb923c"
      },
      {
        name: "Taxable Income",
        amount: Number(simulationResult.baseSalary) - totalPreTaxDeductions,
        fill: "#60a5fa",
        isSubtotal: true
      },
      {
        name: "Taxes",
        amount: -Number(simulationResult.taxes.total),
        fill: "#f87171"
      },
      {
        name: "Post-Tax Deductions",
        amount: -totalPostTaxDeductions,
        fill: "#fb923c"
      },
      {
        name: "Take-Home Pay",
        amount: Number(simulationResult.estimatedTakeHome),
        fill: "#4ade80",
        isSubtotal: true
      }
    ]
  }

  // Prepare data for the pie chart
  const getPieChartData = () => {
    if (!simulationResult) return []

    const totalPreTaxDeductions = simulationResult.deductions.preTax.reduce(
      (sum, d) => sum + Number(d.amount), 0
    )
    
    const totalPostTaxDeductions = simulationResult.deductions.postTax.reduce(
      (sum, d) => sum + Number(d.amount), 0
    )

    return [
      {
        name: "Take-Home Pay",
        value: simulationResult.estimatedTakeHome,
        fill: "#4ade80"
      },
      {
        name: "Taxes",
        value: simulationResult.taxes.total,
        fill: "#f87171"
      },
      {
        name: "Pre-Tax Deductions",
        value: totalPreTaxDeductions,
        fill: "#fb923c"
      },
      {
        name: "Post-Tax Deductions",
        value: totalPostTaxDeductions,
        fill: "#8b5cf6"
      }
    ]
  }

  // Calculate take-home percentage
  const getTakeHomePercentage = () => {
    if (!simulationResult) return 0
    return Math.round((simulationResult.estimatedTakeHome / simulationResult.baseSalary) * 100)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Paycheck Simulation Tool
        </CardTitle>
        <CardDescription>
          Visualize how changes to your salary, deductions, and tax situation affect your take-home pay
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simulation" className="flex items-center gap-1">
              <FileText className="h-4 w-4" /> Input
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-1">
              <BarChart4 className="h-4 w-4" /> Results
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="simulation" className="space-y-4">
            <div className="space-y-4">
              {incomeSources.length > 0 && (
                <div className="space-y-2">
                  <Label>Load from Income Source</Label>
                  <div className="flex flex-wrap gap-2">
                    {incomeSources.map(source => (
                      <Badge 
                        key={source.id}
                        variant={selectedIncomeSource === source.id ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/90 transition-colors"
                        onClick={() => loadIncomeSourceData(source.id)}
                      >
                        {source.name} ({formatCurrency(Number(source.amount))}/{source.frequency})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="baseSalary">Base Salary (Annual)</Label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="baseSalary"
                    type="number"
                    placeholder="60000"
                    className="pl-7"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pre-Tax Deductions</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addDeduction("preTax")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                
                {preTaxDeductions.map((deduction) => (
                  <div key={deduction.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Deduction name"
                      value={deduction.name}
                      onChange={(e) => updateDeduction("preTax", deduction.id, "name", e.target.value)}
                      className="flex-1"
                    />
                    <div className="relative w-32">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        placeholder="0"
                        className="pl-7"
                        value={deduction.amount || ""}
                        onChange={(e) => updateDeduction("preTax", deduction.id, "amount", e.target.value)}
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeDeduction("preTax", deduction.id)}
                    >
                      <MinusCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Post-Tax Deductions</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addDeduction("postTax")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                
                {postTaxDeductions.map((deduction) => (
                  <div key={deduction.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Deduction name"
                      value={deduction.name}
                      onChange={(e) => updateDeduction("postTax", deduction.id, "name", e.target.value)}
                      className="flex-1"
                    />
                    <div className="relative w-32">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        placeholder="0"
                        className="pl-7"
                        value={deduction.amount || ""}
                        onChange={(e) => updateDeduction("postTax", deduction.id, "amount", e.target.value)}
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeDeduction("postTax", deduction.id)}
                    >
                      <MinusCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Federal">Federal</SelectItem>
                      {country === "US" && (
                        <>
                          <SelectItem value="CA">California</SelectItem>
                          <SelectItem value="NY">New York</SelectItem>
                          <SelectItem value="TX">Texas</SelectItem>
                          <SelectItem value="FL">Florida</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="results">
            {simulationResult ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Gross Salary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(Number(simulationResult.baseSalary))}</div>
                      <p className="text-xs text-muted-foreground">Annual</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Deductions & Taxes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-500">
                        {formatCurrency(
                          simulationResult.deductions.preTax.reduce((sum, d) => sum + Number(d.amount), 0) +
                          simulationResult.deductions.postTax.reduce((sum, d) => sum + Number(d.amount), 0) +
                          simulationResult.taxes.total
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Annual</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Take-Home Pay</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-500">
                        {formatCurrency(Number(simulationResult.estimatedTakeHome))}
                      </div>
                      <p className="text-xs text-muted-foreground">Annual</p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Take-Home Percentage</h3>
                    <span className="font-bold">{getTakeHomePercentage()}%</span>
                  </div>
                  <Progress value={getTakeHomePercentage()} className="h-2" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Paycheck Breakdown</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getWaterfallData()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value) => [`${formatCurrency(Math.abs(Number(value)))}`, ""]}
                            labelFormatter={(label) => `${label}`}
                          />
                          <Bar dataKey="amount" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Distribution</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getPieChartData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getPieChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [formatCurrency(Number(value)), ""]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Tax Breakdown</h3>
                  <div className="space-y-2">
                    {simulationResult.taxes.brackets.map((bracket, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{bracket.incomeRange} ({bracket.rate})</span>
                        <span>{formatCurrency(Number(bracket.amount))}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Tax</span>
                      <span>{formatCurrency(Number(simulationResult.taxes.total))}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Monthly Breakdown</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Monthly Gross</p>
                      <p className="font-medium">{formatCurrency(Number(simulationResult.baseSalary) / 12)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Monthly Take-Home</p>
                      <p className="font-medium">{formatCurrency(Number(simulationResult.estimatedTakeHome) / 12)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No simulation results yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Fill out the simulation form and run the calculator to see your results
                </p>
                <Button onClick={() => setActiveTab("simulation")}>
                  Go to Simulation <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setActiveTab(activeTab === "simulation" ? "results" : "simulation")}>
          {activeTab === "simulation" ? "View Results" : "Edit Simulation"}
        </Button>
        <Button 
          onClick={runSimulation} 
          disabled={isLoading} 
          className="bg-blue-600 hover:bg-blue-700"
          type="button"
        >
          {isLoading ? "Calculating..." : "Run Simulation"}
          <Calculator className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
