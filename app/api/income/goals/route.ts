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
    
    // Ensure the income_goals table exists
    await ensureIncomeGoalsTableExists(supabase)
    
    // Get all income goals for the user
    const { data: goals, error } = await supabase
      .from("income_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("target_date", { ascending: true })
    
    if (error) {
      console.error("Error fetching income goals:", error)
      
      // If table doesn't exist despite our attempt to create it, return empty array
      if (error.code === "42P01") {
        return NextResponse.json([])
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(goals || [])
  } catch (error) {
    console.error("Error in GET /api/income/goals:", error)
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
    
    // Ensure the income_goals table exists
    await ensureIncomeGoalsTableExists(supabase)
    
    const body = await request.json()
    const { targetAmount, targetDate, title, description } = body
    
    if (!targetAmount || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) {
      return NextResponse.json({ error: "Valid target amount is required" }, { status: 400 })
    }
    
    // Create a new income goal
    const { data: goal, error } = await supabase
      .from("income_goals")
      .insert({
        user_id: user.id,
        title: title || `Income Goal - $${Number(targetAmount).toLocaleString()}`,
        description: description || `Target income of $${Number(targetAmount).toLocaleString()} by ${new Date(targetDate).toLocaleDateString()}`,
        target_amount: targetAmount,
        target_date: targetDate,
        current_progress: 0,
        is_celebrated: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating income goal:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(goal)
  } catch (error) {
    console.error("Error in POST /api/income/goals:", error)
    return NextResponse.json({ error: "Error creating income goal" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, currentProgress, isCelebrated, title, description, targetAmount, targetDate } = body
    
    if (!id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 })
    }
    
    // Check if the goal exists and belongs to the user
    const { data: existingGoal, error: checkError } = await supabase
      .from("income_goals")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
    
    if (checkError) {
      console.error("Error checking income goal:", checkError)
      
      // If table doesn't exist, return error
      if (checkError.code === "42P01") {
        return NextResponse.json({ error: "Income goals feature is not available yet" }, { status: 404 })
      }
      
      return NextResponse.json({ error: "Goal not found or access denied" }, { status: 404 })
    }
    
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    
    if (currentProgress !== undefined) {
      updates.current_progress = currentProgress
      
      // Auto-celebrate if progress reaches or exceeds target
      if (Number(currentProgress) >= Number(existingGoal.target_amount) && !existingGoal.is_celebrated) {
        updates.is_celebrated = true
      }
    }
    
    if (isCelebrated !== undefined) {
      updates.is_celebrated = isCelebrated
    }
    
    if (title !== undefined) {
      updates.title = title
    }
    
    if (description !== undefined) {
      updates.description = description
    }
    
    if (targetAmount !== undefined && !isNaN(Number(targetAmount)) && Number(targetAmount) > 0) {
      updates.target_amount = targetAmount
    }
    
    if (targetDate !== undefined) {
      updates.target_date = targetDate
    }
    
    // Update the goal
    const { data: updatedGoal, error } = await supabase
      .from("income_goals")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating income goal:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(updatedGoal)
  } catch (error) {
    console.error("Error in PUT /api/income/goals:", error)
    return NextResponse.json({ error: "Error updating income goal" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 })
    }
    
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Check if the goal exists and belongs to the user
    const { data: existingGoal, error: checkError } = await supabase
      .from("income_goals")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
    
    if (checkError && checkError.code !== "PGRST116") { // PGRST116 = no rows returned
      console.error("Error checking income goal:", checkError)
      
      // If table doesn't exist, return error
      if (checkError.code === "42P01") {
        return NextResponse.json({ error: "Income goals feature is not available yet" }, { status: 404 })
      }
      
      return NextResponse.json({ error: "Error checking income goal" }, { status: 500 })
    }
    
    // If goal not found, consider it already deleted
    if (!existingGoal && checkError?.code === "PGRST116") {
      return NextResponse.json({ success: true, message: "Goal already deleted or does not exist" })
    }
    
    // Delete the goal
    const { error } = await supabase
      .from("income_goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error deleting income goal:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/income/goals:", error)
    return NextResponse.json({ error: "Error deleting income goal" }, { status: 500 })
  }
}

// Helper function to ensure the income_goals table exists
async function ensureIncomeGoalsTableExists(supabase: any) {
  try {
    // Check if income_goals table exists
    const { error } = await supabase
      .from("income_goals")
      .select("id", { count: 'exact', head: true })
      .limit(1)
    
    if (error && error.code === "42P01") {
      console.log("income_goals table doesn't exist, creating it...")
      
      // Create income_goals table using RPC
      const { error: createError } = await supabase.rpc('create_income_goals_table')
      
      if (createError) {
        console.error("Error creating income_goals table:", createError)
      } else {
        console.log("Successfully created income_goals table")
      }
    }
  } catch (error) {
    console.error("Error ensuring income_goals table exists:", error)
    // Continue execution even if table creation fails
  }
}
