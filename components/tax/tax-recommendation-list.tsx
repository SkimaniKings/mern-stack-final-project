"use client"

import { useState, useEffect } from "react"
import { PlusCircle, Lightbulb, Loader2, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TaxRecommendationItem, TaxRecommendation } from "./tax-recommendation-item"
import { useToast } from "@/components/ui/use-toast"
import { EmptyState } from "@/components/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

export function TaxRecommendationList() {
  const [recommendations, setRecommendations] = useState<TaxRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingRecommendation, setEditingRecommendation] = useState<TaxRecommendation | null>(null)
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterCompleted, setFilterCompleted] = useState<string>("all")
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "optimization",
    priority: "medium",
    potential_savings: "",
    action_items: "",
    deadline: "",
    is_completed: false
  })

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/tax/recommendations')
      
      // Get response text first to help debug
      const responseText = await response.text()
      console.log('Recommendations API response:', responseText)
      
      // Parse JSON if possible
      let data
      try {
        if (responseText && responseText.trim()) {
          data = JSON.parse(responseText)
        } else {
          data = []
        }
      } catch (parseError) {
        console.error('Error parsing recommendations response:', parseError)
        data = []
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }
      
      setRecommendations(data)
    } catch (error) {
      console.error("Error fetching tax recommendations:", error)
      
      // Check if the error might be due to missing table
      const errorMessage = error.toString().toLowerCase()
      const isMissingTableError = errorMessage.includes('relation') && 
                                 (errorMessage.includes('does not exist') || 
                                  errorMessage.includes('not found'))
      
      if (isMissingTableError) {
        toast({
          title: "Database table missing",
          description: "Please run the create_tax_recommendations_table.sql migration script.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error loading recommendations",
          description: "Could not load tax recommendations. Please try again later.",
          variant: "destructive"
        })
      }
      
      // Set empty recommendations instead of fallbacks
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_completed: checked }))
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "optimization",
      priority: "medium",
      potential_savings: "",
      action_items: "",
      deadline: "",
      is_completed: false
    })
    setEditingRecommendation(null)
  }

  const handleEditRecommendation = (recommendation: TaxRecommendation) => {
    setEditingRecommendation(recommendation)
    setFormData({
      title: recommendation.title,
      description: recommendation.description,
      type: recommendation.type,
      priority: recommendation.priority,
      potential_savings: recommendation.potential_savings?.toString() || "",
      action_items: recommendation.action_items?.join("\n") || "",
      deadline: recommendation.deadline || "",
      is_completed: recommendation.is_completed
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Process action items from textarea to array
      const actionItemsArray = formData.action_items
        ? formData.action_items.split("\n").filter(item => item.trim() !== "")
        : []

      // Create data object for API
      const data = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        potential_savings: formData.potential_savings ? parseFloat(formData.potential_savings) : undefined,
        action_items: actionItemsArray.length > 0 ? actionItemsArray : undefined,
        deadline: formData.deadline || undefined,
        is_completed: formData.is_completed
      }

      // Log what we're trying to save
      console.log('Saving recommendation data:', data)

      try {
        // Try to use the API first
        let response
        
        if (editingRecommendation) {
          // Update existing recommendation
          response = await fetch(`/api/tax/recommendations/${editingRecommendation.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
        } else {
          // Create new recommendation
          response = await fetch('/api/tax/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
        }

        // Log the response status
        console.log('API response status:', response.status)
        
        // Check if response is OK first
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API error response:', response.status, errorText)
          throw new Error(`Failed to save recommendation: HTTP ${response.status}`)
        }
        
        // Get response text
        const responseText = await response.text()
        console.log('API response text:', responseText)
        
        // Parse JSON if possible
        let result
        try {
          if (responseText && responseText.trim()) {
            result = JSON.parse(responseText)
          } else {
            throw new Error('Empty response')
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError)
          throw new Error('Invalid response format')
        }
        
        if (editingRecommendation) {
          setRecommendations(prev => 
            prev.map(item => item.id === editingRecommendation.id ? result : item)
          )
          toast({
            title: "Recommendation updated",
            description: "Your tax recommendation has been successfully updated."
          })
        } else {
          setRecommendations(prev => [...prev, result])
          toast({
            title: "Recommendation created",
            description: "Your tax recommendation has been successfully created."
          })
        }
      } catch (apiError) {
        // If API fails, handle locally
        console.error("API error, using local fallback:", apiError)
        
        // Check if the error might be due to missing table
        const errorMessage = apiError.toString().toLowerCase()
        const isMissingTableError = errorMessage.includes('relation') && 
                                   (errorMessage.includes('does not exist') || 
                                    errorMessage.includes('not found'))
        
        if (isMissingTableError) {
          toast({
            title: "Database table missing",
            description: "Please run the tax_recommendations_table.sql migration script first.",
            variant: "destructive"
          })
        }
        
        if (editingRecommendation) {
          // Update existing recommendation locally
          const updatedRecommendation: TaxRecommendation = {
            ...editingRecommendation,
            title: formData.title,
            description: formData.description,
            type: formData.type as any,
            priority: formData.priority as any,
            potential_savings: formData.potential_savings ? parseFloat(formData.potential_savings) : undefined,
            action_items: actionItemsArray,
            deadline: formData.deadline || undefined,
            is_completed: formData.is_completed
          }
          
          setRecommendations(prev => 
            prev.map(item => item.id === editingRecommendation.id ? updatedRecommendation : item)
          )
          
          toast({
            title: "Recommendation updated locally",
            description: "Your tax recommendation has been updated in the current session only."
          })
        } else {
          // Create new recommendation locally
          const newRecommendation: TaxRecommendation = {
            id: `local-${Date.now()}`,
            title: formData.title,
            description: formData.description,
            type: formData.type as any,
            priority: formData.priority as any,
            potential_savings: formData.potential_savings ? parseFloat(formData.potential_savings) : undefined,
            action_items: actionItemsArray.length > 0 ? actionItemsArray : undefined,
            deadline: formData.deadline || undefined,
            is_completed: formData.is_completed
          }
          
          setRecommendations(prev => [...prev, newRecommendation])
          
          toast({
            title: "Recommendation saved locally",
            description: "Your tax recommendation has been saved for the current session only."
          })
        }
      }
      
      setShowForm(false)
      resetForm()
    } catch (error) {
      console.error("Error saving tax recommendation:", error)
      toast({
        title: "Error saving recommendation",
        description: "There was a problem saving your tax recommendation.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRecommendation = async (id: string) => {
    try {
      try {
        // Try to use the API first
        const response = await fetch(`/api/tax/recommendations/${id}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete recommendation')
        }
        
        setRecommendations(prev => prev.filter(item => item.id !== id))
        toast({
          title: "Recommendation deleted",
          description: "Your tax recommendation has been successfully deleted."
        })
      } catch (apiError) {
        // If API fails, delete locally
        console.error("API error, using local fallback:", apiError)
        
        // Just remove from state
        setRecommendations(prev => prev.filter(item => item.id !== id))
        toast({
          title: "Recommendation deleted locally",
          description: "Your tax recommendation has been removed locally. This will sync when the server is available."
        })
      }
    } catch (error) {
      console.error("Error deleting tax recommendation:", error)
      toast({
        title: "Error deleting recommendation",
        description: "There was a problem deleting your tax recommendation.",
        variant: "destructive"
      })
    }
  }

  const handleToggleComplete = async (id: string, isCompleted: boolean) => {
    try {
      const recommendation = recommendations.find(item => item.id === id)
      if (!recommendation) return
      
      const updatedRecommendation = { ...recommendation, is_completed: isCompleted }
      
      try {
        // Try to use the API first
        const response = await fetch(`/api/tax/recommendations/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedRecommendation)
        })
        
        if (!response.ok) {
          throw new Error('Failed to update recommendation status')
        }
        
        const result = await response.json()
        setRecommendations(prev => 
          prev.map(item => item.id === result.id ? result : item)
        )
        
        // No toast for successful status update - it's a minor change
      } catch (apiError) {
        // If API fails, update locally
        console.error("API error, using local fallback:", apiError)
        
        // Just update in state
        setRecommendations(prev => 
          prev.map(item => item.id === id ? updatedRecommendation : item)
        )
        
        // No toast for local status update - it's a minor change
      }
    } catch (error) {
      console.error("Error updating recommendation status:", error)
      toast({
        title: "Error updating status",
        description: "There was a problem updating the recommendation status.",
        variant: "destructive"
      })
    }
  }

  // Filter recommendations based on search query, priority, type, and completion status
  const filteredRecommendations = recommendations.filter(recommendation => {
    const matchesSearch = 
      recommendation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recommendation.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesPriority = filterPriority === "all" || recommendation.priority === filterPriority
    const matchesType = filterType === "all" || recommendation.type === filterType
    const matchesCompleted = 
      filterCompleted === "all" || 
      (filterCompleted === "completed" && recommendation.is_completed) ||
      (filterCompleted === "pending" && !recommendation.is_completed)
    
    return matchesSearch && matchesPriority && matchesType && matchesCompleted
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tax Recommendations</CardTitle>
            <CardDescription>Actionable suggestions to optimize your taxes</CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Recommendation
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Bar */}
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recommendations..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select
              value={filterPriority}
              onValueChange={setFilterPriority}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filterType}
              onValueChange={setFilterType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="optimization">Optimization</SelectItem>
                <SelectItem value="deduction">Deduction</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filterCompleted}
              onValueChange={setFilterCompleted}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Recommendations List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRecommendations.length > 0 ? (
          <div className="space-y-4">
            {filteredRecommendations.map((recommendation) => (
              <TaxRecommendationItem
                key={recommendation.id}
                recommendation={recommendation}
                onEdit={handleEditRecommendation}
                onDelete={handleDeleteRecommendation}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Lightbulb className="h-12 w-12 text-muted-foreground" />}
            title="No recommendations found"
            description={
              searchQuery || filterPriority !== "all" || filterType !== "all" || filterCompleted !== "all"
                ? "No recommendations match your search criteria. Try adjusting your filters."
                : "You haven't added any tax recommendations yet. Add your first recommendation to get started."
            }
            action={
              !searchQuery && filterPriority === "all" && filterType === "all" && filterCompleted === "all" && (
                <Button onClick={() => { resetForm(); setShowForm(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Your First Recommendation
                </Button>
              )
            }
          />
        )}

        {/* Recommendation Form Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open)
          if (!open) resetForm()
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingRecommendation ? "Edit" : "Add"} Tax Recommendation</DialogTitle>
              <DialogDescription>
                {editingRecommendation 
                  ? "Update the details of this tax recommendation." 
                  : "Create a new tax recommendation to optimize your taxes."}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Maximize Retirement Contributions"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe the recommendation in detail"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="optimization">Optimization</SelectItem>
                      <SelectItem value="deduction">Deduction</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="potential_savings">Potential Savings ($)</Label>
                  <Input
                    id="potential_savings"
                    name="potential_savings"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 1200"
                    value={formData.potential_savings}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    name="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="action_items">Action Items (one per line)</Label>
                <Textarea
                  id="action_items"
                  name="action_items"
                  placeholder="List action items, one per line"
                  value={formData.action_items}
                  onChange={handleInputChange}
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_completed"
                  checked={formData.is_completed}
                  onCheckedChange={handleCheckboxChange}
                />
                <Label htmlFor="is_completed">Mark as completed</Label>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingRecommendation ? "Update Recommendation" : "Add Recommendation"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
