CREATE TABLE IF NOT EXISTS goal_milestone_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_percentage INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, milestone_percentage)
);

ALTER TABLE goal_milestone_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own milestone notifications" ON goal_milestone_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestone notifications" ON goal_milestone_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
