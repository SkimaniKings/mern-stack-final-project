"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Notification, NotificationPreferences, NotificationType } from "@/types/notification"
import { refreshSession } from "@/lib/supabase/auth-refresh"

// Interface for creating notifications
interface CreateNotificationParams {
  userId: string
  notificationTypeId: string
  message: string
  link?: string
}

interface SendEmailParams {
  userId: string
  subject: string
  message: string
  html?: string
}

// Get notification types
export async function getNotificationTypes() {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { types: [], error: "Database connection error" }
    }
    
    // Get notification types
    const { data: types, error } = await supabase
      .from("notification_types")
      .select("*")
      .order("name", { ascending: true })
    
    if (error) {
      console.error("Error fetching notification types:", error)
      return { types: [], error: error.message }
    }
    
    return { types: types as NotificationType[], error: null }
  } catch (error) {
    console.error("Unexpected error in getNotificationTypes:", error)
    return { types: [], error: "An unexpected error occurred" }
  }
}

// Get user's notifications
export async function getNotifications(): Promise<{ notifications: Notification[]; error: string | null }> {
  await refreshSession();
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      console.error("Failed to create Supabase client");
      return { notifications: [], error: "Database connection error" };
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error getting user:", userError);
      return { notifications: [], error: "User not authenticated" };
    }

    type NotificationWithTypeName = {
      notification_id: string;
      user_id: string;
      message: string;
      link: string | null;
      is_read: boolean;
      created_at: string;
      updated_at: string;
      notification_type: string;
      notification_types: { name: string } | null;
    };

    const { data: notificationsData, error } = await supabase
      .from('user_notifications')
      .select(`
        notification_id,
        user_id,
        message,
        link,
        is_read,
        created_at,
        updated_at,
        notification_type,
        notification_types ( name )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<NotificationWithTypeName[]>();

    if (error) {
      console.error("Error fetching notifications:", error);
      return { notifications: [], error: error.message };
    }

    if (!notificationsData) {
      return { notifications: [], error: null };
    }

    const mappedNotifications: Notification[] = notificationsData.map(n => ({
      id: n.notification_id,
      user_id: n.user_id,
      message: n.message,
      link: n.link,
      is_read: n.is_read,
      created_at: n.created_at,
      updated_at: n.updated_at,
      notification_type_id: n.notification_type,
      notification_type: n.notification_types?.name ?? 'General',
    }));

    return { notifications: mappedNotifications, error: null };
  } catch (error) {
    console.error("Unexpected error in getNotifications:", error);
    return { notifications: [], error: "An unexpected error occurred" };
  }
}

// Get user's unread notifications
export async function getUnreadNotifications() {
  // First refresh the auth session to prevent JWT expiration errors
  await refreshSession();
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { notifications: [], error: "Database connection error" }
    }
    
    // Get current user
    const { data, error: userError } = await supabase.auth.getUser()
    const user = data?.user
    
    if (userError || !user) {
      console.error("Error getting user:", userError)
      return { notifications: [], error: "User not authenticated" }
    }
    
    // Get unread notifications
    const { data: notifications, error } = await supabase
      .from("user_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
    
    if (error) {
      console.error("Error fetching unread notifications:", error)
      return { notifications: [], error: error.message }
    }
    
    // Map the results to match our frontend expectations
    const mappedNotifications = notifications.map(notification => ({
      id: notification.notification_id,
      user_id: user.id,
      notification_type_id: notification.notification_type,
      notification_type: notification.notification_type,
      message: notification.message,
      is_read: notification.is_read,
      created_at: notification.created_at,
      updated_at: notification.updated_at
    }));
    
    return { notifications: mappedNotifications as Notification[], error: null }
  } catch (error) {
    console.error("Unexpected error in getUnreadNotifications:", error)
    return { notifications: [], error: "An unexpected error occurred" }
  }
}

// Create a new notification
export async function createNotification(params: CreateNotificationParams) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, error: "Database connection error" }
    }

    // Create admin client to bypass RLS
    const adminClient = await createAdminSupabaseClient()
    
    if (!adminClient) {
      console.error("Failed to create admin client")
      return { success: false, error: "Could not create notification" }
    }



    // Create notification using admin client
    const { data, error } = await adminClient
      .from("user_notifications")
      .insert({
        user_id: params.userId,
        notification_type: params.notificationTypeId,
        message: params.message,
        link: params.link,
        is_read: false
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating notification:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/notifications")
    return { success: true, notification: data as Notification }
  } catch (error) {
    console.error("Unexpected error in createNotification:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Mark a notification as read
export async function markNotificationAsRead(id: string) {
  // First refresh the auth session to prevent JWT expiration errors
  await refreshSession();
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, error: "Database connection error" }
    }
    
    // Get current user
    const { data, error: userError } = await supabase.auth.getUser()
    const user = data?.user
    
    if (userError || !user) {
      console.error("Error getting user:", userError)
      return { success: false, error: "User not authenticated" }
    }
    
    // Mark notification as read
    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("notification_id", id)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error marking notification as read:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/notifications")
    return { success: true }
  } catch (error) {
    console.error("Unexpected error in markNotificationAsRead:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
  // First refresh the auth session to prevent JWT expiration errors
  await refreshSession();
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, error: "Database connection error" }
    }
    
    // Get current user
    const { data, error: userError } = await supabase.auth.getUser()
    const user = data?.user
    
    if (userError || !user) {
      console.error("Error getting user:", userError)
      return { success: false, error: "User not authenticated" }
    }
    
    // Update all notifications
    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false)
    
    if (error) {
      console.error("Error marking all notifications as read:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/notifications")
    return { success: true }
  } catch (error) {
    console.error("Unexpected error in markAllNotificationsAsRead:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Delete a notification
export async function deleteNotification(id: string) {
  // First refresh the auth session to prevent JWT expiration errors
  await refreshSession();
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, error: "Database connection error" }
    }
    
    // Get current user
    const { data, error: userError } = await supabase.auth.getUser()
    const user = data?.user
    
    if (userError || !user) {
      console.error("Error getting user:", userError)
      return { success: false, error: "User not authenticated" }
    }
    
    // Delete notification
    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("notification_id", id)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error deleting notification:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/notifications")
    return { success: true }
  } catch (error) {
    console.error("Unexpected error in deleteNotification:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Get user's notification preferences
export async function getNotificationPreferences() {
  // First refresh the auth session to prevent JWT expiration errors
  await refreshSession();
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { preferences: null, error: "Database connection error" }
    }
    
    // Get current user
    const { data, error: userError } = await supabase.auth.getUser()
    const user = data?.user
    
    if (userError || !user) {
      console.error("Error getting user:", userError)
      return { preferences: null, error: "User not authenticated" }
    }
    
    // Get preferences
    const { data: preferences, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()
    
    if (error) {
      // If no preferences found, create them using admin client
      if (error.code === "PGRST116") {
        console.log("No notification preferences found, creating new preferences")
        
        // Create admin client to bypass RLS
        const adminClient = createAdminSupabaseClient()
        
        if (!adminClient) {
          console.error("Failed to create admin client")
          return { preferences: null, error: "Could not create notification preferences" }
        }
        
        // Create default preferences
        const defaultPreferences = {
          user_id: user.id,
          email_notifications: true,
          push_notifications: true,
          watchlist_alerts: true,
          budget_alerts: true,
          goal_alerts: true,
          bill_reminders: true,
          investment_updates: true
        }
        
        // Insert preferences using admin client
        const { data: newPreferences, error: insertError } = await adminClient
          .from("notification_preferences")
          .insert(defaultPreferences)
          .select()
          .single()
        
        if (insertError) {
          console.error("Error creating notification preferences with admin client:", insertError)
          return { preferences: null, error: "Failed to create notification preferences" }
        }
        
        console.log("Successfully created notification preferences")
        return { preferences: newPreferences as NotificationPreferences, error: null }
      }
      
      console.error("Error getting notification preferences:", error)
      return { preferences: null, error: error.message }
    }
    
    return { preferences: preferences as NotificationPreferences, error: null }
  } catch (error) {
    console.error("Unexpected error in getNotificationPreferences:", error)
    return { preferences: null, error: "An unexpected error occurred" }
  }
}

// Update user's notification preferences
export async function updateNotificationPreferences(preferences: Partial<NotificationPreferences>) {
  // First refresh the auth session to prevent JWT expiration errors
  await refreshSession();
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, error: "Database connection error" }
    }
    
    // Get current user
    const { data, error: userError } = await supabase.auth.getUser()
    const user = data?.user
    
    if (userError || !user) {
      console.error("Error getting user:", userError)
      return { success: false, error: "User not authenticated" }
    }
    
    // Update preferences
    const { error } = await supabase
      .from("notification_preferences")
      .update(preferences)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error updating notification preferences:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/settings/notifications")
    return { success: true }
  } catch (error) {
    console.error("Unexpected error in updateNotificationPreferences:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Send an email notification
export async function sendEmailNotification(params: SendEmailParams) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, error: "Database connection error" }
    }
    
    // Get user's email
    const { data, error: userError } = await supabase.auth.getUser()
    const user = data?.user
    
    if (userError || !user) {
      console.error("Error getting user:", userError)
      return { success: false, error: "User not authenticated" }
    }
    
    const userEmail = user.email
    
    if (!userEmail) {
      console.error("User has no email address")
      return { success: false, error: "User has no email address" }
    }
    
    // In a real app, you would send an actual email here
    // For now, we'll just log it
    console.log(`Sending email to ${userEmail}:`)
    console.log(`Subject: ${params.subject}`)
    console.log(`Message: ${params.message}`)
    
    if (params.html) {
      console.log(`HTML: ${params.html}`)
    }
    
    // In a real implementation, you would use a service like SendGrid, AWS SES, etc.
    // Example with SendGrid:
    /*
    const msg = {
      to: userEmail,
      from: 'noreply@dripcheck.com',
      subject: params.subject,
      text: params.message,
      html: params.html || params.message,
    }
    await sendgrid.send(msg)
    */
    
    return { success: true }
  } catch (error) {
    console.error("Unexpected error in sendEmailNotification:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
