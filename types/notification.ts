export interface NotificationType {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  notification_type_id: string;
  notification_type?: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  watchlist_alerts: boolean;
  budget_alerts: boolean;
  goal_alerts: boolean;
  bill_alerts: boolean;
  investment_updates: boolean;
  created_at: string;
  updated_at: string;
}
