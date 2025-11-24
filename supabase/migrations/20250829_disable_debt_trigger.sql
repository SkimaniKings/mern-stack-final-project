-- Temporarily disable the debt payment gamification trigger that's causing update failures
-- This trigger is trying to access last_payment_amount field that may not be included in updates

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS debt_payment_gamification_trigger ON public.debts;

-- Also drop any other debt-related gamification triggers that might cause issues
DROP TRIGGER IF EXISTS debt_gamification_trigger ON public.debts;

-- Add a comment explaining why the trigger was disabled
COMMENT ON TABLE public.debts IS 
'Debt gamification trigger temporarily disabled due to field access issues during updates. Re-enable after fixing field handling.';
