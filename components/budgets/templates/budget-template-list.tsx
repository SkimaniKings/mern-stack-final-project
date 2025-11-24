"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BudgetTemplateCard } from "./budget-template-card"
import { LIFE_EVENT_TEMPLATES } from "@/lib/budget/templates/life-events"
import { LIFESTYLE_TEMPLATES } from "@/lib/budget/templates/lifestyle"

interface BudgetTemplateListProps {
  onTemplateSelect: (templateId: string) => void
}

export function BudgetTemplateList({ onTemplateSelect }: BudgetTemplateListProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    onTemplateSelect(templateId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Templates</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-6">
            <Tabs defaultValue="life-events">
              <TabsList className="w-full">
                <TabsTrigger value="life-events">Life Events</TabsTrigger>
                <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
              </TabsList>

              <TabsContent value="life-events" className="mt-4 space-y-4">
                {LIFE_EVENT_TEMPLATES.map(template => (
                  <BudgetTemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate === template.id}
                    onSelect={() => handleTemplateSelect(template.id)}
                  />
                ))}
              </TabsContent>

              <TabsContent value="lifestyle" className="mt-4 space-y-4">
                {LIFESTYLE_TEMPLATES.map(template => (
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
      </CardContent>
    </Card>
  )
}
