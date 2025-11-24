"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Upload, FileText, Calendar, Check, X, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

// Define form schemas for different types of tax information
const deductionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
  notes: z.string().optional(),
})

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf", 
  "image/jpeg", 
  "image/png", 
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

// Create a conditional schema for files that only runs in the browser
const fileSchema = typeof window === 'undefined' 
  ? z.any().optional() // During SSR, accept any value
  : z.instanceof(FileList)
    .optional()
    .refine((files) => !files || files.length === 0 || files.length <= 1, "Only one file is allowed")
    .refine(
      (files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE,
      `File size should be less than 5MB`
    )
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_FILE_TYPES.includes(files[0].type),
      "Only PDF, Word, Excel, and image files are accepted"
    );

const documentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
  file: fileSchema,
})

const timelineSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  due_date: z.string().min(1, "Due date is required"),
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.string().optional(),
})

type DeductionFormValues = z.infer<typeof deductionSchema>
type DocumentFormValues = z.infer<typeof documentSchema>
type TimelineFormValues = z.infer<typeof timelineSchema>

interface ExtractedEvent {
  title: string;
  description: string;
  due_date: string;
}

export function TaxInfoForm() {
  const [activeTab, setActiveTab] = useState("deduction")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([])
  const [textInput, setTextInput] = useState("")

  // Initialize form hooks for each type
  const deductionForm = useForm<DeductionFormValues>({
    resolver: zodResolver(deductionSchema),
    defaultValues: {
      name: "",
      amount: "",
      category: "",
      notes: "",
    },
  })

  const documentForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      name: "",
      type: "",
      due_date: "",
      notes: "",
    },
  })

  const timelineForm = useForm<TimelineFormValues>({
    resolver: zodResolver(timelineSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      due_date: "",
      is_recurring: false,
      recurrence_pattern: "",
    },
  })

  const handleDeductionSubmit = async (values: DeductionFormValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/tax/deductions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error("Failed to add deduction")
      }

      setSuccess("Deduction added successfully!")
      deductionForm.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDocumentSubmit = async (values: DocumentFormValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setUploadProgress(0)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append("name", values.name)
      formData.append("type", values.type)
      formData.append("due_date", values.due_date)
      if (values.notes) formData.append("notes", values.notes)
      
      // Add file if present
      if (values.file && values.file.length > 0) {
        formData.append("file", values.file[0])
      }

      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/tax/documents")
      
      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      })

      // Handle response
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setSuccess("Document added successfully!")
          documentForm.reset()
          setFilePreview(null)
          setFileName(null)
        } else {
          setError("Failed to add document")
        }
        setIsLoading(false)
      }

      xhr.onerror = () => {
        setError("Network error occurred")
        setIsLoading(false)
      }

      xhr.send(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      setFilePreview(null)
      setFileName(null)
      return
    }

    const file = files[0]
    setFileName(file.name)

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      // For non-image files, just show an icon
      setFilePreview(null)
    }

    // Set the file in the form
    documentForm.setValue("file", files)
  }

  const handleTimelineSubmit = async (values: TimelineFormValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/tax/timeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error("Failed to add timeline item")
      }

      setSuccess("Timeline item added successfully!")
      timelineForm.reset()
      setExtractedEvents([])
      setTextInput("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Extract timeline events from text input
  const extractEventsFromText = () => {
    if (!textInput.trim()) {
      setError("Please enter some text to extract events from")
      return
    }

    // Simple regex to find dates in various formats
    const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2}|\w+ \d{1,2},? \d{4})/g
    const events: ExtractedEvent[] = []
    
    // Split by lines or sentences
    const lines = textInput.split(/[\n\.\!]/).filter(line => line.trim().length > 0)
    
    for (const line of lines) {
      const dateMatch = line.match(dateRegex)
      if (dateMatch) {
        try {
          const dateStr = dateMatch[0]
          const date = new Date(dateStr)
          
          if (!isNaN(date.getTime())) {
            // Extract title - simple heuristic: first few words after the date
            const parts = line.split(dateStr)
            let title = "Tax Deadline"
            let description = line.trim()
            
            if (parts.length > 1 && parts[1].trim()) {
              const afterDate = parts[1].trim()
              title = afterDate.split(/\s+/).slice(0, 5).join(" ")
              if (title.length > 50) {
                title = title.substring(0, 47) + "..."
              }
            }
            
            // Format date as YYYY-MM-DD for the input
            const formattedDate = date.toISOString().split('T')[0]
            
            events.push({
              title,
              description,
              due_date: formattedDate
            })
          }
        } catch (err) {
          console.error("Error parsing date:", err)
        }
      }
    }
    
    if (events.length === 0) {
      setError("No valid dates found in the text")
      return
    }
    
    setExtractedEvents(events)
    setSuccess(`Found ${events.length} event${events.length === 1 ? '' : 's'}`)
    
    // Populate the form with the first event
    if (events.length > 0) {
      timelineForm.setValue("title", events[0].title)
      timelineForm.setValue("description", events[0].description)
      timelineForm.setValue("due_date", events[0].due_date)
    }
  }

  // Use an extracted event to populate the form
  const useExtractedEvent = (event: ExtractedEvent) => {
    timelineForm.setValue("title", event.title)
    timelineForm.setValue("description", event.description)
    timelineForm.setValue("due_date", event.due_date)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-background">
      <CardHeader>
        <CardTitle>Add Tax Information</CardTitle>
        <CardDescription>Add new tax deductions, documents, or timeline items</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
            <Check className="h-4 w-4 mr-2 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deduction">Deduction</TabsTrigger>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="deduction">
            <form onSubmit={deductionForm.handleSubmit(handleDeductionSubmit)} className="space-y-4 bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="space-y-2">
                <Label htmlFor="name">Deduction Name</Label>
                <Input
                  id="name"
                  {...deductionForm.register("name")}
                />
                {deductionForm.formState.errors.name && (
                  <p className="text-red-500 text-sm">{deductionForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...deductionForm.register("amount")}
                />
                {deductionForm.formState.errors.amount && (
                  <p className="text-red-500 text-sm">{deductionForm.formState.errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  onValueChange={(value) => deductionForm.setValue("category", value)}
                  defaultValue={deductionForm.getValues("category")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="charitable">Charitable</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {deductionForm.formState.errors.category && (
                  <p className="text-red-500 text-sm">{deductionForm.formState.errors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  {...deductionForm.register("notes")}
                />
                {deductionForm.formState.errors.notes && (
                  <p className="text-red-500 text-sm">{deductionForm.formState.errors.notes.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Deduction"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="document">
            <form onSubmit={documentForm.handleSubmit(handleDocumentSubmit)} className="space-y-4 bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="space-y-2">
                <Label htmlFor="doc-name">Document Name</Label>
                <Input
                  id="doc-name"
                  {...documentForm.register("name")}
                />
                {documentForm.formState.errors.name && (
                  <p className="text-red-500 text-sm">{documentForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Document Type</Label>
                <Select
                  onValueChange={(value) => documentForm.setValue("type", value)}
                  defaultValue={documentForm.getValues("type")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="w2">W-2</SelectItem>
                    <SelectItem value="1099">1099</SelectItem>
                    <SelectItem value="receipt">Receipt</SelectItem>
                    <SelectItem value="statement">Statement</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {documentForm.formState.errors.type && (
                  <p className="text-red-500 text-sm">{documentForm.formState.errors.type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  {...documentForm.register("due_date")}
                />
                {documentForm.formState.errors.due_date && (
                  <p className="text-red-500 text-sm">{documentForm.formState.errors.due_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-notes">Notes (Optional)</Label>
                <Textarea
                  id="doc-notes"
                  {...documentForm.register("notes")}
                />
                {documentForm.formState.errors.notes && (
                  <p className="text-red-500 text-sm">{documentForm.formState.errors.notes.message}</p>
                )}
              </div>
              
              {/* File Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="file">Upload Document</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 transition-colors hover:border-blue-400">
                  <Input
                    id="file"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file" className="flex flex-col items-center justify-center cursor-pointer">
                    {filePreview ? (
                      <div className="w-full">
                        {filePreview.startsWith('data:image') ? (
                          <img src={filePreview} alt="Preview" className="max-h-32 mx-auto mb-2 rounded" />
                        ) : (
                          <FileText className="h-16 w-16 text-blue-500 mx-auto mb-2" />
                        )}
                        <p className="text-sm text-center truncate">{fileName}</p>
                        <div className="flex justify-center mt-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              setFilePreview(null);
                              setFileName(null);
                              documentForm.setValue("file", undefined);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, or Images (max 5MB)</p>
                      </>
                    )}
                  </label>
                </div>
                {documentForm.formState.errors.file && (
                  <p className="text-red-500 text-sm">{documentForm.formState.errors.file.message as string}</p>
                )}
              </div>

              {/* Upload Progress Bar */}
              {isLoading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress > 0 ? "Uploading..." : "Adding..."}
                  </>
                ) : (
                  "Add Document"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="timeline">
            <div className="space-y-6">
              {/* Text input for extracting events */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-md">
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
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Extract Events
                </Button>
              </div>

              {/* Extracted events list */}
              {extractedEvents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Extracted Events</h3>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {extractedEvents.map((event, index) => (
                      <div 
                        key={index} 
                        className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                        onClick={() => useExtractedEvent(event)}
                      >
                        <div className="flex justify-between">
                          <h4 className="font-medium">{event.title}</h4>
                          <span className="text-sm text-gray-500">{event.due_date}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{event.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={timelineForm.handleSubmit(handleTimelineSubmit)} className="space-y-4 bg-card p-6 rounded-lg shadow-sm border border-border">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    {...timelineForm.register("title")}
                  />
                  {timelineForm.formState.errors.title && (
                    <p className="text-red-500 text-sm">{timelineForm.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...timelineForm.register("description")}
                  />
                  {timelineForm.formState.errors.description && (
                    <p className="text-red-500 text-sm">{timelineForm.formState.errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeline-due_date">Due Date</Label>
                  <Input
                    id="timeline-due_date"
                    type="date"
                    {...timelineForm.register("due_date")}
                  />
                  {timelineForm.formState.errors.due_date && (
                    <p className="text-red-500 text-sm">{timelineForm.formState.errors.due_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      {...timelineForm.register("is_recurring")}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="is_recurring" className="text-sm font-normal">
                      This is a recurring event
                    </Label>
                  </div>
                </div>

                {timelineForm.watch("is_recurring") && (
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_pattern">Recurrence Pattern</Label>
                    <Select
                      onValueChange={(value) => timelineForm.setValue("recurrence_pattern", value)}
                      defaultValue={timelineForm.getValues("recurrence_pattern")}
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Timeline Item"
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
