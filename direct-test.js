// Direct Supabase connection test
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Get Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Anon Key');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test function
async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // 1. Get session
    console.log('\n🔍 Getting session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error getting session:', sessionError.message);
    } else {
      console.log('✅ Session:', sessionData.session ? 'Active' : 'No active session');
    }
    
    // 2. Get current user
    console.log('\n👤 Getting current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Error getting user:', userError.message);
    } else if (user) {
      console.log('✅ User found:', user.email);
      console.log('   User ID:', user.id);
    } else {
      console.log('ℹ️ No authenticated user');
    }
    
    // 3. Test a simple query
    console.log('\n📊 Testing database query...');
    const { data: expenses, error: queryError } = await supabase
      .from('expenses')
      .select('*')
      .limit(1);
      
    if (queryError) {
      console.error('❌ Query error:', queryError.message);
    } else {
      console.log(`✅ Successfully queried ${expenses.length} expense records`);
      if (expenses.length > 0) {
        console.log('Sample expense:', {
          id: expenses[0].id,
          amount: expenses[0].amount,
          merchant: expenses[0].merchant,
          date: expenses[0].expense_date
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testConnection().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
