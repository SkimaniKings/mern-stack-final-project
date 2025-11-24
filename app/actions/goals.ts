"use server"

import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Helper: create a notification for a goal event
async function createGoalNotification({ userId, message, link }: { userId: string; message: string; link?: string }) {
  const supabase = await createServerClient();
  if (!supabase) return;
  // Find the notification_type_id for "Goal" (cache or fetch)
  let goalTypeId: string | null = null;
  const { data: typeRow } = await supabase
    .from("notification_types")
    .select("id")
    .eq("name", "Goal")
    .single();
  if (typeRow) goalTypeId = typeRow.id;
  if (!goalTypeId) return;
  await supabase.from("user_notifications").insert({
    user_id: userId,
    message,
    link: link || null,
    notification_type_id: goalTypeId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

// Types for our goal planning system based on goals.sql schema
export type GoalStatus = 'active' | 'paused' | 'achieved' | 'cancelled'
export type RoundupType = 'nearest_dollar' | 'fixed_amount' | 'percentage'

export type Goal = {
  id: string
  user_id: string
  name: string
  description?: string
  image_url?: string
  target_amount: number
  current_amount: number
  currency: string
  status: GoalStatus
  priority: number
  start_date: Date
  end_date?: Date
  progress: number
  created_at: string
  updated_at: string
  category?: string
  milestones?: GoalMilestone[]
}

export type GoalTemplate = {
  id: string
  name: string
  description?: string
  recommended_monthly_saving?: number
  duration_months?: number
  default_image_url?: string
  created_at: string
}

export type GoalMilestone = {
  id: string
  goal_id: string
  name: string
  description?: string
  target_amount: number
  is_achieved: boolean
  achieved_at?: string
  created_at: string
  updated_at: string
}

export type GoalContribution = {
  id: string
  goal_id: string
  user_id: string
  amount: number
  contribution_date: Date
  note?: string
  created_at: string
}

export type GoalRoundup = {
  id: string
  user_id: string
  goal_id: string
  is_enabled: boolean
  roundup_type: RoundupType
  fixed_amount?: number
  percentage?: number
  created_at: string
}

// Get all goals for the current user with milestones and contributions
export async function getGoals() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", goals: [] }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", goals: [] }
    }

    try {
      // Use the user_goal_summary view defined in goals.sql
      const { data: goals, error } = await supabase
        .from("financial_goals")
        .select(`
          *,
          milestones:goal_milestones(*),
          contributions:goal_contributions(*)
        `)
        .eq("user_id", user.id)
        .order("priority", { ascending: true })
        .order("end_date", { ascending: true })

      if (error) {
        // Check if the error is due to missing tables (common during development)
        if (error.code === "42P01") { // undefined_table
          console.log("Goals tables not yet created, returning empty array")
          return { error: null, goals: [] }
        }
        
        console.error("Error fetching goals:", error)
        return { error: error.message, goals: [] }
      }

      return { goals, error: null }
    } catch (innerError) {
      console.error("Error in getGoals inner try/catch:", innerError)
      return { error: "Failed to fetch goals", goals: [] }
    }
  } catch (error) {
    console.error("Error in getGoals:", error)
    return { error: "Failed to fetch goals", goals: [] }
  }
}

// Get goal statistics
export async function getGoalStatistics() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", stats: null }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", stats: null }
    }

    // Default stats in case of errors
    const defaultStats = {
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      totalMilestones: 0,
      completedMilestones: 0,
      totalSavings: 0,
      totalTargets: 0,
      progressPercentage: 0,
    }

    try {
      // Get all goals
      const { data: goals, error: goalsError } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", user.id)

      if (goalsError) {
        // Check if the error is due to missing tables (common during development)
        if (goalsError.code === "42P01") { // undefined_table
          console.log("Goals tables not yet created, returning default stats")
          return { error: null, stats: defaultStats }
        }
        
        console.error("Error fetching goals for stats:", goalsError)
        return { error: goalsError.message, stats: defaultStats }
      }

    // Get all milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from("goal_milestones")
      .select("*")
      .in(
        "goal_id",
        goals?.map((g) => g.id) || []
      )

    if (milestonesError) {
      // Check if the error is due to missing tables
      if (milestonesError.code === "42P01") { // undefined_table
        console.log("Milestone table not yet created, continuing with empty milestones")
        return { 
          stats: {
            ...defaultStats,
            totalGoals: goals?.length || 0,
            activeGoals: goals?.filter((g) => g.status === 'active').length || 0,
            completedGoals: goals?.filter((g) => g.status === 'achieved').length || 0,
            totalSavings: goals?.reduce((sum, g) => sum + (g.current_amount || 0), 0) || 0,
            totalTargets: goals?.reduce((sum, g) => sum + (g.target_amount || 0), 0) || 0,
            progressPercentage: goals?.reduce((sum, g) => sum + (g.progress || 0), 0) / (goals?.length || 1) || 0
          }, 
          error: null 
        }
      }
      
      console.error("Error fetching milestones for stats:", milestonesError)
      return { error: milestonesError.message, stats: defaultStats }
    }

    // Calculate statistics
    const stats = {
      totalGoals: goals?.length || 0,
      activeGoals: goals?.filter((g) => g.status === 'active').length || 0,
      completedGoals: goals?.filter((g) => g.status === 'achieved').length || 0,
      totalMilestones: milestones?.length || 0,
      completedMilestones: milestones?.filter((m) => m.is_achieved).length || 0,
      totalSavings: goals?.reduce((sum, g) => sum + (g.current_amount || 0), 0) || 0,
      totalTargets: goals?.reduce((sum, g) => sum + (g.target_amount || 0), 0) || 0,
      progressPercentage: goals?.reduce((sum, g) => sum + (g.progress || 0), 0) / (goals?.length || 1) || 0,
    }

    return { stats, error: null }
    } catch (error) {
      console.error("Error in getGoalStatistics inner try/catch:", error)
      return { error: "Failed to fetch goal statistics", stats: defaultStats }
    }
  } catch (error) {
    console.error("Error in getGoalStatistics outer try/catch:", error)
    return { error: "Failed to fetch goal statistics", stats: {
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      totalMilestones: 0,
      completedMilestones: 0,
      totalSavings: 0,
      totalTargets: 0,
      progressPercentage: 0,
    } }
  }
}

// Get a single goal by ID
export async function getGoalById(goalId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", goal: null }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", goal: null }
    }

    try {
      const { data: goal, error } = await supabase
        .from("financial_goals")
        .select(`
          *,
          milestones:goal_milestones(*),
          contributions:goal_contributions(*)
        `)
        .eq("id", goalId)
        .eq("user_id", user.id)
        .single()

      if (error) {
        console.error("Error fetching goal:", error)
        return { error: error.message, goal: null }
      }

      // Fetch goal roundups if they exist
      const { data: roundups } = await supabase
        .from("goal_roundups")
        .select("*")
        .eq("goal_id", goalId)
        .maybeSingle()

      // Fetch goal templates if they exist
      const { data: templates } = await supabase
        .from("goal_templates")
        .select("*")
        .maybeSingle()

      // Return the goal with all related data
      if (goal) {
        return {
          goal: {
            ...goal,
            roundup: roundups || null,
            template: templates || null,
          },
          error: null,
        }
      }

      return { goal: null, error: "Goal not found" }
    } catch (innerError) {
      console.error("Error in getGoalById inner try/catch:", innerError)
      return { error: "Failed to fetch goal", goal: null }
    }
  } catch (error) {
    console.error("Error in getGoalById:", error)
    return { error: "Failed to fetch goal", goal: null }
  }
}

// Create a new goal with optional milestones
export async function createGoal(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", goal: null }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", goal: null }
    }

    // Extract form data
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const targetAmount = parseFloat(formData.get("target_amount") as string)
    const startDate = formData.get("start_date") as string
    const endDate = formData.get("end_date") as string
    const imageUrl = formData.get("image_url") as string
    const priority = parseInt(formData.get("priority") as string) || 1
    const currency = formData.get("currency") as string || "USD"
    const category = formData.get("category") as string || "emergency"

    // Validate required fields
    if (!name || !targetAmount || isNaN(targetAmount)) {
      return { error: "Name and target amount are required", goal: null }
    }

    try {
      // Create the goal without the category field until the column is added to the database
      const goalData = {
        user_id: user.id,
        name,
        description,
        target_amount: targetAmount,
        current_amount: 0,
        start_date: startDate || new Date().toISOString(),
        end_date: endDate || null,
        image_url: imageUrl || null,
        priority,
        currency: currency,
        status: 'active'
      }
      
      const { data: goal, error } = await supabase
        .from("financial_goals")
        .insert(goalData)
        .select()
        .single()

      if (error) {
        console.error("Error creating goal:", error)
        return { error: error.message, goal: null }
      }

      // Create milestones if provided
      const milestonesData = formData.get("milestones") as string
      if (milestonesData) {
        try {
          const milestones = JSON.parse(milestonesData)
          if (Array.isArray(milestones) && milestones.length > 0) {
            const milestonesToInsert = milestones.map((m: any) => ({
              goal_id: goal.id,
              name: m.name,
              description: m.description || null,
              target_amount: m.targetAmount,
              is_achieved: false,
            }))

            await supabase.from("goal_milestones").insert(milestonesToInsert)
          }
        } catch (parseError) {
          console.error("Error parsing milestones:", parseError)
          // Continue even if milestones parsing fails
        }
      }

      revalidatePath("/goals")
      return { goal, error: null }
    } catch (innerError) {
      console.error("Error in createGoal inner try/catch:", innerError)
      return { error: "Failed to create goal", goal: null }
    }
  } catch (error) {
    console.error("Error in createGoal:", error)
    return { error: "Failed to create goal", goal: null }
  }
}

// Update an existing goal
export async function updateGoal(goalId: string, formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", goal: null }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", goal: null }
    }

    // Extract form data
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const targetAmount = Number.parseFloat(formData.get("target_amount") as string)
    const imageUrl = formData.get("image_url") as string
    const startDate = formData.get("start_date") as string
    const endDate = formData.get("end_date") as string
    const priority = Number.parseInt(formData.get("priority") as string) || 2
    const currency = formData.get("currency") as string || "USD"
    const status = formData.get("status") as GoalStatus || "active"
    const category = formData.get("category") as string || "emergency"

    // Validate required fields
    if (!name || !targetAmount || isNaN(targetAmount) || targetAmount < 0) {
      return { error: "Name and target amount are required", goal: null }
    }

    // Check if goal exists and belongs to user
    const { data: existingGoal, error: goalError } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single()

    if (goalError) {
      console.error("Error checking goal:", goalError)
      return { error: "Goal not found or access denied", goal: null }
    }

    // Prepare update data without the category field until the column is added to the database
    const updateData = {
      name,
      description,
      target_amount: targetAmount,
      start_date: startDate || existingGoal.start_date,
      end_date: endDate || null,
      image_url: imageUrl || null,
      priority,
      currency,
      status,
      updated_at: new Date().toISOString()
    }

    // Update the goal
    const { data: goal, error } = await supabase
      .from("financial_goals")
      .update(updateData)
      .eq("id", goalId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating goal:", error)
      return { error: error.message, goal: null }
    }

    // Update milestones if provided
    const milestonesData = formData.get("milestones") as string
    if (milestonesData) {
      try {
        const milestones = JSON.parse(milestonesData)
        if (Array.isArray(milestones) && milestones.length > 0) {
          // First, get existing milestones
          const { data: existingMilestones } = await supabase
            .from("goal_milestones")
            .select("id")
            .eq("goal_id", goalId)

          const existingIds = existingMilestones?.map(m => m.id) || []
          
          // Process each milestone
          for (const milestone of milestones) {
            if (milestone.id && existingIds.includes(milestone.id)) {
              // Update existing milestone
              await supabase
                .from("goal_milestones")
                .update({
                  name: milestone.name,
                  description: milestone.description || null,
                  target_amount: milestone.targetAmount,
                  is_achieved: milestone.isAchieved || false,
                  updated_at: new Date().toISOString()
                })
                .eq("id", milestone.id)
                .eq("goal_id", goalId)
            } else {
              // Add new milestone
              await supabase
                .from("goal_milestones")
                .insert({
                  goal_id: goalId,
                  name: milestone.name,
                  description: milestone.description || null,
                  target_amount: milestone.targetAmount,
                  is_achieved: false
                })
            }
          }
          
          // Delete milestones that were removed (optional)
          const updatedIds = milestones.filter(m => m.id).map(m => m.id)
          if (existingIds.length > 0) {
            const idsToDelete = existingIds.filter(id => !updatedIds.includes(id))
            if (idsToDelete.length > 0) {
              await supabase
                .from("goal_milestones")
                .delete()
                .in("id", idsToDelete)
                .eq("goal_id", goalId)
            }
          }
        }
      } catch (parseError) {
        console.error("Error processing milestones:", parseError)
        // Continue even if milestones processing fails
      }
    }

    revalidatePath(`/goals/${goalId}`)
    revalidatePath("/goals")
    return { goal, error: null }
  } catch (error) {
    console.error("Error in updateGoal:", error)
    return { error: "Failed to update goal", goal: null }
  }
}

// Create a new milestone for a goal
export async function createMilestone(goalId: string, formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", success: false }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", success: false }
    }

    // Verify the goal belongs to the user
    const { data: goal, error: goalError } = await supabase
      .from("financial_goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single()

    if (goalError) {
      console.error("Error checking goal:", goalError)
      return { error: "Goal not found or access denied", success: false }
    }

    // Extract form data
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const targetAmount = Number.parseFloat(formData.get("target_amount") as string) || 0

    // Validate required fields
    if (!name) {
      return { error: "Milestone name is required", success: false }
    }

    // Create the milestone
    const { data: milestone, error } = await supabase
      .from("goal_milestones")
      .insert({
        goal_id: goalId,
        name,
        description,
        target_amount: targetAmount,
        is_achieved: false
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating milestone:", error)
      return { error: error.message, success: false }
    }

    revalidatePath(`/goals/${goalId}`)
    return { success: true, milestone, error: null }
  } catch (error) {
    console.error("Error in createMilestone:", error)
    return { error: "Failed to create milestone", success: false }
  }
}

// Update an existing milestone
export async function updateMilestone(milestoneId: string, formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", success: false }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", success: false }
    }

    // Get the milestone to verify ownership
    const { data: milestone, error: milestoneError } = await supabase
      .from("goal_milestones")
      .select("*, financial_goals!inner(user_id)")
      .eq("id", milestoneId)
      .single()

    if (milestoneError) {
      console.error("Error fetching milestone:", milestoneError)
      return { error: "Milestone not found", success: false }
    }

    // Verify the milestone's goal belongs to the user
    if (milestone.financial_goals.user_id !== user.id) {
      return { error: "Access denied", success: false }
    }

    // Extract form data
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const targetAmount = Number.parseFloat(formData.get("target_amount") as string) || 0

    // Validate required fields
    if (!name) {
      return { error: "Milestone name is required", success: false }
    }

    // Update the milestone
    const { data: updatedMilestone, error } = await supabase
      .from("goal_milestones")
      .update({
        name,
        description,
        target_amount: targetAmount,
        updated_at: new Date().toISOString()
      })
      .eq("id", milestoneId)
      .select()
      .single()

    if (error) {
      console.error("Error updating milestone:", error)
      return { error: error.message, success: false }
    }

    revalidatePath(`/goals/${milestone.goal_id}`)
    return { success: true, milestone: updatedMilestone, error: null }
  } catch (error) {
    console.error("Error in updateMilestone:", error)
    return { error: "Failed to update milestone", success: false }
  }
}

// Update milestone completion status
export async function updateMilestoneStatus(milestoneId: string, isAchieved: boolean) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", success: false }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", success: false }
    }

    // Get the milestone to verify ownership and get goal_id
    const { data: milestone, error: milestoneError } = await supabase
      .from("goal_milestones")
      .select("*, financial_goals!inner(user_id)")
      .eq("id", milestoneId)
      .single()

    if (milestoneError) {
      console.error("Error fetching milestone:", milestoneError)
      return { error: "Milestone not found", success: false }
    }

    // Verify the milestone's goal belongs to the user
    if (milestone.financial_goals.user_id !== user.id) {
      return { error: "Access denied", success: false }
    }

    // Update the milestone status
    const { data: updatedMilestone, error } = await supabase
      .from("goal_milestones")
      .update({
        is_achieved: isAchieved,
        achieved_at: isAchieved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", milestoneId)
      .select()
      .single()

    if (error) {
      console.error("Error updating milestone status:", error)
      return { error: error.message, success: false }
    }

    revalidatePath(`/goals/${milestone.goal_id}`)
    return { success: true, milestone: updatedMilestone, error: null }
  } catch (error) {
    console.error("Error in updateMilestoneStatus:", error)
    return { error: "Failed to update milestone status", success: false }
  }
}

// Delete a milestone
export async function deleteMilestone(milestoneId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", success: false }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", success: false }
    }

    // Get the milestone to verify ownership and get goal_id
    const { data: milestone, error: milestoneError } = await supabase
      .from("goal_milestones")
      .select("*, financial_goals!inner(user_id)")
      .eq("id", milestoneId)
      .single()

    if (milestoneError) {
      console.error("Error fetching milestone:", milestoneError)
      return { error: "Milestone not found", success: false }
    }

    // Verify the milestone's goal belongs to the user
    if (milestone.financial_goals.user_id !== user.id) {
      return { error: "Access denied", success: false }
    }

    const goalId = milestone.goal_id

    // Delete the milestone
    const { error } = await supabase
      .from("goal_milestones")
      .delete()
      .eq("id", milestoneId)

    if (error) {
      console.error("Error deleting milestone:", error)
      return { error: error.message, success: false }
    }

    revalidatePath(`/goals/${goalId}`)
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in deleteMilestone:", error)
    return { error: "Failed to delete milestone", success: false }
  }
}

// Delete a goal and all its milestones
export async function deleteGoal(goalId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", success: false }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", success: false }
    }

    // Verify the goal belongs to the user
    const { data: goal, error: goalError } = await supabase
      .from("financial_goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single()

    if (goalError) {
      console.error("Error checking goal:", goalError)
      return { error: "Goal not found or access denied", success: false }
    }

    // Delete the goal (milestones will be cascade deleted due to foreign key constraint)
    const { error } = await supabase
      .from("financial_goals")
      .delete()
      .eq("id", goalId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting goal:", error)
      return { error: error.message, success: false }
    }

    revalidatePath("/goals")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in deleteGoal:", error)
    return { error: "Failed to delete goal", success: false }
  }
}

// Add a contribution to a goal
export async function addGoalContribution(goalId: string, formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: "Not authenticated", success: false }
    }

    const supabase = await createServerClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { error: "Database connection error", success: false }
    }

    // Extract form data
    const amount = Number.parseFloat(formData.get("amount") as string)
    const note = formData.get("note") as string
    const contributionDate = formData.get("contributionDate") as string || new Date().toISOString().split('T')[0]

    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      return { error: "Valid contribution amount is required", success: false }
    }

    // Check if goal exists and belongs to user
    const { data: goal, error: goalError } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single()

    if (goalError) {
      console.error("Error checking goal:", goalError)
      return { error: "Goal not found or access denied", success: false }
    }

    // Create contribution record
    const { data: contribution, error } = await supabase
      .from("goal_contributions")
      .insert({
        goal_id: goalId,
        user_id: user.id,
        amount,
        note,
        contribution_date: contributionDate,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating contribution:", error)
      return { error: error.message, success: false }
    }

    // The trigger defined in goals.sql will automatically update the goal's current_amount
    // We don't need to manually update it here

    // --- Notification logic for progress milestones ---
    // Re-fetch the updated goal to get the new progress
    const { data: updatedGoal } = await supabase
      .from("financial_goals")
      .select("current_amount, target_amount, name")
      .eq("id", goalId)
      .single();
    if (updatedGoal) {
      const progress = updatedGoal.current_amount / updatedGoal.target_amount;
      const thresholds = [0.25, 0.5, 0.75];
      // Fetch previous progress to avoid duplicate notifications
      const prevProgress = goal.current_amount / goal.target_amount;
      for (const threshold of thresholds) {
        if (prevProgress < threshold && progress >= threshold) {
          // Create notification
          await createGoalNotification({
            userId: user.id,
            message: `Congratulations! Your goal "${updatedGoal.name}" has reached ${(threshold * 100).toFixed(0)}% progress!`,
            link: `/goals/${goalId}`
          });
        }
      }
    }
    // --- End notification logic ---

    revalidatePath(`/goals/${goalId}`)
    revalidatePath("/goals")
    return { success: true, contribution, error: null }
  } catch (error) {
    console.error("Error in addGoalContribution:", error)
    return { error: "Failed to process contribution", success: false }
  }
}
