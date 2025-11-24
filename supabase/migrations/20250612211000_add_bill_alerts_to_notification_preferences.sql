-- Add bill_alerts column to notification_preferences table if it doesn't exist
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS bill_alerts BOOLEAN NOT NULL DEFAULT TRUE;

-- Add a comment for documentation
COMMENT ON COLUMN public.notification_preferences.bill_alerts IS 'Enable or disable bill due date alerts for the user.';

-- Refresh the PostgREST schema cache so the API recognizes the new column
SELECT pg_notify('pgrst', 'reload schema');
