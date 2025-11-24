import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Ensure required tables exist
    await ensureTablesExist(supabase, user.id)
    
    // Get the latest diversification score
    const { data: score, error } = await supabase
      .from("income_diversification_scores")
      .select("*")
      .eq("user_id", user.id)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      console.error("Error fetching diversification score:", error)
      
      // If no rows found or table doesn't exist, calculate new score
      if (error.code === "PGRST116" || error.code === "42P01") {
        return calculateDiversificationScore(supabase, user.id)
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(score)
  } catch (error) {
    console.error("Error in GET /api/income/diversification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Ensure required tables exist
    await ensureTablesExist(supabase, user.id)
    
    return calculateDiversificationScore(supabase, user.id)
  } catch (error) {
    console.error("Error in POST /api/income/diversification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function calculateDiversificationScore(supabase: any, userId: string) {
  try {
    // Get all income sources for the user
    const { data: incomeSources, error: sourcesError } = await supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
    
    if (sourcesError) {
      console.error("Error fetching income sources:", sourcesError)
      
      // If table doesn't exist, return default response
      if (sourcesError.code === "42P01") {
        return NextResponse.json({ 
          score: 0, 
          insights: "No income sources found. Add income sources to calculate your diversification score.",
          assessment_date: new Date().toISOString().split('T')[0]
        })
      }
      
      return NextResponse.json({ error: sourcesError.message }, { status: 500 })
    }
    
    if (!incomeSources || incomeSources.length === 0) {
      return NextResponse.json({ 
        score: 0, 
        insights: "No active income sources found. Add income sources to calculate your diversification score.",
        assessment_date: new Date().toISOString().split('T')[0]
      })
    }
    
    // Calculate total income
    const totalIncome = incomeSources.reduce((sum: number, source: { amount: number }) => sum + Number(source.amount), 0)
    
    // Calculate diversification metrics
    const typeDistribution: Record<string, number> = {}
    incomeSources.forEach((source: { type: string, amount: number }) => {
      typeDistribution[source.type] = (typeDistribution[source.type] || 0) + Number(source.amount)
    })
    
    // Calculate Herfindahl-Hirschman Index (HHI) - a measure of concentration
    let hhi = 0
    Object.values(typeDistribution).forEach((amount: number) => {
      const marketShare = amount / totalIncome
      hhi += marketShare * marketShare
    })
    
    // Convert HHI to a 0-100 score (lower HHI means better diversification)
    // HHI ranges from 1/n (perfect diversification) to 1 (complete concentration)
    const numTypes = Object.keys(typeDistribution).length
    const minHHI = 1 / numTypes
    const normalizedHHI = (hhi - minHHI) / (1 - minHHI)
    const diversificationScore = Math.round((1 - normalizedHHI) * 100)
    
    // Generate insights
    let insights = ""
    if (diversificationScore < 30) {
      insights = "Your income is highly concentrated. Consider adding more diverse income streams to reduce financial risk."
    } else if (diversificationScore < 60) {
      insights = "Your income diversification is moderate. There's room for improvement by expanding into different income types."
    } else {
      insights = "You have a well-diversified income portfolio. This helps protect against financial shocks in any single income source."
    }
    
    const assessmentDate = new Date().toISOString().split('T')[0]
    
    // Try to save the score to the database
    try {
      const { data: savedScore, error: saveError } = await supabase
        .from("income_diversification_scores")
        .insert({
          user_id: userId,
          score: diversificationScore,
          insights,
          assessment_date: assessmentDate,
          income_sources_count: incomeSources.length,
          income_types_count: numTypes,
          total_income: totalIncome,
          hhi_index: hhi
        })
        .select()
        .single()
      
      if (saveError) {
        console.error("Error saving diversification score:", saveError)
        // Continue without failing if save fails
      }
    } catch (saveError) {
      console.error("Error during save attempt:", saveError)
      // Continue without failing if save fails
    }
    
    return NextResponse.json({
      score: diversificationScore,
      insights,
      assessment_date: assessmentDate,
      income_sources_count: incomeSources.length,
      income_types_count: numTypes,
      total_income: totalIncome
    })
  } catch (error) {
    console.error("Error calculating diversification score:", error)
    return NextResponse.json({ error: "Error calculating diversification score" }, { status: 500 })
  }
}

// Helper function to ensure required tables exist
async function ensureTablesExist(supabase: any, userId: string) {
  try {
    // Check if income_sources table exists
    const { error: sourcesError } = await supabase
      .from("income_sources")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (sourcesError && sourcesError.code === "42P01") {
      console.log("income_sources table doesn't exist, creating it...")
      
      // Create income_sources table using RPC
      const { error: createSourcesError } = await supabase.rpc('create_income_sources_table')
      
      if (createSourcesError) {
        console.error("Error creating income_sources table:", createSourcesError)
      } else {
        console.log("Successfully created income_sources table")
        
        // Add sample income sources for better UX
        await addSampleIncomeSources(supabase, userId)
      }
    }
    
    // Check if income_diversification_scores table exists
    const { error: scoresError } = await supabase
      .from("income_diversification_scores")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (scoresError && scoresError.code === "42P01") {
      console.log("income_diversification_scores table doesn't exist, creating it...")
      
      // Create income_diversification_scores table using RPC
      const { error: createScoresError } = await supabase.rpc('create_income_diversification_scores_table')
      
      if (createScoresError) {
        console.error("Error creating income_diversification_scores table:", createScoresError)
      } else {
        console.log("Successfully created income_diversification_scores table")
      }
    }
  } catch (error) {
    console.error("Error ensuring tables exist:", error)
    // Continue execution even if table creation fails
  }
}

// Helper function to add sample income sources
async function addSampleIncomeSources(supabase: any, userId: string) {
  try {
    // Check if user already has income sources
    const { data: existingSources, error: checkError } = await supabase
      .from("income_sources")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
    
    if (checkError) {
      console.error("Error checking existing income sources:", checkError)
      return
    }
    
    // Only add sample sources if user has none
    if (existingSources && existingSources.length > 0) {
      return
    }
    
    // Sample income sources
    const sampleSources = [
      {
        user_id: userId,
        name: "Primary Job",
        type: "employment",
        amount: 5000,
        frequency: "monthly",
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        user_id: userId,
        name: "Side Gig",
        type: "self_employment",
        amount: 1000,
        frequency: "monthly",
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        user_id: userId,
        name: "Dividend Income",
        type: "investment",
        amount: 300,
        frequency: "monthly",
        is_active: true,
        created_at: new Date().toISOString()
      }
    ]
    
    const { error: insertError } = await supabase
      .from("income_sources")
      .insert(sampleSources)
    
    if (insertError) {
      console.error("Error adding sample income sources:", insertError)
    } else {
      console.log("Added sample income sources for user")
    }
  } catch (error) {
    console.error("Error adding sample income sources:", error)
  }
}
