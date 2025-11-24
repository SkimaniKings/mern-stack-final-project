"use client"

import { BudgetGeneratorDialog } from "@/components/budgets/budget-generator-dialog"

export function BudgetGeneratorWrapper() {
  return (
    <BudgetGeneratorDialog
      onGenerate={(budget) => {
        console.log("Generated budget:", budget)
        // TODO: Save budget to database
      }}
    />
  )
}
