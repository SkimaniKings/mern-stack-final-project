-- 1. Add 'Bill Alert' to notification_types if it doesn't exist
INSERT INTO public.notification_types (name, description)
SELECT 'Bill Alert', 'Notifications for upcoming bill due dates.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.notification_types WHERE name = 'Bill Alert'
);

-- 2. Add bill_alerts preference column to user_notification_preferences
ALTER TABLE public.user_notification_preferences
ADD COLUMN IF NOT EXISTS bill_alerts BOOLEAN NOT NULL DEFAULT TRUE;

-- Add a comment to the new column
COMMENT ON COLUMN public.user_notification_preferences.bill_alerts IS 'Enable/disable notifications for upcoming bills.';

-- 3. Create a table to log sent bill alerts and prevent duplicates
CREATE TABLE IF NOT EXISTS public.bill_alert_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    notification_sent_for_due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent sending the same alert for the same bill due date
    CONSTRAINT unique_bill_alert UNIQUE (user_id, bill_id, notification_sent_for_due_date)
);

-- Add comments to the new table and its columns
COMMENT ON TABLE public.bill_alert_notifications IS 'Logs when a notification has been sent for an upcoming bill to avoid duplicates.';
COMMENT ON COLUMN public.bill_alert_notifications.user_id IS 'The user who received the notification.';
COMMENT ON COLUMN public.bill_alert_notifications.bill_id IS 'The bill the notification is for.';
COMMENT ON COLUMN public.bill_alert_notifications.notification_sent_for_due_date IS 'The specific due date for which the alert was sent.';

-- Enable Row Level Security
ALTER TABLE public.bill_alert_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own logged alerts (optional, but good practice)
CREATE POLICY "Allow users to view their own bill alert logs" ON public.bill_alert_notifications
FOR SELECT USING (auth.uid() = user_id);

-- Service roles can insert new logs (for the cron job)
CREATE POLICY "Allow service roles to insert new bill alert logs" ON public.bill_alert_notifications
FOR INSERT WITH CHECK (auth.role() = 'service_role');
