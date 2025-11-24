import { getNotifications } from "@/app/actions/notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationList } from "@/components/notifications/notification-list";

export async function NotificationsContent() {
  const { notifications, error } = await getNotifications();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500 text-center py-8">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500 py-8">You have no notifications yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <NotificationList initialNotifications={notifications} />
      </CardContent>
    </Card>
  );
}
