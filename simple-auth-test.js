// Simple Supabase auth test
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths
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
async function testAuth() {
  try {
    console.log('🔍 Testing Supabase Authentication...');
    console.log('Supabase URL:', supabaseUrl);
    
    // 1. Check current session
    console.log('\n🔍 Checking current session...');
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Current session:', sessionData.session ? 'Active' : 'No active session');
    
    if (sessionData.session) {
      console.log('👤 User ID:', sessionData.session.user.id);
      console.log('📧 Email:', sessionData.session.user.email);
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
    
    // 3. List users (requires service role key)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      console.log('\n👥 Attempting to list users (requires service role key)...');
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      
      try {
        const { data: users, error: usersError } = await adminClient.auth.admin.listUsers();
        
        if (usersError) {
          console.error('❌ Error listing users:', usersError.message);
        } else if (users && users.users) {
          console.log(`✅ Found ${users.users.length} users`);
          if (users.users.length > 0) {
            console.log('   First user:', users.users[0].email);
          }
        }
      } catch (listError) {
        console.error('❌ Error in list users:', listError.message);
      }
    } else {
      console.log('\nℹ️ Service role key not found, skipping admin operations');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testAuth().then(() => {
  console.log('\n✅ Test completed');  
  process.exit(0);
}).catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
