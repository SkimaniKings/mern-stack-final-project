"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Info, AlertCircle, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabaseClient } from "@/lib/supabase"

interface BudgetModel {
  id: string
  name: string
  description: string
  bestFor: string
  pros: string[]
  cons: string[]
  allocation: {
    category: string
    percentage: number
  }[]
  recommended_income_range?: {
    min: number
    max: number | null
  }
}

interface BudgetModelComparisonProps {
  monthlyIncome: number
  onSelectModel: (modelId: string) => void
  preselectedModels?: string[]
}

export function BudgetModelComparison({ monthlyIncome, onSelectModel, preselectedModels }: BudgetModelComparisonProps) {
  const [models, setModels] = useState<BudgetModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function fetchBudgetModels() {
      try {
        setLoading(true)
        setError(null)
        
        // Get the current user
        const { data: { user } } = await supabaseClient.auth.getUser()
        
        if (!user) {
          setError("You must be logged in to view budget models")
          return
        }
        
        // Fetch budget models from Supabase
        let query = supabaseClient
          .from('budget_models')
          .select('*')
        
        // If preselected models are provided, only fetch those
        if (preselectedModels && preselectedModels.length > 0) {
          query = query.in('id', preselectedModels)
        }
        
        const { data, error: fetchError } = await query
        
        if (fetchError) {
          console.error("Error fetching budget models:", fetchError)
          setError("Failed to load budget models")
          return
        }
        
        // Process the data to ensure proper typing
        const processedModels = data.map((model: any) => ({
          id: model.id,
          name: model.name,
          description: model.description,
          bestFor: model.best_for || "General budgeting",
          pros: model.pros || [],
          cons: model.cons || [],
          allocation: model.allocation || [],
          recommended_income_range: model.recommended_income_range || { min: 0, max: null }
        }))
        
        // Sort models by relevance to user's income
        const sortedModels = processedModels.sort((a, b) => {
          // Check if model is suitable for user's income
          const aIsRecommended = isModelRecommendedForIncome(a, monthlyIncome)
          const bIsRecommended = isModelRecommendedForIncome(b, monthlyIncome)
          
          if (aIsRecommended && !bIsRecommended) return -1
          if (!aIsRecommended && bIsRecommended) return 1
          return 0
        })
        
        setModels(sortedModels)
      } catch (err) {
        console.error("Error in fetchBudgetModels:", err)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }
    
    fetchBudgetModels()
  }, [monthlyIncome, preselectedModels])
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }
  
  // Helper function to check if a model is recommended for the user's income
  const isModelRecommendedForIncome = (model: BudgetModel, income: number): boolean => {
    if (!model.recommended_income_range) return true
    
    const { min, max } = model.recommended_income_range
    if (income >= min && (max === null || income <= max)) {
      return true
    }
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading budget models...</span>
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  
  if (models.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No budget models found</AlertTitle>
        <AlertDescription>
          No budget models are available for your current income level. 
          Please try adjusting your income or contact support for assistance.
        </AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {models.map((model) => {
        const isRecommended = isModelRecommendedForIncome(model, monthlyIncome)
        
        return (
          <Card key={model.id} className={`flex flex-col ${isRecommended ? 'border-primary/50' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{model.name}</CardTitle>
                  <CardDescription>{model.description}</CardDescription>
                </div>
                {isRecommended && (
                  <Badge className="bg-primary hover:bg-primary/90">Recommended</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium">Best for:</p>
                <p className="text-sm text-muted-foreground">{model.bestFor}</p>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-sm font-medium">Pros:</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-[200px] text-xs">Advantages of this budgeting model</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {model.pros.slice(0, 3).map((pro, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{pro}</span>
                    </li>
                  ))}
                  {model.pros.length > 3 && (
                    <li className="text-xs text-muted-foreground pl-6">
                      +{model.pros.length - 3} more advantages
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Sample Allocation:</p>
                <div className="space-y-1.5">
                  {model.allocation.slice(0, 3).map((item) => (
                    <div key={item.category} className="flex justify-between items-center">
                      <p className="text-xs">{item.category}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.percentage}%
                        </Badge>
                        <p className="text-xs font-medium">{formatCurrency((monthlyIncome * item.percentage) / 100)}</p>
                      </div>
                    </div>
                  ))}
                  {model.allocation.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{model.allocation.length - 3} more categories
                    </p>
                  )}
                </div>
              </div>
              
              {model.recommended_income_range && (
                <div className="text-xs text-muted-foreground mt-2">
                  <p>Recommended for income: {formatCurrency(model.recommended_income_range.min)}/month
                  {model.recommended_income_range.max ? ` - ${formatCurrency(model.recommended_income_range.max)}/month` : ' and above'}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => onSelectModel(model.id)} 
                className="w-full"
                variant={isRecommended ? "default" : "outline"}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

