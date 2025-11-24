// Simple HTTP test for Supabase REST API
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or API key');
  process.exit(1);
}

// Parse the URL
let url;
try {
  url = new URL(supabaseUrl);
} catch (error) {
  console.error('❌ Invalid Supabase URL:', error.message);
  process.exit(1);
}

// Set up request options
const options = {
  hostname: url.hostname,
  port: 443,
  path: '/rest/v1/expenses?select=*&limit=1',
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  },
  rejectUnauthorized: false // For testing only
};

console.log('Making request to:', `https://${options.hostname}${options.path}`);

// Make the request
const req = https.request(options, (res) => {
  console.log('\nResponse received');
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('\nRequest error:', error);
});

req.on('timeout', () => {
  console.error('\nRequest timed out');
  req.destroy();
});

// Set a timeout for the entire request
req.setTimeout(10000, () => {
  console.error('\nRequest timeout');
  req.destroy();
});

// Send the request
console.log('Sending request...');
req.end();
