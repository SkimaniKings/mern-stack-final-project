// Simple HTTP request test for Supabase REST API
const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('Starting HTTP request test...');

// Read .env.local file directly
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('Successfully read .env.local file');
} catch (error) {
  console.error('Error reading .env.local file:', error.message);
  process.exit(1);
}

// Parse the required environment variables
function getEnvVar(name) {
  const match = envContent.match(new RegExp(`${name}=([^\s]+)`));
  return match ? match[1] : null;
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or API key in .env.local');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Using API key:', supabaseKey.substring(0, 10) + '...');

// Make a request to the Supabase REST API
const url = new URL('/rest/v1/expenses?select=*&limit=1', supabaseUrl);

console.log('Making request to:', url.toString());

const options = {
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(url, options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      console.log('Response Body:', JSON.parse(data));
    } catch (e) {
      console.log('Response Body (raw):', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

// Set a timeout for the request
req.setTimeout(10000, () => {
  console.error('Request timed out');
  req.destroy();
});

// Send the request
req.end();
