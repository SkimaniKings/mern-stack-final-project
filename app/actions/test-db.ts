"use server"

import { createServerClient as createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

interface TableSchema {
  name: string
  requiredColumns: string[]
  description: string
}

interface TableResult {
  exists: boolean
  schemaValid: boolean
  error?: string
  description: string
  missingColumns?: string[]
}

interface TestResults {
  tables: Record<string, TableResult>
  missingTables: string[]
  schemaIssues: Array<{ table: string; missingColumns: string[] }>
  connectionStatus: string
  userAccess?: {
    success: boolean
    userId: string
    error?: string
  }
}

/**
 * Comprehensive database connection and schema validation test
 * Tests connection, table existence, and schema validity
 */
export async function testDatabaseConnection() {
  try {
    const user = await getCurrentUser()
    const supabase = await createClient()
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1)
      .maybeSingle()
    
    if (connectionError && connectionError.code !== 'PGRST116') {
      // PGRST116 means relation doesn't exist, which is expected for a non-existent test table
      return {
        success: false,
        message: "Failed to connect to database",
        error: connectionError
      }
    }
    
    // Define expected tables and their required columns
    const tableSchemas: TableSchema[] = [
      {
        name: 'expenses',
        requiredColumns: ['id', 'user_id', 'amount', 'category', 'spent_at', 'merchant_name'],
        description: 'Expense tracking'
      },
      {
        name: 'assets',
        requiredColumns: ['id', 'user_id', 'name', 'value', 'type', 'created_at'],
        description: 'Net worth assets'
      },
      {
        name: 'liabilities',
        requiredColumns: ['id', 'user_id', 'name', 'amount', 'type', 'created_at'],
        description: 'Net worth liabilities'
      },
      {
        name: 'net_worth_history',
        requiredColumns: ['id', 'user_id', 'total_assets', 'total_liabilities', 'net_worth', 'date'],
        description: 'Net worth history tracking'
      },
      {
        name: 'watchlist',
        requiredColumns: ['id', 'user_id', 'ticker', 'name', 'current_price', 'target_price', 'notes'],
        description: 'Investment watchlist'
      },
      {
        name: 'investment_universe',
        requiredColumns: ['id', 'ticker', 'name', 'sector', 'esg_score', 'environmental_score', 'social_score', 'governance_score'],
        description: 'ESG investment universe'
      },
      {
        name: 'esg_categories',
        requiredColumns: ['id', 'name', 'description', 'pillar'],
        description: 'ESG screening categories'
      },
      {
        name: 'excluded_sectors',
        requiredColumns: ['id', 'name', 'description'],
        description: 'Excluded sectors for ESG screening'
      }
    ]
    
    const results: TestResults = {
      tables: {},
      missingTables: [],
      schemaIssues: [],
      connectionStatus: "Connected"
    }
    
    // Test each table for existence and schema validity
    for (const schema of tableSchemas) {
      try {
        // Check if table exists
        const { data, error } = await supabase
          .from(schema.name)
          .select('*')
          .limit(1)
        
        const tableExists = error?.code !== '42P01'
        
        if (!tableExists) {
          results.missingTables.push(schema.name)
          results.tables[schema.name] = {
            exists: false,
            schemaValid: false,
            error: error?.message || 'Table does not exist',
            description: schema.description
          }
          continue
        }
        
        // If table exists, check its schema using information_schema
        const { data: infoSchemaColumns, error: infoSchemaError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_schema', 'public')
          .eq('table_name', schema.name)
        
        if (infoSchemaError) {
          results.tables[schema.name] = {
            exists: true,
            schemaValid: false,
            error: 'Could not verify schema: ' + infoSchemaError.message,
            description: schema.description
          }
          continue
        }
        
        const columnNames = infoSchemaColumns.map((col: { column_name: string }) => col.column_name)
        const missingColumns = schema.requiredColumns.filter(col => !columnNames.includes(col))
        
        results.tables[schema.name] = {
          exists: true,
          schemaValid: missingColumns.length === 0,
          missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
          description: schema.description
        }
        
        if (missingColumns.length > 0) {
          results.schemaIssues.push({
            table: schema.name,
            missingColumns
          })
        }
      } catch (error) {
        results.tables[schema.name] = {
          exists: false,
          schemaValid: false,
          error: error instanceof Error ? error.message : String(error),
          description: schema.description
        }
      }
    }
    
    // Test user-specific data access if user is logged in
    if (user) {
      try {
        const { data: userExpenses, error: userExpensesError } = await supabase
          .from('expenses')
          .select('count')
          .eq('user_id', user.id)
          .maybeSingle()
        
        results.userAccess = {
          success: !userExpensesError || userExpensesError.code === '42P01',
          userId: user.id,
          error: userExpensesError?.message
        }
      } catch (error) {
        results.userAccess = {
          success: false,
          userId: user.id,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
    
    return {
      success: true,
      message: results.missingTables.length > 0 
        ? `Database connected but missing ${results.missingTables.length} tables` 
        : "Database connection successful",
      results
    }
  } catch (error) {
    console.error("Error testing database connection:", error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Checks if a specific table exists and has the correct schema
 */
export async function checkTableSchema(tableName: string) {
  try {
    const supabase = await createClient()
    
    // Check if table exists
    const { data, error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1)
    
    if (error && error.code === '42P01') {
      return {
        success: false,
        exists: false,
        message: `Table '${tableName}' does not exist`
      }
    }
    
    // Get table columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
    
    if (columnsError) {
      return {
        success: false,
        exists: true,
        message: `Could not retrieve schema for table '${tableName}'`,
        error: columnsError.message
      }
    }
    
    return {
      success: true,
      exists: true,
      message: `Table '${tableName}' exists with ${columns.length} columns`,
      columns
    }
  } catch (error) {
    console.error(`Error checking table schema for '${tableName}':`, error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
