export type GoalStatus = "not_started" | "in_progress" | "completed" | "on_hold"

export interface Goal {
  // Base fields
  id: string
  user_id: string
  name: string
  description: string | null
  target_amount: number
  current_savings: number
  start_date: string
  target_date: string
  goal_type: string
  image_url: string | null
  priority: "high" | "medium" | "low"
  funding_strategy: string | null
  is_shared: boolean
  is_achieved: boolean
  created_at: string
  updated_at: string
  template_id: string | null
  status: GoalStatus

  // Relationships
  template?: GoalTemplate[]
  milestones?: GoalMilestone[]
  priority_matrix?: GoalPriorityMatrix[]
  parent_relationships?: GoalRelationship[]
  child_relationships?: GoalRelationship[]
  shares?: GoalShare[]
  achievements?: GoalAchievement[]
}

export interface GoalMilestone {
  id: string
  goal_id: string
  name: string
  description: string | null
  target_amount: number | null
  target_date: string | null
  is_achieved: boolean
  achieved_at: string | null
  created_at: string
  updated_at: string
}

export interface GoalPriorityMatrix {
  id: string
  goal_id: string
  urgency: number
  impact: number
  created_at: string
  updated_at: string
}

export interface GoalRelationship {
  id: string
  parent_goal_id: string
  child_goal_id: string
  relationship_type: string
  created_at: string
  updated_at: string
}

export interface GoalShare {
  id: string
  goal_id: string
  shared_with_user_id: string
  share_type: string
  created_at: string
  updated_at: string
}

export interface GoalAchievement {
  id: string
  goal_id: string
  milestone_id: string | null
  description: string
  achieved_at: string
  is_shared: boolean
  celebration_type: string | null
  created_at: string
  updated_at: string
}

export interface GoalTemplate {
  id: string
  name: string
  description: string | null
  goal_type: string
  target_amount: number | null
  duration_days: number | null
  image_url: string | null
  created_at: string
  updated_at: string
}
