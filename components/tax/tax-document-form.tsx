"use client"

import { useState, useEffect } from "react"
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
import { Loader2, Upload, FileText, X } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { TaxDocument } from "./tax-document-item"

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024
// Accepted file types
const ACCEPTED_FILE_TYPES = [
  "application/pdf", 
  "image/jpeg", 
  "image/png", 
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]

const documentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  due_date: z.string().min(1, "Due date is required"),
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
  file: z
    .any()
    .optional()
    .refine(
      (files) => {
        if (!files || files.length === 0) return true;
        return files.length <= 1;
      },
      "Only one file is allowed"
    )
    .refine(
      (files) => {
        if (!files || files.length === 0) return true;
        return files[0].size <= MAX_FILE_SIZE;
      },
      `File size should be less than 5MB`
    )
    .refine(
      (files) => {
        if (!files || files.length === 0) return true;
        return ACCEPTED_FILE_TYPES.includes(files[0].type);
      },
      "Only PDF, Word, Excel, and image files are accepted"
    ),
})

type DocumentFormValues = z.infer<typeof documentSchema>

interface TaxDocumentFormProps {
  initialData: TaxDocument | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

export function TaxDocumentForm({ initialData, onSubmit, onCancel }: TaxDocumentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "",
      due_date: initialData?.due_date || "",
      status: initialData?.status || "pending",
      notes: initialData?.notes || "",
    },
  })

  useEffect(() => {
    if (initialData?.file_url) {
      // If it's an image, we could try to set a preview
      if (initialData.file_url.match(/\.(jpeg|jpg|gif|png)$/i)) {
        setFilePreview(initialData.file_url)
      } else {
        setFilePreview(null)
      }
      // Extract filename from URL
      const urlParts = initialData.file_url.split('/')
      setFileName(urlParts[urlParts.length - 1])
    }
  }, [initialData])

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
    form.setValue("file", files)
  }

  const handleSubmit = async (values: DocumentFormValues) => {
    setIsLoading(true)
    setUploadProgress(0)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      
      // Add all form fields
      formData.append("name", values.name)
      formData.append("type", values.type)
      formData.append("due_date", values.due_date)
      formData.append("status", values.status)
      if (values.notes) formData.append("notes", values.notes)
      
      // If editing, include the ID
      if (initialData?.id) {
        formData.append("id", initialData.id)
      }
      
      // Add file if present
      if (values.file && values.file.length > 0) {
        formData.append("file", values.file[0])
      }

      // Log what we're sending to help debug
      console.log('Submitting document with FormData:', {
        name: values.name,
        type: values.type,
        due_date: values.due_date,
        status: values.status,
        notes: values.notes,
        file: values.file && values.file.length > 0 ? `${values.file[0].name} (${values.file[0].size} bytes)` : 'No file'
      })
      
      // Use XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest()
      
      // Determine the endpoint based on whether we're creating or updating
      const endpoint = initialData?.id 
        ? `/api/tax/documents/${initialData.id}` 
        : "/api/tax/documents"
      
      xhr.open(initialData?.id ? "PUT" : "POST", endpoint)
      
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
          const response = JSON.parse(xhr.responseText)
          console.log('Document saved successfully:', response)
          onSubmit(response)
          setIsLoading(false)
        } else {
          setIsLoading(false)
          console.error("Server error:", xhr.status, xhr.responseText)
          alert("Failed to save document. Please try again.")
        }
      }

      xhr.onerror = () => {
        setIsLoading(false)
        console.error("Network error occurred")
        alert("Network error occurred. Please check your connection and try again.")
      }

      xhr.send(formData)
    } catch (error) {
      console.error("Error saving document:", error)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 bg-card p-6 rounded-lg shadow-sm border border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Document Name</Label>
          <Input
            id="name"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Document Type</Label>
          <Select
            onValueChange={(value) => form.setValue("type", value)}
            defaultValue={form.getValues("type")}
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
          {form.formState.errors.type && (
            <p className="text-destructive text-sm">{form.formState.errors.type.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            onValueChange={(value) => form.setValue("status", value)}
            defaultValue={form.getValues("status")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.status && (
            <p className="text-destructive text-sm">{form.formState.errors.status.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
        />
        {form.formState.errors.notes && (
          <p className="text-destructive text-sm">{form.formState.errors.notes.message}</p>
        )}
      </div>
      
      {/* File Upload Section */}
      <div className="space-y-2">
        <Label htmlFor="file">Upload Document</Label>
        <div className="border-2 border-dashed border-border rounded-md p-4 transition-colors hover:border-primary">
          <Input
            id="file"
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
          />
          <label htmlFor="file" className="flex flex-col items-center justify-center cursor-pointer">
            {filePreview || fileName ? (
              <div className="w-full">
                {filePreview?.startsWith('data:image') || filePreview?.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <img src={filePreview} alt="Preview" className="max-h-32 mx-auto mb-2 rounded" />
                ) : (
                  <FileText className="h-16 w-16 text-primary mx-auto mb-2" />
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
                      form.setValue("file", undefined);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, or Images (max 5MB)</p>
              </>
            )}
          </label>
        </div>
        {form.formState.errors.file && (
          <p className="text-destructive text-sm">{form.formState.errors.file.message as string}</p>
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

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadProgress > 0 ? "Uploading..." : "Saving..."}
            </>
          ) : (
            initialData ? "Update Document" : "Add Document"
          )}
        </Button>
      </div>
    </form>
  )
}
