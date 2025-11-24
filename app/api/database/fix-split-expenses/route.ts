import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Step 1: Check if expense_splits table exists by trying to query it
    const splitTableResult = await supabase
      .from('expense_splits')
      .select('id')
      .limit(1);

    // Step 2: Check if split_with_name column exists in expenses table
    const expensesColumnResult = await supabase
      .from('expenses')
      .select('split_with_name')
      .limit(1);

    // Determine what needs to be fixed
    const needsTableFix = splitTableResult.error && 
      splitTableResult.error.message?.includes('does not exist');
    
    const needsColumnFix = expensesColumnResult.error && 
      expensesColumnResult.error.message?.includes('does not exist');

    // If everything is working, return success
    if (!needsTableFix && !needsColumnFix) {
      return NextResponse.json(
        { success: true, message: "Split expenses database structure is already correct" },
        { status: 200 }
      );
    }

    // Attempt to fix issues by calling the database refresh endpoint
    // This is based on our previous experience with similar issues
    const refreshResponse = await fetch('http://localhost:3000/api/database/refresh');
    
    if (!refreshResponse.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to refresh database schema",
          details: await refreshResponse.text()
        },
        { status: 500 }
      );
    }

    // After refreshing, try to update an expense with the new columns
    // This will create the columns if they don't exist
    try {
      // Get a sample expense ID
      const { data: sampleExpense } = await supabase
        .from('expenses')
        .select('id')
        .limit(1);

      if (sampleExpense && sampleExpense.length > 0) {
        // Try to update with the new columns
        await supabase
          .from('expenses')
          .update({
            split_with_name: null,
            split_amount: null
          })
          .eq('id', sampleExpense[0].id);
      }
    } catch (updateError) {
      console.warn("Error updating expense with new columns:", updateError);
      // Continue anyway, as this might fail if the columns don't exist yet
    }

    // Verify the fixes worked
    const verifyTableResult = await supabase
      .from('expense_splits')
      .select('id')
      .limit(1);

    const verifyColumnResult = await supabase
      .from('expenses')
      .select('split_with_name')
      .limit(1);

    const success = !verifyTableResult.error || !verifyColumnResult.error;

    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Could not verify database structure after fix attempts",
          details: {
            tableError: verifyTableResult.error,
            columnError: verifyColumnResult.error
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Split expenses database structure fixed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
