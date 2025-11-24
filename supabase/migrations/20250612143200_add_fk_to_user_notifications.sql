-- Add foreign key constraint from user_notifications to notification_types

ALTER TABLE public.user_notifications
ADD CONSTRAINT user_notifications_notification_type_fkey
FOREIGN KEY (notification_type) REFERENCES public.notification_types(id)
ON UPDATE CASCADE
ON DELETE SET NULL;
