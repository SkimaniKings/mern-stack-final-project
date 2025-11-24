// Script to fix the Supabase URL format in .env.local
const fs = require('fs');
const path = require('path');

// Path to .env.local
const envPath = path.join(__dirname, '.env.local');

// Read the current content
try {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if the URL needs to be fixed
  if (envContent.includes('NEXT_PUBLIC_SUPABASE_URL=oummldjpaqapqhblwjzq.supabase.co')) {
    // Fix the URL by adding https://
    envContent = envContent.replace(
      'NEXT_PUBLIC_SUPABASE_URL=oummldjpaqapqhblwjzq.supabase.co',
      'NEXT_PUBLIC_SUPABASE_URL=https://oummldjpaqapqhblwjzq.supabase.co'
    );
    
    // Write the fixed content back to the file
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Fixed Supabase URL in .env.local');
    console.log('Updated URL: https://oummldjpaqapqhblwjzq.supabase.co');
  } else if (envContent.includes('NEXT_PUBLIC_SUPABASE_URL=https://oummldjpaqapqhblwjzq.supabase.co')) {
    console.log('✅ Supabase URL is already correctly formatted');
  } else {
    console.log('⚠️ Could not find Supabase URL in the expected format in .env.local');
    console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL is set to: https://oummldjpaqapqhblwjzq.supabase.co');
  }
} catch (error) {
  console.error('❌ Error updating .env.local:', error.message);
  process.exit(1);
}
