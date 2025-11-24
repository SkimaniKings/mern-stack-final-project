import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies })
    
    // Instead of trying to modify the database schema, which requires owner privileges,
    // we'll check if the debts table exists and is accessible
    let tableAccessible = false
    
    try {
      // Try to query the debts table
      const { data, error } = await supabase
        .from('debts')
        .select('id')
        .limit(1)
      
      if (!error) {
        tableAccessible = true
        console.log('Debts table is accessible')
      } else {
        console.warn('Could not access debts table:', error)
      }
    } catch (error) {
      console.warn('Error checking debts table:', error)
    }
    
    // Check if the create_debt function exists
    let functionExists = false
    
    try {
      // Try to call the function with invalid parameters to check if it exists
      const { error } = await supabase.rpc('create_debt', {
        _name: 'Test Debt',
        _type: 'test',
        _current_balance: 0,
        _interest_rate: 0,
        _minimum_payment: 0
      })
      
      // If the error is about invalid parameters but not about the function not existing,
      // then the function exists
      if (error && !error.message.includes('Could not find the function')) {
        functionExists = true
        console.log('create_debt function exists')
      } else {
        console.warn('create_debt function does not exist:', error?.message)
      }
    } catch (error) {
      console.warn('Error checking create_debt function:', error)
    }
    
    // Set up client-side configuration
    const clientConfig = {
      // If we can't access the table or the function doesn't exist,
      // we'll use client-side storage as the primary method
      useClientStorage: !tableAccessible || !functionExists,
      // Flag to indicate if we should attempt database operations
      attemptDatabaseOperations: tableAccessible,
      // Flag to indicate if we should use the create_debt function
      useCreateDebtFunction: functionExists
    }
    
    // Store the client configuration in a response cookie
    const response = NextResponse.json({
      success: true,
      message: 'Applied client-side fixes for debt management',
      details: {
        tableAccessible,
        functionExists,
        clientConfig
      }
    })
    
    // Set the cookie in the response
    response.cookies.set('debt-client-config', JSON.stringify(clientConfig), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: false, // Allow client-side access
      sameSite: 'strict'
    })
    
    return response
  } catch (error) {
    console.error('Error fixing debts issues:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fix debts issues'
    }, { status: 500 })
  }
}
