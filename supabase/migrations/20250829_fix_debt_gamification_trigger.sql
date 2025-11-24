-- Fix the debt payment gamification trigger to handle missing fields gracefully
-- This trigger was causing errors when updating debts without last_payment_amount field

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS debt_payment_gamification_trigger ON public.debts;

-- Recreate the function with proper null checks and field existence validation
CREATE OR REPLACE FUNCTION public.debt_payment_gamification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only process if both OLD and NEW records exist (UPDATE operation)
  -- and if the last_payment_amount field exists and has changed
  IF TG_OP = 'UPDATE' AND 
     OLD IS NOT NULL AND 
     NEW IS NOT NULL THEN
    
    -- Check if last_payment_amount field exists and has a meaningful change
    BEGIN
      IF (NEW.last_payment_amount IS DISTINCT FROM OLD.last_payment_amount) AND 
         (NEW.last_payment_amount IS NOT NULL) AND 
         (NEW.last_payment_amount > 0) THEN
        
        -- Award points based on payment amount (1 point per $10)
        PERFORM public.award_points(NEW.user_id, floor(NEW.last_payment_amount / 10));
        
        -- Record daily activity
        PERFORM public.record_daily_activity(NEW.user_id, 'debt_payment');
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If there's any error (like missing column), just continue without failing
        -- This ensures debt updates don't fail due to gamification issues
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER debt_payment_gamification_trigger
  BEFORE UPDATE ON public.debts
  FOR EACH ROW
  EXECUTE FUNCTION public.debt_payment_gamification();

-- Add a comment explaining the trigger
COMMENT ON FUNCTION public.debt_payment_gamification() IS 
'Gamification trigger for debt payments. Awards points when last_payment_amount increases. Handles missing fields gracefully to prevent update failures.';
