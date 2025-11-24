"use client"

import { useState, useEffect } from "react"
import { PlusCircle, Calendar, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TaxTimelineItem as TimelineItemComponent, TaxTimelineItem } from "./tax-timeline-item"
import { TaxTimelineForm } from "./tax-timeline-form"
import { useToast } from "@/components/ui/use-toast"
import { EmptyState } from "@/components/empty-state"

export function TaxTimelineList() {
  const [timelineItems, setTimelineItems] = useState<TaxTimelineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<TaxTimelineItem | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchTimelineItems()
  }, [])

  const fetchTimelineItems = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/tax/timeline')
      if (!response.ok) {
        throw new Error('Failed to fetch timeline items')
      }
      const data = await response.json()
      setTimelineItems(data)
    } catch (error) {
      console.error("Error fetching tax timeline items:", error)
      toast({
        title: "Error loading timeline",
        description: "There was a problem loading your tax timeline.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTimelineItem = async (item: Omit<TaxTimelineItem, "id">) => {
    try {
      const response = await fetch('/api/tax/timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create timeline item')
      }
      
      const newItem = await response.json()
      setTimelineItems(prev => [...prev, newItem])
      setShowForm(false)
      toast({
        title: "Timeline item created",
        description: "Your tax timeline item has been successfully created.",
      })
    } catch (error) {
      console.error("Error creating tax timeline item:", error)
      toast({
        title: "Error creating timeline item",
        description: "There was a problem creating your tax timeline item.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTimelineItem = async (item: TaxTimelineItem) => {
    try {
      const response = await fetch(`/api/tax/timeline/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update timeline item')
      }
      
      const updatedItem = await response.json()
      setTimelineItems(prev => 
        prev.map(item => item.id === updatedItem.id ? updatedItem : item)
      )
      setEditingItem(null)
      setShowForm(false)
      toast({
        title: "Timeline item updated",
        description: "Your tax timeline item has been successfully updated.",
      })
    } catch (error) {
      console.error("Error updating tax timeline item:", error)
      toast({
        title: "Error updating timeline item",
        description: "There was a problem updating your tax timeline item.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTimelineItem = async (id: string) => {
    try {
      const response = await fetch(`/api/tax/timeline/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete timeline item')
      }
      
      setTimelineItems(prev => prev.filter(item => item.id !== id))
      toast({
        title: "Timeline item deleted",
        description: "Your tax timeline item has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting tax timeline item:", error)
      toast({
        title: "Error deleting timeline item",
        description: "There was a problem deleting your tax timeline item.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleToggleComplete = async (id: string, isCompleted: boolean) => {
    try {
      const itemToUpdate = timelineItems.find(item => item.id === id)
      if (!itemToUpdate) return
      
      // Make sure we include all required fields according to the schema
      const updatedItem = {
        title: itemToUpdate.title,
        description: itemToUpdate.description || '',
        due_date: itemToUpdate.due_date,
        is_recurring: itemToUpdate.is_recurring || false,
        recurrence_pattern: itemToUpdate.recurrence_pattern || '',
        is_completed: isCompleted
      }
      
      // Optimistically update the UI first
      setTimelineItems(prev => 
        prev.map(item => item.id === id ? {...item, is_completed: isCompleted} : item)
      )
      
      const response = await fetch(`/api/tax/timeline/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedItem),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error("Server error:", data)
        // Revert the optimistic update if there was an error
        setTimelineItems(prev => 
          prev.map(item => item.id === id ? itemToUpdate : item)
        )
        throw new Error(data.error || 'Failed to update timeline item status')
      }
      
      // Update with the server response data
      setTimelineItems(prev => 
        prev.map(item => item.id === data.id ? data : item)
      )
    } catch (error) {
      console.error("Error updating timeline item status:", error)
      toast({
        title: "Error updating status",
        description: "There was a problem updating the timeline item status.",
        variant: "destructive",
      })
      // Don't rethrow the error to prevent the component from crashing
    }
  }

  const filteredItems = timelineItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort items: incomplete and upcoming first, then past due, then completed
  const sortedItems = [...filteredItems].sort((a, b) => {
    // If one is completed and the other isn't, the incomplete one comes first
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1
    }
    
    // If both are incomplete, sort by due date (ascending)
    if (!a.is_completed && !b.is_completed) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    
    // If both are completed, sort by due date (descending)
    return new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tax Timeline</CardTitle>
            <CardDescription>Manage important tax dates and deadlines</CardDescription>
          </div>
          <Button onClick={() => { setEditingItem(null); setShowForm(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Timeline Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search timeline..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Timeline Form */}
        {showForm && (
          <div className="mb-6 p-4 border rounded-lg bg-card">
            <TaxTimelineForm
              initialData={editingItem}
              onSubmit={editingItem ? handleUpdateTimelineItem : handleCreateTimelineItem}
              onCancel={() => { setShowForm(false); setEditingItem(null); }}
            />
          </div>
        )}

        {/* Timeline Items List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedItems.length > 0 ? (
          <div className="space-y-4">
            {sortedItems.map((item) => (
              <TimelineItemComponent
                key={item.id}
                timelineItem={item}
                onEdit={(item) => { setEditingItem(item); setShowForm(true); }}
                onDelete={handleDeleteTimelineItem}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Calendar className="h-12 w-12 text-muted-foreground" />}
            title="No timeline items found"
            description={
              searchQuery
                ? "No timeline items match your search. Try a different query."
                : "You haven't added any tax timeline items yet. Add your first item to get started."
            }
            action={
              !searchQuery && (
                <Button onClick={() => { setEditingItem(null); setShowForm(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Your First Timeline Item
                </Button>
              )
            }
          />
        )}
      </CardContent>
    </Card>
  )
}
