"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BudgetTemplateList } from "./templates/budget-template-list"
import { Brain, DollarSign, Sparkles } from "lucide-react"
import type { BudgetTemplate } from "@/types/budget"

interface BudgetGeneratorDialogProps {
  onGenerate: (budget: any) => void
}

export function BudgetGeneratorDialog({ onGenerate }: BudgetGeneratorDialogProps) {
  const [monthlyIncome, setMonthlyIncome] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [budgetModel, setBudgetModel] = useState<"traditional" | "50-30-20" | "zero-based" | "envelope">("traditional")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!monthlyIncome || !selectedTemplate) return

    setIsGenerating(true)
    try {
      // TODO: Call AI budget generation endpoint
      const generatedBudget = {
        monthlyIncome: parseFloat(monthlyIncome),
        templateId: selectedTemplate,
        model: budgetModel,
        // Add more fields as needed
      }

      onGenerate(generatedBudget)
    } catch (error) {
      console.error("Error generating budget:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" size="lg" className="gap-2">
          <Brain className="h-5 w-5" />
          Generate Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>AI Budget Generator</DialogTitle>
          <DialogDescription>
            Let AI help you create a personalized budget based on your income and goals
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Settings */}
          <div className="col-span-12 md:col-span-5 space-y-4">
            <div className="space-y-2">
              <Label>Monthly Income</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="5000"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Budget Model</Label>
              <Select value={budgetModel} onValueChange={(value: any) => setBudgetModel(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="traditional">Traditional Budget</SelectItem>
                  <SelectItem value="50-30-20">50/30/20 Rule</SelectItem>
                  <SelectItem value="zero-based">Zero-Based Budget</SelectItem>
                  <SelectItem value="envelope">Envelope System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full mt-6"
              onClick={handleGenerate}
              disabled={isGenerating || !monthlyIncome || !selectedTemplate}
            >
              {isGenerating ? (
                "Generating..."
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Budget
                </>
              )}
            </Button>
          </div>

          {/* Right Column - Templates */}
          <div className="col-span-12 md:col-span-7">
            <BudgetTemplateList onTemplateSelect={setSelectedTemplate} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
