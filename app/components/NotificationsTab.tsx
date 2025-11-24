import React, { useEffect, useState } from "react";

interface Notification {
  id: string;
  message: string;
  link?: string;
  notification_type: string; // e.g., "Bill Alert", "Goal"
  created_at: string;
}

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications/list")
      .then(res => res.json())
      .then(data => {
        setNotifications(data.notifications || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading notifications...</div>;

  if (notifications.length === 0) return <div>No notifications yet.</div>;

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {notifications.map(n => (
        <li key={n.id} style={{ marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
          <div>
            <strong>{n.notification_type}:</strong> {n.message}
          </div>
          <div style={{ fontSize: "0.9em", color: "#888" }}>
            {new Date(n.created_at).toLocaleString()}
            {n.link && (
              <a href={n.link} style={{ marginLeft: 12, color: "#0070f3" }}>View</a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
