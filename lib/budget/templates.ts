import type { BudgetTemplate } from "@/types/budget"
import { LIFESTYLE_TEMPLATES } from "./templates/lifestyle"
import { LIFE_EVENT_TEMPLATES } from "./templates/life-events"

// Combine all templates (core, lifestyle, life events), but deduplicate by id (keep last occurrence, i.e., enhanced wins)
const coreTemplates: BudgetTemplate[] = [
  {
    id: "wedding",
    name: "Wedding Planning",
    description: "12-month budget template for wedding planning and expenses",
    type: "zero-based",
    categories: [
      {
        name: "Venue & Catering",
        percentage: 40,
        amount: 0, // Will be calculated based on total budget
        subcategories: [
          { name: "Venue Rental", percentage: 20, amount: 0 },
          { name: "Catering", percentage: 15, amount: 0 },
          { name: "Bar Service", percentage: 5, amount: 0 },
        ],
      },
      {
        name: "Attire & Beauty",
        percentage: 15,
        amount: 0,
        subcategories: [
          { name: "Wedding Dress", percentage: 8, amount: 0 },
          { name: "Suits/Tuxedos", percentage: 4, amount: 0 },
          { name: "Hair & Makeup", percentage: 3, amount: 0 },
        ],
      },
      {
        name: "Photography & Video",
        percentage: 12,
        amount: 0,
        subcategories: [
          { name: "Photography", percentage: 8, amount: 0 },
          { name: "Videography", percentage: 4, amount: 0 },
        ],
      },
      {
        name: "Decor & Flowers",
        percentage: 10,
        amount: 0,
        subcategories: [
          { name: "Flowers", percentage: 6, amount: 0 },
          { name: "Decorations", percentage: 4, amount: 0 },
        ],
      },
      {
        name: "Music & Entertainment",
        percentage: 8,
        amount: 0,
      },
      {
        name: "Rings & Jewelry",
        percentage: 5,
        amount: 0,
      },
      {
        name: "Stationery",
        percentage: 3,
        amount: 0,
      },
      {
        name: "Transportation",
        percentage: 2,
        amount: 0,
      },
      {
        name: "Emergency Fund",
        percentage: 5,
        amount: 0,
      },
    ],
    defaultAllocation: {
      "Venue & Catering": 40,
      "Attire & Beauty": 15,
      "Photography & Video": 12,
      "Decor & Flowers": 10,
      "Music & Entertainment": 8,
      "Rings & Jewelry": 5,
      "Stationery": 3,
      "Transportation": 2,
      "Emergency Fund": 5,
    },
    recommendedIncome: {
      min: 20000,
      max: 100000,
    },
    timeline: "12 months",
    tags: ["wedding", "event", "celebration"],
  },
  {
    id: "new-baby",
    name: "New Baby",
    description: "First-year budget template for new parents",
    type: "50-30-20",
    categories: [
      {
        name: "Essential Baby Items",
        percentage: 25,
        amount: 0,
        subcategories: [
          { name: "Diapers & Wipes", percentage: 10, amount: 0 },
          { name: "Formula & Food", percentage: 8, amount: 0 },
          { name: "Clothing", percentage: 7, amount: 0 },
        ],
      },
      {
        name: "Nursery & Furniture",
        percentage: 20,
        amount: 0,
        subcategories: [
          { name: "Crib & Mattress", percentage: 8, amount: 0 },
          { name: "Changing Table", percentage: 6, amount: 0 },
          { name: "Storage", percentage: 6, amount: 0 },
        ],
      },
      {
        name: "Healthcare",
        percentage: 15,
        amount: 0,
        subcategories: [
          { name: "Medical Expenses", percentage: 8, amount: 0 },
          { name: "Insurance", percentage: 7, amount: 0 },
        ],
      },
      {
        name: "Childcare",
        percentage: 25,
        amount: 0,
      },
      {
        name: "Safety & Equipment",
        percentage: 10,
        amount: 0,
        subcategories: [
          { name: "Car Seat", percentage: 5, amount: 0 },
          { name: "Baby Monitor", percentage: 3, amount: 0 },
          { name: "Safety Items", percentage: 2, amount: 0 },
        ],
      },
      {
        name: "Emergency Fund",
        percentage: 5,
        amount: 0,
      },
    ],
    defaultAllocation: {
      "Essential Baby Items": 25,
      "Nursery & Furniture": 20,
      "Healthcare": 15,
      "Childcare": 25,
      "Safety & Equipment": 10,
      "Emergency Fund": 5,
    },
    recommendedIncome: {
      min: 15000,
      max: 50000,
    },
    timeline: "12 months",
    tags: ["baby", "family", "healthcare"],
  },
  {
    id: "home-purchase",
    name: "Home Purchase",
    description: "Budget template for home buying process",
    type: "zero-based",
    categories: [
      {
        name: "Down Payment",
        percentage: 60,
        amount: 0,
      },
      {
        name: "Closing Costs",
        percentage: 15,
        amount: 0,
        subcategories: [
          { name: "Loan Origination", percentage: 5, amount: 0 },
          { name: "Title & Escrow", percentage: 5, amount: 0 },
          { name: "Other Fees", percentage: 5, amount: 0 },
        ],
      },
      {
        name: "Moving Expenses",
        percentage: 5,
        amount: 0,
        subcategories: [
          { name: "Moving Service", percentage: 3, amount: 0 },
          { name: "Packing Supplies", percentage: 2, amount: 0 },
        ],
      },
      {
        name: "Initial Repairs",
        percentage: 10,
        amount: 0,
      },
      {
        name: "New Furniture",
        percentage: 5,
        amount: 0,
      },
      {
        name: "Emergency Fund",
        percentage: 5,
        amount: 0,
      },
    ],
    defaultAllocation: {
      "Down Payment": 60,
      "Closing Costs": 15,
      "Moving Expenses": 5,
      "Initial Repairs": 10,
      "New Furniture": 5,
      "Emergency Fund": 5,
    },
    recommendedIncome: {
      min: 50000,
      max: 200000,
    },
    timeline: "24 months",
    tags: ["home", "real-estate", "moving"],
  },
]

const combinedTemplates: BudgetTemplate[] = [
  ...coreTemplates,
  ...LIFESTYLE_TEMPLATES,
  ...LIFE_EVENT_TEMPLATES,
]

export const BUDGET_TEMPLATES: BudgetTemplate[] = Array.from(
  new Map(combinedTemplates.map(t => [t.id, t])).values()
)

export function calculateTemplateAmounts(template: BudgetTemplate, totalBudget: number): BudgetTemplate {
  const calculatedTemplate = { ...template }
  
  calculatedTemplate.categories = template.categories.map(category => {
    const calculatedCategory = { ...category }
    calculatedCategory.amount = (category.percentage / 100) * totalBudget
    
    if (category.subcategories) {
      calculatedCategory.subcategories = category.subcategories.map(sub => ({
        ...sub,
        amount: (sub.percentage / 100) * totalBudget,
      }))
    }
    
    return calculatedCategory
  })
  
  return calculatedTemplate
}
