"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { BudgetTemplateCard } from "./budget-template-card"
import { LIFE_EVENT_TEMPLATES } from "@/lib/budget/templates/life-events"
import { LIFESTYLE_TEMPLATES } from "@/lib/budget/templates/lifestyle"
import { useMemo } from "react"
import { v4 as uuidv4 } from "uuid"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { createBudget, getBudgetById } from "@/app/actions/budgets"

export function BudgetTemplatesWrapper() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  // Build deduplicated versions of template arrays (react keys must be unique)
  const uniqueLifestyleTemplates = useMemo(() => {
    const seen = new Set<string>()
    return LIFESTYLE_TEMPLATES.filter(t => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
  }, [])

  const uniqueLifeEventTemplates = useMemo(() => {
    const seen = new Set<string>()
    return LIFE_EVENT_TEMPLATES.filter(t => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
  }, [])

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return

    setIsLoading(true)
    try {
      const template = [...LIFE_EVENT_TEMPLATES, ...LIFESTYLE_TEMPLATES].find(t => t.id === selectedTemplate)
      if (!template) throw new Error("Template not found")

      // Prepare budget data from template
      // Determine template base amount (sum of category amounts or fallback)
      const defaultIncome = template.categories.reduce((acc, c) => acc + ((c as any).amount ?? 0), 0) || 5000; // fallback
      
      // Format the categories correctly for the API - only include main categories
      const formattedCategories = template.categories.map(cat => {
        return {
          id: uuidv4(),
          name: cat.name,
          amount: (cat as any).amount ?? 0,
          subcategories: [],
        }
      });
      
      const newBudgetData = {
        name: `${template.name} Budget`,
        amount: defaultIncome,
        start_date: new Date().toISOString().split('T')[0], // Today's date
        categories: formattedCategories
      };
      
      // Create the budget using the server action
      const newBudget = await createBudget(newBudgetData);
      
      if (!newBudget || !newBudget.id) {
        throw new Error("Failed to create budget");
      }

      toast({
        title: "Budget Created",
        description: `Successfully created ${template.name} budget.`,
      })
      
      setShowDialog(false)
      
      // Navigate to the new budget
      router.push(`/budgets/${newBudget.id}`)
    } catch (error) {
      console.error("Error applying template:", error)
      toast({
        title: "Error",
        description: "Failed to apply template. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    setShowDialog(true)
  }

  return (
    <>
      <ScrollArea className="h-[320px] px-1">
        <div className="grid grid-cols-1 gap-4 p-6">
          <Tabs defaultValue="life-events">
            <TabsList className="w-full">
              <TabsTrigger value="life-events" className="flex-1">Life Events</TabsTrigger>
              <TabsTrigger value="lifestyle" className="flex-1">Lifestyle</TabsTrigger>
            </TabsList>
            <TabsContent value="life-events">
              {uniqueLifeEventTemplates.map(template => (
                <BudgetTemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate === template.id}
                  onSelect={() => handleTemplateSelect(template.id)}
                />
              ))}
            </TabsContent>
            <TabsContent value="lifestyle">
              {uniqueLifestyleTemplates.map(template => (
                <BudgetTemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate === template.id}
                  onSelect={() => handleTemplateSelect(template.id)}
                />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Budget Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to apply this template? This will create a new budget based on the selected template.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleApplyTemplate} disabled={isLoading}>Apply Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
