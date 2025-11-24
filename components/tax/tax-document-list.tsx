"use client"

import { useState, useEffect } from "react"
import { PlusCircle, FileText, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TaxDocumentItem, TaxDocument } from "./tax-document-item"
import { TaxDocumentForm } from "./tax-document-form"
import { useToast } from "@/components/ui/use-toast"
import { EmptyState } from "@/components/empty-state"

export function TaxDocumentList() {
  const [documents, setDocuments] = useState<TaxDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingDocument, setEditingDocument] = useState<TaxDocument | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/tax/documents')
      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }
      const data = await response.json()
      // Map the API response to the TaxDocument interface
      const mappedDocuments = data.map((doc: any) => ({
        ...doc,
        type: doc.document_type || doc.type || 'Other' // Map document_type to type
      }))
      setDocuments(mappedDocuments)
    } catch (error) {
      console.error("Error fetching tax documents:", error)
      toast({
        title: "Error loading documents",
        description: "There was a problem loading your tax documents.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDocument = async (document: any) => {
    try {
      // The document is already submitted via XMLHttpRequest in the form component
      // Here we just need to handle the response
      
      // Log the response to understand its structure
      console.log('Document creation response:', document)
      
      // Create a properly formatted document object from the response
      const newDocument: TaxDocument = {
        id: document.id || `temp-${Date.now()}`,
        name: document.name,
        type: document.document_type || document.type || 'Other',
        status: document.status || 'received',
        due_date: document.due_date,
        file_url: document.file_url || '',
        notes: document.notes || '',
      }
      
      console.log('Adding new document to state:', newDocument)
      
      // Refresh the document list to ensure we have the latest data
      await fetchDocuments()
      
      setShowForm(false)
      toast({
        title: "Document created",
        description: "Your tax document has been successfully created.",
      })
    } catch (error) {
      console.error("Error creating tax document:", error)
      toast({
        title: "Error creating document",
        description: "There was a problem creating your tax document.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateDocument = async (document: TaxDocument) => {
    try {
      const response = await fetch(`/api/tax/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(document),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update document')
      }
      
      const updatedDocument = await response.json()
      // Ensure the document type is correctly mapped
      const mappedDocument = {
        ...updatedDocument,
        type: updatedDocument.document_type || updatedDocument.type || 'Other'
      }
      setDocuments(prev => 
        prev.map(doc => doc.id === mappedDocument.id ? mappedDocument : doc)
      )
      setEditingDocument(null)
      toast({
        title: "Document updated",
        description: "Your tax document has been successfully updated.",
      })
    } catch (error) {
      console.error("Error updating tax document:", error)
      toast({
        title: "Error updating document",
        description: "There was a problem updating your tax document.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/tax/documents/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete document')
      }
      
      setDocuments(prev => prev.filter(doc => doc.id !== id))
      toast({
        title: "Document deleted",
        description: "Your tax document has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting tax document:", error)
      toast({
        title: "Error deleting document",
        description: "There was a problem deleting your tax document.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      console.log(`Updating document ${id} status to ${status}`)
      const documentToUpdate = documents.find(doc => doc.id === id)
      if (!documentToUpdate) {
        console.error(`Document with id ${id} not found`)
        return
      }
      
      // Only send the status field to avoid overwriting other fields
      const statusUpdate = { status }
      
      console.log('Sending status update:', statusUpdate)
      
      const response = await fetch(`/api/tax/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statusUpdate),
      })
      
      if (!response.ok) {
        console.error('Error response:', response.status, response.statusText)
        throw new Error(`Failed to update document status: HTTP ${response.status}`)
      }
      
      let result
      try {
        // Try to parse as JSON
        const responseText = await response.text()
        console.log('Status update response:', response.status, responseText)
        
        // Only try to parse if there's content
        if (responseText && responseText.trim()) {
          result = JSON.parse(responseText)
        } else {
          // Empty response is fine for status updates
          result = { success: true }
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
        // Don't throw, just use a default result
        result = { success: true }
      }
      
      // Update the document in the local state
      setDocuments(prev => 
        prev.map(doc => doc.id === id ? { ...doc, status } : doc)
      )
      
      // Refresh the document list to ensure we have the latest data
      await fetchDocuments()
    } catch (error) {
      console.error("Error updating document status:", error)
      toast({
        title: "Error updating status",
        description: "There was a problem updating the document status.",
        variant: "destructive",
      })
    }
  }

  const filteredDocuments = documents.filter(doc => {
    if (!doc || !doc.name) return false;
    
    // Safe access to properties with nullish coalescing
    const docName = doc.name?.toLowerCase() || '';
    const docType = doc.type?.toLowerCase() || '';
    const docNotes = doc.notes?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return (
      docName.includes(query) ||
      docType.includes(query) ||
      docNotes.includes(query)
    );
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tax Documents</CardTitle>
            <CardDescription>Manage and organize your tax documents</CardDescription>
          </div>
          <Button onClick={() => { setEditingDocument(null); setShowForm(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Document
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Document Form */}
        {showForm && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <TaxDocumentForm
              initialData={editingDocument}
              onSubmit={editingDocument ? handleUpdateDocument : handleCreateDocument}
              onCancel={() => { setShowForm(false); setEditingDocument(null); }}
            />
          </div>
        )}

        {/* Documents List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="space-y-4">
            {filteredDocuments.map((document) => (
              <TaxDocumentItem
                key={document.id}
                document={document}
                onEdit={(doc) => { setEditingDocument(doc); setShowForm(true); }}
                onDelete={handleDeleteDocument}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="h-12 w-12 text-muted-foreground" />}
            title="No documents found"
            description={
              searchQuery
                ? "No documents match your search. Try a different query."
                : "You haven't added any tax documents yet. Add your first document to get started."
            }
            action={
              !searchQuery && (
                <Button onClick={() => { setEditingDocument(null); setShowForm(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Your First Document
                </Button>
              )
            }
          />
        )}
      </CardContent>
    </Card>
  )
}
