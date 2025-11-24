-- Seed Notification Types
-- This migration inserts the core notification types required by the application.
-- It uses ON CONFLICT DO NOTHING to prevent errors if the types already exist.

INSERT INTO public.notification_types (name, description)
VALUES
  ('Goal Alert', 'Notifications about your financial goals.'),
  ('Bill Alert', 'Reminders for upcoming bill due dates.'),
  ('Budget Alert', 'Warnings about your budget limits.'),
  ('Watchlist Alert', 'Updates on your stock watchlist.'),
  ('Investment Update', 'News and updates about your investments.'),
  ('New Feature Update', 'Announcements about new application features.')
ON CONFLICT (name) DO NOTHING;
