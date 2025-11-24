// Simple script to test environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Environment variables test');
console.log('=========================');

// Log important environment variables
const envVars = [
  'NODE_ENV',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL'
];

envVars.forEach(varName => {
  console.log(`${varName}: ${process.env[varName] ? '***' + process.env[varName].substring(0, 5) + '...' : 'Not set'}`);
});

// Test if .env file exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
console.log('\n.env.local exists:', fs.existsSync(envPath));

// Test if we can read the file
if (fs.existsSync(envPath)) {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('\n.env.local content (first 200 chars):');
    console.log('-----------------------------------');
    console.log(content.substring(0, 200) + (content.length > 200 ? '...' : ''));
    console.log('-----------------------------------');
  } catch (error) {
    console.error('Error reading .env.local:', error.message);
  }
}

console.log('\nTest completed.');
