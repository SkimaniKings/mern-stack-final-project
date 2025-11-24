import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Initializes the split expense database structure
 * This function ensures that all required tables and columns exist
 */
export async function initSplitExpenseDatabase() {
  try {
    // Call the API to fix the database structure
    // Use window.location.origin to get the base URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/database/fix-split-expenses`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.warn('Failed to initialize split expense database structure:', 
        errorData?.error || errorData?.details || await response.text());
      return false;
    }
    
    const result = await response.json();
    console.log('Split expense database structure initialized successfully:', result.message);
    return true;
  } catch (error) {
    console.error('Error initializing split expense database structure:', error);
    return false;
  }
}

/**
 * Checks if a split expense operation can be performed
 * This function attempts to fix the database structure if needed
 */
export async function ensureSplitExpenseStructure() {
  try {
    const supabase = createClientComponentClient();
    
    // Try to query the expense_splits table
    const { error: splitTableError } = await supabase
      .from('expense_splits')
      .select('id')
      .limit(1);
    
    // Try to query the split_with_name column in expenses table
    const { error: columnError } = await supabase
      .from('expenses')
      .select('split_with_name')
      .limit(1);
    
    // If either query fails, initialize the database structure
    if (splitTableError || columnError) {
      return await initSplitExpenseDatabase();
    }
    
    return true;
  } catch (error) {
    console.error('Error checking split expense structure:', error);
    return false;
  }
}
