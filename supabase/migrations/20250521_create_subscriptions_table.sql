-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  recurrence TEXT NOT NULL, -- 'monthly', 'yearly', 'quarterly', 'weekly', 'daily'
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  category TEXT NOT NULL, -- 'entertainment', 'utilities', 'software', 'health', 'education', 'other'
  service_provider TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  roi_expected DECIMAL(10, 2), -- Expected return on investment (if applicable)
  roi_actual DECIMAL(10, 2), -- Actual return on investment (if tracked)
  roi_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key to users table
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Add RLS policies for subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for users to see only their own subscriptions
CREATE POLICY "Users can view their own subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy for users to insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own subscriptions
CREATE POLICY "Users can update their own subscriptions" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy for users to delete their own subscriptions
CREATE POLICY "Users can delete their own subscriptions" 
  ON public.subscriptions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to detect overlapping subscriptions
CREATE OR REPLACE FUNCTION public.check_subscription_overlap(
  p_user_id UUID,
  p_service_provider TEXT,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_current_id UUID DEFAULT NULL
)
RETURNS TABLE (
  overlapping_id UUID,
  name TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.start_date,
    s.end_date
  FROM 
    public.subscriptions s
  WHERE 
    s.user_id = p_user_id
    AND s.service_provider = p_service_provider
    AND s.is_active = TRUE
    AND (p_current_id IS NULL OR s.id != p_current_id)
    AND (
      -- Case 1: New subscription starts during an existing subscription
      (p_start_date >= s.start_date AND 
       (p_start_date <= s.end_date OR s.end_date IS NULL))
      OR
      -- Case 2: New subscription ends during an existing subscription
      (p_end_date IS NOT NULL AND p_end_date >= s.start_date AND 
       (p_end_date <= s.end_date OR s.end_date IS NULL))
      OR
      -- Case 3: New subscription completely contains an existing subscription
      (p_start_date <= s.start_date AND 
       (p_end_date IS NULL OR (s.end_date IS NOT NULL AND p_end_date >= s.end_date)))
    );
END;
$$;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_subscription_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to update the updated_at timestamp
CREATE TRIGGER update_subscription_timestamp
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_timestamp();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_subscription_overlap TO authenticated;
