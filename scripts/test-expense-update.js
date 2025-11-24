// Test script to verify expense creation and update
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('Starting test script...');

// Initialize Supabase client with direct connection (bypassing auth)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key in environment variables');
  process.exit(1);
}

console.log('Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple test function to verify database connection
async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // First, test a simple query to the database
    console.log('Executing test query...');
    const result = await supabase
      .from('expenses')
      .select('id')
      .limit(1);
    
    console.log('Database query result:', {
      status: result.status,
      statusText: result.statusText,
      error: result.error,
      data: result.data ? 'Data received' : 'No data'
    });
    
    if (result.error) {
      console.error('Database query error:', {
        message: result.error.message,
        code: result.error.code,
        details: result.error.details,
        hint: result.error.hint
      });
      throw result.error;
    }
    
    console.log('Successfully connected to database');
    return true;
  } catch (error) {
    console.error('Database connection failed:', {
      name: error?.name || 'UnknownError',
      message: error?.message || 'No error message',
      stack: error?.stack || 'No stack trace'
    });
    return false;
  }
}

// Simple test function to add a test expense
async function addTestExpense() {
  try {
    console.log('Adding test expense...');
    const expenseData = {
      amount: 19.99,
      description: 'Test Expense',
      category: 'Test',
      expense_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Use a test user ID or get from environment
      user_id: process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000'
    };
    
    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select();
      
    if (error) throw error;
    
    console.log('Successfully added test expense:', data);
    return data;
  } catch (error) {
    console.error('Error adding test expense:', error);
    throw error;
  }
}

// Main function to run tests
async function runTests() {
  try {
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Cannot connect to the database. Please check your connection settings.');
      return;
    }
    
    // Add a test expense
    await addTestExpense();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();
