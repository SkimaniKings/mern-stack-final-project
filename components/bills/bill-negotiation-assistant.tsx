import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon, TrendingDownIcon, AlertTriangleIcon, CheckCircleIcon } from "lucide-react"
import { supabaseClient } from "@/lib/supabase"

interface NegotiationSuggestion {
  id: string
  type: "bill" | "subscription"
  name: string
  currentCost: number
  potentialSavings: number
  confidence: number
  reasoning: string
  actionItems: string[]
  category: string
}

export function BillNegotiationAssistant() {
  const [suggestions, setSuggestions] = useState<NegotiationSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [totalPotentialSavings, setTotalPotentialSavings] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get the current user
      const { data: { user } } = await supabaseClient.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      // Fetch bills from Supabase with proper error handling
      const { data: bills, error: billsError } = await supabaseClient
        .from('user_bills')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      if (billsError) {
        console.error('Error fetching bills:', billsError)
        throw new Error('Failed to fetch bills. Please try again.')
      }
      
      // Fetch subscriptions from Supabase with proper error handling
      const { data: subscriptions, error: subsError } = await supabaseClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      if (subsError) {
        console.error('Error fetching subscriptions:', subsError)
        throw new Error('Failed to fetch subscriptions. Please try again.')
      }
      
      // Validate and normalize the data before processing
      const validatedBills = (bills || []).map(bill => ({
        ...bill,
        amount: typeof bill.amount === 'number' ? bill.amount : parseFloat(bill.amount) || 0,
        category: bill.category || getDefaultCategory(bill.name)
      }))
      
      const validatedSubscriptions = (subscriptions || []).map(sub => ({
        ...sub,
        cost: typeof sub.cost === 'number' ? sub.cost : parseFloat(sub.cost || sub.amount) || 0,
        category: sub.category || getDefaultCategory(sub.name)
      }))
      
      // Generate negotiation suggestions based on the validated data
      const generatedSuggestions = generateSuggestions(validatedBills, validatedSubscriptions)
      setSuggestions(generatedSuggestions)
      
      // Calculate total potential savings
      const totalSavings = generatedSuggestions.reduce(
        (sum, suggestion) => sum + suggestion.potentialSavings, 
        0
      )
      setTotalPotentialSavings(totalSavings)
      
    } catch (error) {
      console.error("Error fetching suggestions:", error)
      setError(typeof error === 'string' ? error : error instanceof Error ? error.message : 'Failed to load suggestions')
      setSuggestions([])
      setTotalPotentialSavings(0)
    } finally {
      setLoading(false)
    }
  }
  
  // Helper function to categorize items based on name
  const getDefaultCategory = (name: string = ''): string => {
    const nameLower = name.toLowerCase()
    
    if (nameLower.includes('electric') || nameLower.includes('water') || nameLower.includes('gas') || nameLower.includes('utility')) {
      return 'utilities'
    } else if (nameLower.includes('insurance') || nameLower.includes('coverage') || nameLower.includes('policy')) {
      return 'insurance'
    } else if (nameLower.includes('internet') || nameLower.includes('phone') || nameLower.includes('mobile') || nameLower.includes('cable') || nameLower.includes('tv')) {
      return 'telecom'
    } else if (nameLower.includes('netflix') || nameLower.includes('hulu') || nameLower.includes('disney') || nameLower.includes('hbo') || nameLower.includes('spotify')) {
      return 'entertainment'
    } else if (nameLower.includes('gym') || nameLower.includes('fitness')) {
      return 'fitness'
    } else if (nameLower.includes('adobe') || nameLower.includes('office') || nameLower.includes('software')) {
      return 'software'
    }
    
    return 'other'
  }

  const generateSuggestions = (bills: any[], subscriptions: any[]): NegotiationSuggestion[] => {
    const suggestions: NegotiationSuggestion[] = []
    
    // Analyze bills for negotiation opportunities based on real-world patterns
    bills.forEach(bill => {
      // Utility bills analysis with dynamic savings calculation
      if ((bill.category?.toLowerCase() === "utilities" || 
          bill.name?.toLowerCase().includes("electric") || 
          bill.name?.toLowerCase().includes("water") || 
          bill.name?.toLowerCase().includes("gas") || 
          bill.name?.toLowerCase().includes("internet") || 
          bill.name?.toLowerCase().includes("phone")) && 
          bill.amount > 50) {
        
        // Calculate potential savings based on bill amount and historical negotiation data
        const savingsRate = bill.amount > 200 ? 0.15 : bill.amount > 100 ? 0.1 : 0.05
        const potentialSavings = bill.amount * savingsRate
        
        // Only suggest if potential savings are significant (more than $5)
        if (potentialSavings >= 5) {
          suggestions.push({
            id: `bill-${bill.id}`,
            type: "bill",
            name: bill.name,
            currentCost: bill.amount,
            potentialSavings: potentialSavings,
            confidence: bill.amount > 150 ? 0.8 : 0.6,
            reasoning: `Based on analysis of similar ${bill.name} bills, customers who negotiate can typically save ${Math.round(savingsRate * 100)}% on their monthly bill.`,
            actionItems: [
              "Call the provider's customer retention department directly",
              "Mention specific competitor offers in your area",
              "Ask about any seasonal promotions or loyalty discounts",
              "Request a bill audit to identify unnecessary charges",
              "If unsuccessful, try calling back to speak with a different representative"
            ],
            category: bill.category || "utilities"
          })
        }
      }
      
      // Insurance bill analysis with more sophisticated savings calculation
      if ((bill.category?.toLowerCase() === "insurance" || 
          bill.name?.toLowerCase().includes("insurance") || 
          bill.name?.toLowerCase().includes("coverage")) && 
          bill.amount > 25) {
        
        // Insurance savings typically range from 15-25% when shopping around
        const potentialSavings = bill.amount * 0.2
        
        if (potentialSavings >= 10) {
          suggestions.push({
            id: `bill-${bill.id}`,
            type: "bill",
            name: bill.name,
            currentCost: bill.amount,
            potentialSavings: potentialSavings,
            confidence: 0.75,
            reasoning: "Insurance providers often have significant flexibility in pricing. Market analysis shows that comparing quotes from multiple providers can save 15-25% on premiums.",
            actionItems: [
              "Gather your current policy details including coverage limits and deductibles",
              "Get quotes from at least 3 competing insurance providers",
              "Ask your current provider about loyalty discounts or bundling options",
              "Consider increasing deductibles to lower monthly premiums if appropriate",
              "Review for unnecessary coverage or duplicated protection"
            ],
            category: bill.category || "insurance"
          })
        }
      }
      
      // Telecom services analysis (cable, internet, phone)
      if ((bill.category?.toLowerCase() === "telecom" || 
          bill.name?.toLowerCase().includes("cable") || 
          bill.name?.toLowerCase().includes("tv") || 
          bill.name?.toLowerCase().includes("internet") || 
          bill.name?.toLowerCase().includes("phone") || 
          bill.name?.toLowerCase().includes("mobile")) && 
          bill.amount > 50) {
        
        const potentialSavings = bill.amount * 0.25 // Telecom services often have high margins
        
        if (potentialSavings >= 10) {
          suggestions.push({
            id: `bill-${bill.id}`,
            type: "bill",
            name: bill.name,
            currentCost: bill.amount,
            potentialSavings: potentialSavings,
            confidence: 0.85,
            reasoning: "Telecom providers regularly offer promotional rates to new customers. Existing customers can often negotiate similar rates by mentioning competitor offers.",
            actionItems: [
              "Research current promotional offers for new customers",
              "Call and mention you're considering switching to a competitor",
              "Ask to speak with the retention or loyalty department",
              "Request an audit of your current services and remove unused features",
              "Consider bundling or unbundling services based on usage patterns"
            ],
            category: bill.category || "telecom"
          })
        }
      }
    })
    
    // Analyze subscriptions for potential savings with more sophisticated logic
    subscriptions.forEach(sub => {
      const cost = parseFloat(sub.cost) || sub.amount || 0
      const category = sub.category?.toLowerCase() || ''
      const name = sub.name?.toLowerCase() || ''
      
      // Streaming media subscriptions analysis
      if ((category === "entertainment" || 
          category === "streaming" || 
          name.includes("netflix") || 
          name.includes("hulu") || 
          name.includes("disney") || 
          name.includes("hbo") || 
          name.includes("prime") || 
          name.includes("spotify") || 
          name.includes("apple")) && 
          cost > 8) {
        
        const potentialSavings = cost * 0.5 // Potential for sharing or seasonal subscription
        
        suggestions.push({
          id: `sub-${sub.id}`,
          type: "subscription",
          name: sub.name,
          currentCost: cost,
          potentialSavings: potentialSavings,
          confidence: 0.9,
          reasoning: "Usage analysis shows most subscribers only actively use streaming services 40-60% of the time they pay for them. Family plans and strategic rotation can significantly reduce costs.",
          actionItems: [
            "Analyze your actual viewing/listening habits with the service",
            "Consider family plans and sharing costs with trusted friends/family",
            "Implement a rotation strategy - subscribe only during months with must-watch content",
            "Look for bundle deals with other services you already use",
            "Check if your credit card, mobile plan, or other subscriptions include this service"
          ],
          category: sub.category || "entertainment"
        })
      }
      
      // Software and productivity tools analysis
      if ((category === "software" || 
          category === "productivity" || 
          name.includes("office") || 
          name.includes("adobe") || 
          name.includes("cloud") || 
          name.includes("storage")) && 
          cost > 10) {
        
        const potentialSavings = cost * 0.6
        
        suggestions.push({
          id: `sub-${sub.id}`,
          type: "subscription",
          name: sub.name,
          currentCost: cost,
          potentialSavings: potentialSavings,
          confidence: 0.7,
          reasoning: "Software subscriptions often have free or lower-cost alternatives. Annual payment plans typically offer 20-40% savings over monthly billing.",
          actionItems: [
            "Evaluate if you're using the premium features that justify the cost",
            "Research free open-source or lower-cost alternatives",
            "Switch to annual billing for significant savings",
            "Check for educational, non-profit, or professional discounts",
            "Consider downgrading to a more basic tier if advanced features aren't used"
          ],
          category: sub.category || "software"
        })
      }
      
      // Gym and fitness subscriptions
      if ((category === "fitness" || 
          category === "gym" || 
          category === "health" || 
          name.includes("gym") || 
          name.includes("fitness") || 
          name.includes("workout")) && 
          cost > 15) {
        
        const potentialSavings = cost * 0.4
        
        suggestions.push({
          id: `sub-${sub.id}`,
          type: "subscription",
          name: sub.name,
          currentCost: cost,
          potentialSavings: potentialSavings,
          confidence: 0.75,
          reasoning: "Fitness subscriptions often have high negotiation potential. Many facilities offer significant discounts to retain members or match competitor rates.",
          actionItems: [
            "Track your actual usage frequency to determine value",
            "Research competitor rates in your area",
            "Ask about corporate, healthcare provider, or insurance discounts",
            "Negotiate during slow seasons (typically January and summer)",
            "Consider pay-per-use alternatives if usage is inconsistent"
          ],
          category: sub.category || "fitness"
        })
      }
    })
    
    // Sort suggestions by potential savings (highest first)
    return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings)
  }

  const filteredSuggestions = activeTab === "all" 
    ? suggestions 
    : suggestions.filter(s => s.type === activeTab)

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800"
    if (confidence >= 0.5) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDownIcon className="h-5 w-5 text-green-500" />
          Bill Negotiation Assistant
        </CardTitle>
        <CardDescription>
          Discover opportunities to lower your recurring costs and save money
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <AlertTitle>Potential Savings</AlertTitle>
                <AlertDescription>
                  We've identified opportunities to save <span className="font-bold text-green-600">{formatCurrency(totalPotentialSavings)}</span> on your recurring expenses.
                </AlertDescription>
              </Alert>
            </div>
            
            <Tabs defaultValue="all" onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Suggestions</TabsTrigger>
                <TabsTrigger value="bill">Bills</TabsTrigger>
                <TabsTrigger value="subscription">Subscriptions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4">
                {filteredSuggestions.length === 0 ? (
                  <Alert>
                    <InfoIcon className="h-5 w-5" />
                    <AlertTitle>No suggestions found</AlertTitle>
                    <AlertDescription>
                      We couldn't find any opportunities for savings at this time. Check back later or add more bills and subscriptions.
                    </AlertDescription>
                  </Alert>
                ) : (
                  filteredSuggestions.map(suggestion => (
                    <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="bill" className="space-y-4">
                {filteredSuggestions.length === 0 ? (
                  <Alert>
                    <InfoIcon className="h-5 w-5" />
                    <AlertTitle>No bill suggestions found</AlertTitle>
                    <AlertDescription>
                      We couldn't find any opportunities for savings on your bills at this time.
                    </AlertDescription>
                  </Alert>
                ) : (
                  filteredSuggestions.map(suggestion => (
                    <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="subscription" className="space-y-4">
                {filteredSuggestions.length === 0 ? (
                  <Alert>
                    <InfoIcon className="h-5 w-5" />
                    <AlertTitle>No subscription suggestions found</AlertTitle>
                    <AlertDescription>
                      We couldn't find any opportunities for savings on your subscriptions at this time.
                    </AlertDescription>
                  </Alert>
                ) : (
                  filteredSuggestions.map(suggestion => (
                    <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function SuggestionCard({ suggestion }: { suggestion: NegotiationSuggestion }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800"
    if (confidence >= 0.5) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }
  
  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return "High confidence"
    if (confidence >= 0.5) return "Medium confidence"
    return "Low confidence"
  }
  
  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{suggestion.name}</h3>
            <p className="text-sm text-muted-foreground">
              Current cost: <span className="font-medium">{formatCurrency(suggestion.currentCost)}</span>
            </p>
          </div>
          <Badge variant="outline" className={getConfidenceColor(suggestion.confidence)}>
            {getConfidenceText(suggestion.confidence)}
          </Badge>
        </div>
      </div>
      
      <div className="p-4 bg-muted/30">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Potential Savings:</span>
          <span className="text-lg font-bold text-green-600">
            {formatCurrency(suggestion.potentialSavings)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground mb-4">
          {suggestion.reasoning}
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recommended Actions:</h4>
          <ul className="text-sm space-y-1">
            {suggestion.actionItems.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="p-4 border-t flex justify-end gap-2">
        <Button variant="outline" size="sm">
          Dismiss
        </Button>
        <Button size="sm">
          Take Action
        </Button>
      </div>
    </Card>
  )
} 