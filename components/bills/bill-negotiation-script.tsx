"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Copy, CheckCircle2, Phone, MessageSquare } from "lucide-react"

interface NegotiationStep {
  id: string
  title: string
  script: string
  tips: string[]
  fallbackResponses: {
    objection: string
    response: string
  }[]
}

interface BillNegotiationScriptProps {
  billName: string
  provider: string
  contactPhone: string
  currentAmount: number
  targetAmount: number
  steps: NegotiationStep[]
}

export function BillNegotiationScript({
  billName,
  provider,
  contactPhone,
  currentAmount,
  targetAmount,
  steps,
}: BillNegotiationScriptProps) {
  const [copiedStepId, setCopiedStepId] = useState<string | null>(null)

  const handleCopyScript = (stepId: string, script: string) => {
    navigator.clipboard.writeText(script)
    setCopiedStepId(stepId)
    setTimeout(() => setCopiedStepId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Negotiation Script for {billName}</CardTitle>
          <CardDescription>
            Call {provider} at{" "}
            <a href={`tel:${contactPhone}`} className="font-medium underline">
              {contactPhone}
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Current Monthly</p>
              <p className="text-lg font-medium">${currentAmount.toFixed(2)}</p>
            </div>
            <div className="text-2xl font-bold">→</div>
            <div>
              <p className="text-sm text-muted-foreground">Target Monthly</p>
              <p className="text-lg font-medium">${targetAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Potential Savings</p>
              <p className="text-lg font-medium text-green-600">
                ${((currentAmount - targetAmount) * 12).toFixed(2)}/year
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild>
              <a href={`tel:${contactPhone}`}>
                <Phone className="h-4 w-4 mr-1" />
                Call Now
              </a>
            </Button>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-1" />
              Practice Mode
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={step.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Step {index + 1}
                </Badge>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-gray-50 p-4 rounded-lg">
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopyScript(step.id, step.script)}
                >
                  {copiedStepId === step.id ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <p className="whitespace-pre-line text-sm">{step.script}</p>
              </div>

              {step.tips.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Tips</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {step.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="text-sm text-muted-foreground">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step.fallbackResponses.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="fallbacks">
                    <AccordionTrigger>Common Objections & Responses</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {step.fallbackResponses.map((fallback, fallbackIndex) => (
                          <div key={fallbackIndex} className="border-l-2 border-blue-200 pl-3">
                            <p className="font-medium text-sm">If they say: "{fallback.objection}"</p>
                            <p className="text-sm text-muted-foreground mt-1">Your response:</p>
                            <p className="text-sm mt-1">{fallback.response}</p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

