import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

// Schema for tax recommendations
const taxRecommendationSchema = z.object({
  type: z.enum(["optimization", "account", "deduction", "timing", "investment", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  title: z.string().min(1),
  description: z.string().min(1),
  potential_savings: z.number().optional(),
  action_items: z.array(z.string()).optional(),
  deadline: z.string().optional(),
})

// GET /api/tax - Get tax summary and recommendations
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // Create tax tables if they don't exist
    await ensureTaxTablesExist(supabase)

    // Get tax profiles
    let profiles = []
    const { data: profileData, error: profileError } = await supabase
      .from("tax_profiles")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
    
    if (!profileError) {
      profiles = profileData || []
    }

    // Get tax categories
    let categories = []
    const { data: categoryData, error: categoryError } = await supabase
      .from("tax_categories")
      .select("*")
      .order("name", { ascending: true })
    
    if (categoryError || !categoryData || categoryData.length === 0) {
      // Use default categories if none exist in database
      categories = [
        { id: "1", name: "Income Tax", type: "tax", color: "#0ea5e9" },
        { id: "2", name: "Deductions", type: "deduction", color: "#10b981" },
        { id: "3", name: "Credits", type: "credit", color: "#8b5cf6" },
        { id: "4", name: "Retirement", type: "retirement", color: "#f59e0b" }
      ]
    } else {
      categories = categoryData
    }

    // Get tax deductions
    let deductions = []
    const { data: deductionData, error: deductionError } = await supabase
      .from("tax_deductions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    
    if (!deductionError) {
      deductions = deductionData || []
    }

    // Format deductions to match expected format
    const formattedDeductions = deductions.map(d => ({
      id: d.id,
      name: d.deduction_name,
      amount: d.estimated_savings || 0,
      max_amount: d.max_deduction_amount || d.estimated_savings || 0,
      categories: categories.find(c => c.id === d.category_id) || categories[1] // Default to Deductions category
    }))

    // Get tax documents
    let documents = []
    const { data: documentData, error: documentError } = await supabase
      .from("tax_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false })
    
    if (!documentError) {
      documents = documentData || []
    }

    // Format documents to match expected format
    const formattedDocuments = documents.map(d => ({
      id: d.id,
      name: d.file_name,
      type: d.document_type,
      status: d.status || "pending",
      due_date: d.due_date || new Date().toISOString(),
      categories: categories.find(c => c.id === d.category_id) || categories[0] // Default to Income Tax category
    }))

    // Get tax optimization tips as recommendations
    let tips = []
    const { data: tipData, error: tipError } = await supabase
      .from("tax_optimization_tips")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    
    if (!tipError) {
      tips = tipData || []
    }

    // Format tips as recommendations
    const formattedRecommendations = tips.map(t => ({
      id: t.id,
      type: t.category || "optimization",
      priority: t.priority || (t.impact_estimate > 1000 ? "high" : t.impact_estimate > 500 ? "medium" : "low"),
      title: t.title || t.tip.substring(0, 50), // Use title if available, otherwise truncate tip
      description: t.tip,
      potential_savings: t.impact_estimate || 0,
      action_items: t.action_items || [],
      deadline: t.deadline || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      is_completed: t.is_implemented
    }))

    // Get tax timeline data
    let timeline = []
    const { data: timelineData, error: timelineError } = await supabase
      .from("tax_timeline")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true })
    
    if (timelineError || !timelineData || timelineData.length === 0) {
      // Create tax timeline events if none exist
      const currentYear = new Date().getFullYear()
      const timelineEvents = [
        {
          user_id: user.id,
          title: "File Q1 Estimated Taxes",
          description: "First quarter estimated tax payments due",
          due_date: new Date(currentYear, 3, 15).toISOString(), // April 15
          is_completed: new Date() > new Date(currentYear, 3, 15),
          event_type: "estimated_tax"
        },
        {
          user_id: user.id,
          title: "File Q2 Estimated Taxes",
          description: "Second quarter estimated tax payments due",
          due_date: new Date(currentYear, 5, 15).toISOString(), // June 15
          is_completed: new Date() > new Date(currentYear, 5, 15),
          event_type: "estimated_tax"
        },
        {
          user_id: user.id,
          title: "File Q3 Estimated Taxes",
          description: "Third quarter estimated tax payments due",
          due_date: new Date(currentYear, 8, 15).toISOString(), // September 15
          is_completed: new Date() > new Date(currentYear, 8, 15),
          event_type: "estimated_tax"
        },
        {
          user_id: user.id,
          title: "File Q4 Estimated Taxes",
          description: "Fourth quarter estimated tax payments due",
          due_date: new Date(currentYear + 1, 0, 15).toISOString(), // January 15 next year
          is_completed: false,
          event_type: "estimated_tax"
        },
        {
          user_id: user.id,
          title: "Tax Return Deadline",
          description: "Federal income tax returns due",
          due_date: new Date(currentYear, 3, 15).toISOString(), // April 15
          is_completed: new Date() > new Date(currentYear, 3, 15),
          event_type: "tax_return"
        }
      ]
      
      // Insert timeline events into database
      const { data: insertedTimeline, error: insertError } = await supabase
        .from("tax_timeline")
        .insert(timelineEvents)
        .select()
      
      if (!insertError && insertedTimeline) {
        timeline = insertedTimeline
      } else {
        // Use the events array if insert fails
        timeline = timelineEvents.map((event, index) => ({ ...event, id: `temp-${index + 1}` }))
      }
    } else {
      timeline = timelineData
    }

    // Format timeline data
    const formattedTimeline = timeline.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      is_completed: t.is_completed,
      event_type: t.event_type
    }))

    // Get tax impact predictions
    let predictionData = []
    const { data: predictionResults, error: predictionError } = await supabase
      .from("tax_impact_predictions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    
    if (!predictionError) {
      predictionData = predictionResults || []
    }

    // Format predictions to match expected format
    const formattedPredictions = predictionData.map(p => ({
      id: p.id,
      scenario: p.decision_type,
      current_tax_burden: p.current_tax_burden || 0,
      predicted_tax_burden: p.predicted_tax_burden || (p.current_tax_burden ? p.current_tax_burden - (p.estimated_tax_impact || 0) : 0),
      difference: -(p.estimated_tax_impact || 0)
    }))

    // Get tax professionals
    let professionals = []
    const { data: professionalData, error: professionalError } = await supabase
      .from("tax_pro_invitations")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
    
    if (!professionalError) {
      professionals = professionalData || []
    }

    // Format professionals to match expected format
    const formattedProfessionals = professionals.map(p => ({
      id: p.id,
      name: p.pro_name || p.pro_email.split('@')[0], // Use name if available, otherwise first part of email
      firm: p.firm_name || p.pro_email.split('@')[1], // Use firm if available, otherwise domain
      specialties: p.specialties || [p.access_level === 'edit' ? 'Full Access' : 'View Only']
    }))

    // Calculate tax summary
    const totalDeductions = formattedDeductions.reduce((sum, deduction) => sum + (deduction.amount || 0), 0)
    const totalPotentialSavings = formattedRecommendations.reduce((sum, rec) => sum + (rec.potential_savings || 0), 0)
    const pendingDocuments = formattedDocuments.filter(doc => doc.status === "pending").length
    const upcomingDeadlines = formattedTimeline.filter(item => !item.is_completed && new Date(item.due_date) > new Date()).length

    return NextResponse.json({
      categories,
      deductions: formattedDeductions,
      documents: formattedDocuments,
      recommendations: formattedRecommendations,
      timeline: formattedTimeline,
      predictions: formattedPredictions,
      professionals: formattedProfessionals,
      summary: {
        totalDeductions,
        totalPotentialSavings,
        pendingDocuments,
        upcomingDeadlines
      }
    })
  } catch (error) {
    console.error("Error in GET /api/tax:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/tax - Create a new tax recommendation
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate request body
    const result = taxRecommendationSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 })
    }

    // Ensure tax tables exist
    await ensureTaxTablesExist(supabase)

    // Insert the recommendation as a tax optimization tip
    const { data, error } = await supabase
      .from("tax_optimization_tips")
      .insert({
        user_id: user.id,
        tip: result.data.description,
        title: result.data.title,
        category: result.data.type,
        priority: result.data.priority,
        impact_estimate: result.data.potential_savings,
        action_items: result.data.action_items,
        deadline: result.data.deadline,
        is_implemented: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating tax recommendation:", error)
      return NextResponse.json({ error: "Failed to create tax recommendation" }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      type: result.data.type,
      priority: result.data.priority,
      title: result.data.title,
      description: result.data.description,
      potential_savings: result.data.potential_savings,
      action_items: result.data.action_items,
      deadline: result.data.deadline,
      is_completed: false
    })
  } catch (error) {
    console.error("Error in POST /api/tax:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to ensure all tax-related tables exist
async function ensureTaxTablesExist(supabase: any) {
  try {
    // Check if tax_categories table exists
    const { error: categoriesError } = await supabase
      .from("tax_categories")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (categoriesError && categoriesError.code === "42P01") {
      // Create tax_categories table using RPC
      await supabase.rpc('create_tax_categories_table')
      
      // Insert default categories
      await supabase
        .from("tax_categories")
        .insert([
          { name: "Income Tax", type: "tax", color: "#0ea5e9" },
          { name: "Deductions", type: "deduction", color: "#10b981" },
          { name: "Credits", type: "credit", color: "#8b5cf6" },
          { name: "Retirement", type: "retirement", color: "#f59e0b" }
        ])
    }
    
    // Check if tax_profiles table exists
    const { error: profilesError } = await supabase
      .from("tax_profiles")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (profilesError && profilesError.code === "42P01") {
      // Create tax_profiles table using RPC
      await supabase.rpc('create_tax_profiles_table')
    }
    
    // Check if tax_deductions table exists
    const { error: deductionsError } = await supabase
      .from("tax_deductions")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (deductionsError && deductionsError.code === "42P01") {
      // Create tax_deductions table using RPC
      await supabase.rpc('create_tax_deductions_table')
    }
    
    // Check if tax_documents table exists
    const { error: documentsError } = await supabase
      .from("tax_documents")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (documentsError && documentsError.code === "42P01") {
      // Create tax_documents table using RPC
      await supabase.rpc('create_tax_documents_table')
    }
    
    // Check if tax_optimization_tips table exists
    const { error: tipsError } = await supabase
      .from("tax_optimization_tips")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (tipsError && tipsError.code === "42P01") {
      // Create tax_optimization_tips table using RPC
      await supabase.rpc('create_tax_optimization_tips_table')
    }
    
    // Check if tax_timeline table exists
    const { error: timelineError } = await supabase
      .from("tax_timeline")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (timelineError && timelineError.code === "42P01") {
      // Create tax_timeline table using RPC
      await supabase.rpc('create_tax_timeline_table')
    }
    
    // Check if tax_impact_predictions table exists
    const { error: predictionsError } = await supabase
      .from("tax_impact_predictions")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (predictionsError && predictionsError.code === "42P01") {
      // Create tax_impact_predictions table using RPC
      await supabase.rpc('create_tax_impact_predictions_table')
    }
    
    // Check if tax_pro_invitations table exists
    const { error: proInvitationsError } = await supabase
      .from("tax_pro_invitations")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (proInvitationsError && proInvitationsError.code === "42P01") {
      // Create tax_pro_invitations table using RPC
      await supabase.rpc('create_tax_pro_invitations_table')
    }
  } catch (error) {
    console.error("Error ensuring tax tables exist:", error)
    // Continue execution even if table creation fails
  }
}