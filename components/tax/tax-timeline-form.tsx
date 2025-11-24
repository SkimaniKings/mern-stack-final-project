"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Calendar } from "lucide-react"
import { TaxTimelineItem } from "./tax-timeline-item"

const timelineSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  due_date: z.string().min(1, "Due date is required"),
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.string().optional(),
  is_completed: z.boolean().default(false),
})

type TimelineFormValues = z.infer<typeof timelineSchema>

interface TaxTimelineFormProps {
  initialData: TaxTimelineItem | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

export function TaxTimelineForm({ initialData, onSubmit, onCancel }: TaxTimelineFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [extractedEvents, setExtractedEvents] = useState<any[]>([])

  const form = useForm<TimelineFormValues>({
    resolver: zodResolver(timelineSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      due_date: initialData?.due_date || "",
      is_recurring: initialData?.is_recurring || false,
      recurrence_pattern: initialData?.recurrence_pattern || "",
      is_completed: initialData?.is_completed || false,
    },
  })

  const handleSubmit = async (values: TimelineFormValues) => {
    setIsLoading(true)
    try {
      // If editing, include the ID
      const dataToSubmit = initialData?.id 
        ? { ...values, id: initialData.id } 
        : values
      
      await onSubmit(dataToSubmit)
    } catch (error) {
      console.error("Error saving timeline item:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Extract timeline events from text input
  const extractEventsFromText = () => {
    if (!textInput.trim()) return

    // Date regex for various formats
    const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2}|\w+ \d{1,2},? \d{4})/g
    const events: any[] = []
    
    // First, try to detect the format of the input
    const inputText = textInput.trim()
    
    // Check for structured formats with Name/Description/Due Date pattern
    if (inputText.includes('Name:') && inputText.includes('Due Date:')) {
      console.log('Detected structured format with Name/Description/Due Date')
      
      // Split by double newlines to get each entry
      const entries = inputText.split(/\n\s*\n/).filter(entry => entry.trim().length > 0)
      
      for (const entry of entries) {
        try {
          // Extract name
          const nameMatch = entry.match(/Name:\s*(.+?)(?:\n|$)/)
          const title = nameMatch ? nameMatch[1].trim() : 'Tax Deadline'
          
          // Extract description
          const descMatch = entry.match(/Description:\s*(.+?)(?:\n|(?=Due Date:)|$)/s)
          const description = descMatch ? descMatch[1].trim() : ''
          
          // Extract due date
          const dueDateMatch = entry.match(/Due Date:\s*(.+?)(?:\n|$)/)
          if (dueDateMatch) {
            const dateStr = dueDateMatch[1].trim()
            const date = new Date(dateStr)
            
            if (!isNaN(date.getTime())) {
              // Format date as YYYY-MM-DD
              const formattedDate = date.toISOString().split('T')[0]
              
              events.push({
                title,
                description,
                due_date: formattedDate,
                is_recurring: false,
                is_completed: false
              })
            }
          }
        } catch (err) {
          console.error('Error parsing structured entry:', err)
        }
      }
    }
    // Check for table format with headers
    else if (inputText.includes('Name\tDescription\tDue Date') || 
             inputText.includes('Name|Description|Due Date') ||
             inputText.includes('Name Description Due Date')) {
      console.log('Detected table format')
      
      // Split by newlines to get rows
      const rows = inputText.split(/\n/).filter(row => row.trim().length > 0)
      
      // Skip the header row
      for (let i = 1; i < rows.length; i++) {
        try {
          // Split by tab, pipe, or multiple spaces
          const cells = rows[i].split(/\t|\|\s*|\s{2,}/).filter(cell => cell.trim().length > 0)
          
          if (cells.length >= 3) {
            const title = cells[0].trim()
            const description = cells[1].trim()
            const dateStr = cells[2].trim()
            const date = new Date(dateStr)
            
            if (!isNaN(date.getTime())) {
              const formattedDate = date.toISOString().split('T')[0]
              
              events.push({
                title,
                description,
                due_date: formattedDate,
                is_recurring: false,
                is_completed: false
              })
            }
          }
        } catch (err) {
          console.error('Error parsing table row:', err)
        }
      }
    }
    // Check for numbered list format
    else if (/\d+\.\s+\w+/.test(inputText)) {
      console.log('Detected numbered list format')
      
      // Split by numbered items
      const items = inputText.split(/\n\s*\d+\.\s+/).filter(item => item.trim().length > 0)
      
      for (const item of items) {
        try {
          // Look for description and due date patterns
          const titleMatch = item.match(/^([^\n]+)/)
          const title = titleMatch ? titleMatch[1].trim() : 'Tax Deadline'
          
          const descMatch = item.match(/Description:\s*(.+?)(?:\n|(?=Due Date:)|$)/s) || 
                           item.match(/- Description:\s*(.+?)(?:\n|$)/)
          const description = descMatch ? descMatch[1].trim() : item.trim()
          
          const dueDateMatch = item.match(/Due Date:\s*(.+?)(?:\n|$)/) || 
                              item.match(/- Due Date:\s*(.+?)(?:\n|$)/)
          
          if (dueDateMatch) {
            const dateStr = dueDateMatch[1].trim()
            const date = new Date(dateStr)
            
            if (!isNaN(date.getTime())) {
              const formattedDate = date.toISOString().split('T')[0]
              
              events.push({
                title,
                description,
                due_date: formattedDate,
                is_recurring: false,
                is_completed: false
              })
            }
          }
        } catch (err) {
          console.error('Error parsing numbered item:', err)
        }
      }
    }
    // Fallback to the original line-by-line parsing
    else {
      console.log('Using fallback line-by-line parsing')
      
      // Split by lines or sentences
      const lines = inputText.split(/[\n\.\!]/).filter(line => line.trim().length > 0)
      
      for (const line of lines) {
        const dateMatch = line.match(dateRegex)
        if (dateMatch) {
          try {
            const dateStr = dateMatch[0]
            const date = new Date(dateStr)
            
            if (!isNaN(date.getTime())) {
              // Extract title - simple heuristic: first few words before the date
              const parts = line.split(dateStr)
              let title = "Tax Deadline"
              let description = line.trim()
              
              if (parts.length > 0 && parts[0].trim()) {
                title = parts[0].trim()
                if (title.length > 50) {
                  title = title.substring(0, 47) + "..."
                }
              }
              
              // Format date as YYYY-MM-DD for the input
              const formattedDate = date.toISOString().split('T')[0]
              
              events.push({
                title,
                description,
                due_date: formattedDate,
                is_recurring: false,
                is_completed: false
              })
            }
          } catch (err) {
            console.error("Error parsing date:", err)
          }
        }
      }
    }
    
    setExtractedEvents(events)
    
    // Populate the form with the first event if available
    if (events.length > 0) {
      form.setValue("title", events[0].title)
      form.setValue("description", events[0].description)
      form.setValue("due_date", events[0].due_date)
    }
  }

  // Use an extracted event to populate the form
  const useExtractedEvent = (event: any) => {
    form.setValue("title", event.title)
    form.setValue("description", event.description)
    form.setValue("due_date", event.due_date)
  }

  // Submit all extracted events
  const submitAllEvents = async () => {
    if (extractedEvents.length === 0) return
    
    setIsLoading(true)
    try {
      // Submit all events as a batch
      const response = await fetch('/api/tax/timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(extractedEvents),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create timeline items')
      }
      
      const result = await response.json()
      setTextInput("")
      setExtractedEvents([])
      onCancel() // Close the form
      
      // Refresh the timeline list
      window.location.reload()
    } catch (error) {
      console.error("Error creating multiple timeline items:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {initialData ? (
        // Edit form
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              {...form.register("due_date")}
            />
            {form.formState.errors.due_date && (
              <p className="text-red-500 text-sm">{form.formState.errors.due_date.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_completed"
              checked={form.watch("is_completed")}
              onCheckedChange={(checked) => 
                form.setValue("is_completed", checked as boolean)
              }
            />
            <Label htmlFor="is_completed" className="text-sm font-normal">
              Mark as completed
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_recurring"
              checked={form.watch("is_recurring")}
              onCheckedChange={(checked) => 
                form.setValue("is_recurring", checked as boolean)
              }
            />
            <Label htmlFor="is_recurring" className="text-sm font-normal">
              This is a recurring event
            </Label>
          </div>

          {form.watch("is_recurring") && (
            <div className="space-y-2">
              <Label htmlFor="recurrence_pattern">Recurrence Pattern</Label>
              <Select
                onValueChange={(value) => form.setValue("recurrence_pattern", value)}
                defaultValue={form.getValues("recurrence_pattern")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pattern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Timeline Item"
              )}
            </Button>
          </div>
        </form>
      ) : (
        // Create form with text extraction option
        <div className="space-y-6">
          {/* Text input for extracting events */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-md">
            <h3 className="text-sm font-medium">Extract Events from Text</h3>
            <Textarea
              placeholder="Paste your tax schedule or deadline text here..."
              className="h-32"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={extractEventsFromText}
              className="w-full"
              disabled={!textInput.trim()}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Extract Events
            </Button>
          </div>

          {/* Extracted events list */}
          {extractedEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Extracted Events ({extractedEvents.length})</h3>
                <Button 
                  size="sm" 
                  onClick={submitAllEvents}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Add All Events"
                  )}
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {extractedEvents.map((event, index) => (
                  <div 
                    key={index} 
                    className="p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => useExtractedEvent(event)}
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium">{event.title}</h4>
                      <span className="text-sm text-muted-foreground">{event.due_date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual form */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-4">Or Add Manually</h3>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-destructive text-sm">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  {...form.register("due_date")}
                />
                {form.formState.errors.due_date && (
                  <p className="text-destructive text-sm">{form.formState.errors.due_date.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_recurring"
                  checked={form.watch("is_recurring")}
                  onCheckedChange={(checked) => 
                    form.setValue("is_recurring", checked as boolean)
                  }
                />
                <Label htmlFor="is_recurring" className="text-sm font-normal">
                  This is a recurring event
                </Label>
              </div>

              {form.watch("is_recurring") && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence_pattern">Recurrence Pattern</Label>
                  <Select
                    onValueChange={(value) => form.setValue("recurrence_pattern", value)}
                    defaultValue={form.getValues("recurrence_pattern")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Add Timeline Item"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
