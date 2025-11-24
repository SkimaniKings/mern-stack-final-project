"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Loader2, AlertCircle, Info, ArrowLeft } from "lucide-react"
import { BudgetPieChart } from "@/components/budgeting/budget-pie-chart"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabaseClient } from "@/lib/supabase"
import { toast } from "sonner"

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
  tips?: string[]
  implementation_steps?: string[]
  author?: string
  created_at?: string
}

interface BudgetModelDetailsProps {
  modelId: string
  monthlyIncome: number
  onBack?: () => void
  onApply?: (model: BudgetModel) => void
}

export function BudgetModelDetails({ modelId, monthlyIncome, onBack, onApply }: BudgetModelDetailsProps) {
  const [model, setModel] = useState<BudgetModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  
  useEffect(() => {
    async function fetchModelDetails() {
      try {
        setLoading(true)
        setError(null)
        
        // Get the current user
        const { data: { user } } = await supabaseClient.auth.getUser()
        
        if (!user) {
          setError("You must be logged in to view budget model details")
          return
        }
        
        // Fetch the specific budget model from Supabase
        const { data, error: fetchError } = await supabaseClient
          .from('budget_models')
          .select('*')
          .eq('id', modelId)
          .single()
        
        if (fetchError) {
          console.error("Error fetching budget model:", fetchError)
          setError("Failed to load budget model details")
          return
        }
        
        if (!data) {
          setError("Budget model not found")
          return
        }
        
        // Process the data to ensure proper typing
        const processedModel: BudgetModel = {
          id: data.id,
          name: data.name,
          description: data.description,
          bestFor: data.best_for || "General budgeting",
          pros: data.pros || [],
          cons: data.cons || [],
          allocation: data.allocation || [],
          recommended_income_range: data.recommended_income_range,
          tips: data.tips || [],
          implementation_steps: data.implementation_steps || [],
          author: data.author,
          created_at: data.created_at
        }
        
        setModel(processedModel)
      } catch (err) {
        console.error("Error in fetchModelDetails:", err)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }
    
    fetchModelDetails()
  }, [modelId])
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }
  
  const handleApplyModel = async () => {
    if (!model) return
    
    try {
      setApplying(true)
      
      if (onApply) {
        onApply(model)
      } else {
        // Get the current user
        const { data: { user } } = await supabaseClient.auth.getUser()
        
        if (!user) {
          toast.error("You must be logged in to apply a budget model")
          return
        }
        
        // Create a new budget based on this model
        const { data, error } = await supabaseClient.from('budgets').insert({
          user_id: user.id,
          name: `${model.name} Budget`,
          description: `Budget created from ${model.name} model`,
          monthly_income: monthlyIncome,
          categories: model.allocation.map(item => ({
            name: item.category,
            amount: (monthlyIncome * item.percentage) / 100,
            percentage: item.percentage
          })),
          model_id: model.id,
          created_at: new Date().toISOString()
        }).select().single()
        
        if (error) {
          console.error("Error creating budget:", error)
          toast.error("Failed to create budget from model")
          return
        }
        
        toast.success("Budget created successfully!")
        
        // Redirect to the new budget
        window.location.href = `/budgets/${data.id}`
      }
    } catch (err) {
      console.error("Error applying budget model:", err)
      toast.error("An unexpected error occurred")
    } finally {
      setApplying(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading budget model details...</span>
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
  
  if (!model) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Budget model not found</AlertTitle>
        <AlertDescription>
          The requested budget model could not be found.
          {onBack && (
            <Button variant="link" onClick={onBack} className="p-0 h-auto mt-2">
              Go back to budget models
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }
  
  // Convert allocation to format expected by BudgetPieChart
  const categories = model.allocation.map((item) => ({
    name: item.category,
    amount: (monthlyIncome * item.percentage) / 100,
    percentage: item.percentage,
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{model.name}</h2>
          <p className="text-muted-foreground">{model.description}</p>
        </div>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Models
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget Allocation</CardTitle>
            <CardDescription>How your {formatCurrency(monthlyIncome)} would be allocated</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <BudgetPieChart categories={categories} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Overview</CardTitle>
            <CardDescription>Key information about the {model.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="font-medium mb-1">Best For</p>
              <p className="text-sm text-muted-foreground">{model.bestFor}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-medium mb-2">Pros</p>
                <ul className="space-y-2">
                  {model.pros.map((pro, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-medium mb-2">Cons</p>
                <ul className="space-y-2">
                  {model.cons.map((con, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {model.recommended_income_range && (
              <div>
                <p className="font-medium mb-1">Recommended Income Range</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(model.recommended_income_range.min)}/month
                  {model.recommended_income_range.max ? ` - ${formatCurrency(model.recommended_income_range.max)}/month` : ' and above'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Allocation</CardTitle>
          <CardDescription>Breakdown of how your income would be allocated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {model.allocation.map((item) => (
              <div key={item.category} className="space-y-1">
                <p className="font-medium">{item.category}</p>
                <p className="text-2xl">{formatCurrency((monthlyIncome * item.percentage) / 100)}</p>
                <p className="text-sm text-muted-foreground">{item.percentage}% of income</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {model.implementation_steps && model.implementation_steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Implementation Steps</CardTitle>
            <CardDescription>How to put this budget model into practice</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal pl-5 space-y-2">
              {model.implementation_steps.map((step, index) => (
                <li key={index} className="text-sm">{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
      
      {model.tips && model.tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tips for Success</CardTitle>
            <CardDescription>Advice to help you succeed with this budget</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {model.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button 
          size="lg" 
          onClick={handleApplyModel}
          disabled={applying}
        >
          {applying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Applying...
            </>
          ) : (
            'Apply This Budget Model'
          )}
        </Button>
      </div>
    </div>
  )
}

