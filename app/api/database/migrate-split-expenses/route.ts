import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Execute the migration script
    const { error: migrationError } = await supabase.rpc(
      "execute_migration_script",
      { script_name: "20250523_fix_split_expenses" }
    );
    
    if (migrationError) {
      console.error("Error executing migration script:", migrationError);
      return NextResponse.json(
        { 
          success: false, 
          error: migrationError.message,
          details: "Failed to execute migration script for split expenses"
        },
        { status: 500 }
      );
    }
    
    // Refresh the schema cache to ensure PostgREST sees the new columns/tables
    const { error: refreshError } = await supabase.rpc(
      "refresh_postgrest_schema"
    );
    
    if (refreshError) {
      console.error("Error refreshing schema cache:", refreshError);
      return NextResponse.json(
        { 
          success: false, 
          error: refreshError.message,
          details: "Migration was successful but failed to refresh schema cache"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Split expenses database structure successfully migrated and schema refreshed"
    });
  } catch (error) {
    console.error("Unexpected error in migrate-split-expenses API:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        details: "An unexpected error occurred during migration"
      },
      { status: 500 }
    );
  }
}
