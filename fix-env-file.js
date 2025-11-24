// Script to fix the .env.local file
const fs = require('fs');
const path = require('path');

// Path to .env.local
const envPath = path.join(__dirname, '.env.local');

// Read the current content
try {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('Current .env.local content:');
  console.log('---------------------------');
  console.log(envContent);
  console.log('---------------------------');
  
  // Fix the Supabase URL if needed
  if (envContent.includes('NEXT_PUBLIC_SUPABASE_URL=oummldjpaqapqhblwjzq.supabase.co')) {
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
  
  // Check for any other potential issues
  const lines = envContent.split('\n');
  const issues = [];
  
  lines.forEach((line, index) => {
    if (line.startsWith('#') || !line.trim()) return; // Skip comments and empty lines
    
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    
    if (!key || !value) {
      issues.push(`Line ${index + 1}: Invalid format (missing key or value)`);
    }
    
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !value.startsWith('http')) {
      issues.push(`Line ${index + 1}: Supabase URL should start with https://`);
    }
  });
  
  if (issues.length > 0) {
    console.log('\n⚠️ Potential issues found in .env.local:');
    issues.forEach(issue => console.log(`- ${issue}`));
  } else {
    console.log('\n✅ No issues found in .env.local');
  }
  
} catch (error) {
  console.error('❌ Error processing .env.local:', error.message);
  process.exit(1);
}
