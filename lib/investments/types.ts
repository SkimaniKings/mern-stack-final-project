export interface Investment {
  id: string
  name: string
  ticker?: string
  type: "stock" | "etf" | "bond" | "mutual_fund" | "crypto" | "other"
  value: number
  costBasis: number
  price: number
  allocation: number
  expenseRatio?: number
  dividendYield?: number
  sector: string
  sector_id?: string
  region: string
  riskLevel?: "low" | "medium" | "high"
  taxLocation: "taxable" | "tax_deferred" | "tax_free"
  user_id?: string
  created_at?: string
  updated_at?: string
  current_price?: number
  change?: number
}

export interface FinancialEducationChannel {
  id: string
  name: string
  url: string
  description: string
  thumbnail: string
  topics: string[]
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  featured: boolean
  featuredVideo?: string
  featuredPlaylist?: string
}

export interface RecommendedChannel {
  name: string
  url: string
  videoUrl?: string
  playlistUrl?: string
}

export interface FinancialTopic {
  id: string
  title: string
  description: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  keywords: string[]
  recommendedChannels: RecommendedChannel[]
  icon: React.ReactNode
  colorClass: string
}

