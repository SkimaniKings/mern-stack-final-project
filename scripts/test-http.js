// Simple HTTP test for Supabase connection
const https = require('https');
require('dotenv').config({ path: '.env.local' });

console.log('Starting HTTP test...');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !apiKey) {
  console.error('Missing Supabase URL or API key in environment variables');
  process.exit(1);
}

// Extract the project reference from the URL
const projectRef = supabaseUrl.split('.')[0].replace('https://', '');
const apiUrl = `${supabaseUrl}/rest/v1/expenses?select=*&limit=1`;

console.log('Making request to:', apiUrl);
console.log('Using API key prefix:', apiKey.substring(0, 10) + '...');

const options = {
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
};

console.log('Sending request...');

const req = https.get(apiUrl, options, (res) => {
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

req.end();
