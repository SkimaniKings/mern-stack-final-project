// Test script for Supabase authentication
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Test authentication flow
async function testAuth() {
  try {
    console.log('Starting authentication test...');
    
    // 1. Sign out any existing session
    console.log('Signing out any existing session...');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    
    // 2. Check current session (should be null)
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    if (session.session) {
      console.log('❌ Failed to sign out existing session');
      return;
    }
    
    console.log('✅ Successfully signed out');
    
    // 3. Try to sign in with email and password
    console.log('\nTesting sign in with email and password...');
    const testEmail = 'test@example.com'; // Replace with a test user email
    const testPassword = 'testpassword';  // Replace with the test user's password
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      
      // If user not found, try to sign up first
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('User not found, attempting to sign up...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
        });
        
        if (signUpError) {
          console.error('❌ Sign up failed:', signUpError.message);
          return;
        }
        
        console.log('✅ Successfully signed up. Please check your email to confirm your account.');
        console.log('Please run this test again after confirming your email.');
        return;
      }
      
      return;
    }
    
    console.log('✅ Successfully signed in:', signInData);
    
    // 4. Get user data
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    console.log('\nUser data:', {
      id: user.id,
      email: user.email,
      confirmed: user.confirmed_at ? 'Yes' : 'No',
      lastSignIn: user.last_sign_in_at
    });
    
    // 5. Test protected API endpoint
    console.log('\nTesting protected API endpoint...');
    const response = await fetch('/api/auth/user', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('✅ Successfully accessed protected endpoint:', userData);
    } else {
      console.error('❌ Failed to access protected endpoint:', await response.text());
    }
    
    // 6. Sign out
    console.log('\nSigning out...');
    const { error: signOutError2 } = await supabase.auth.signOut();
    if (signOutError2) throw signOutError2;
    
    console.log('✅ Successfully signed out');
    
  } catch (error) {
    console.error('❌ Authentication test failed:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the test
testAuth().then(() => {
  console.log('\nTest completed.');
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
