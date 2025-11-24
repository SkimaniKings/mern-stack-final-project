-- ========================================
-- 1. Notification Types Table
-- ========================================
CREATE TABLE IF NOT EXISTS notification_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed notification types (you can modify or extend these)
INSERT INTO notification_types (name, description) VALUES
('General Alert', 'A general system or user notification'),
('Reminder', 'A scheduled reminder or event'),
('System Update', 'System maintenance or feature updates')
ON CONFLICT DO NOTHING;

-- ========================================
-- 2. Notifications Table
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    notification_type_id UUID NOT NULL REFERENCES notification_types(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 3. Trigger: Auto-update updated_at column
-- ========================================
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_notifications_updated
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_notifications_updated_at();

-- ========================================
-- 4. View: Unread Notifications
-- ========================================
CREATE OR REPLACE VIEW user_notifications AS 
SELECT
    n.id AS notification_id,
    nt.name AS notification_type,
    n.message,
    n.is_read,
    n.created_at,
    n.updated_at
FROM notifications n
JOIN notification_types nt ON n.notification_type_id = nt.id
WHERE n.is_read = FALSE
ORDER BY n.created_at DESC;

-- ========================================
-- 5. View: All Notification History
-- ========================================
CREATE OR REPLACE VIEW user_notification_history AS 
SELECT
    n.id AS notification_id,
    nt.name AS notification_type,
    n.message,
    n.is_read,
    n.created_at,
    n.updated_at
FROM notifications n
JOIN notification_types nt ON n.notification_type_id = nt.id
ORDER BY n.created_at DESC;
