export interface UserPoints {
  user_id: string
  total_points: number
  level: number
  updated_at: string
}

export interface Achievement {
  id: number
  name: string
  description: string | null
  points: number
  icon: string | null
  created_at: string
}

export interface UserAchievement {
  user_id: string
  achievement_id: number
  unlocked_at: string
  achievement?: Achievement
}

export interface DailyActivity {
  user_id: string
  activity_date: string // YYYY-MM-DD
  activity_type: string
}

export interface Challenge {
  id: number
  title: string
  description: string | null
  target_value: number | null
  metric: string | null
  duration_days: number | null
  points_reward: number | null
  created_at: string
}

export interface UserChallenge {
  id: number
  user_id: string
  challenge_id: number
  started_at: string
  completed_at: string | null
  progress: number
  status: 'in_progress' | 'completed' | 'failed'
  challenge?: Challenge
}
