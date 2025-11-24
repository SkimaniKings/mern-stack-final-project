import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const supabaseAdmin = createAdminSupabaseClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Failed to create Supabase admin client." }, { status: 500 });
    }
    // Fetch notifications, joining notification_types for type name
    const { data, error } = await supabaseAdmin
      .from("user_notifications")
      .select(`id, message, link, notification_type, created_at, notification_types(name)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch notifications." }, { status: 500 });
    }

    // Map notifications to include type name
    const notifications = (data || []).map((n: any) => ({
      id: n.id,
      message: n.message,
      link: n.link,
      notification_type: n.notification_types?.name || "",
      created_at: n.created_at,
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
