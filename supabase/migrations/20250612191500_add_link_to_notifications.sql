-- Add link column to notifications table
ALTER TABLE public.notifications
ADD COLUMN link TEXT NULL;

-- Add RLS policy for the new link column
-- This ensures that the existing policies cover the new column.
-- (No new policy needed if existing policies are defined on the whole table/row)
