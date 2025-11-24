// Script to fix document bucket policies using direct REST API
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or service role key is missing.');
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  process.exit(1);
}

// Extract project reference from URL
// Example: https://oummldjpaqapqhblwjzq.supabase.co -> oummldjpaqapqhblwjzq
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

// SQL to fix the documents bucket policies
const sql = `
-- First, delete any existing policies for the documents bucket
DELETE FROM storage.policies WHERE bucket_id = 'documents';

-- Create public policies for the documents bucket
-- INSERT policy
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES ('documents_insert_policy', 'true', 'documents', 'INSERT');

-- SELECT policy
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES ('documents_select_policy', 'true', 'documents', 'SELECT');

-- UPDATE policy
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES ('documents_update_policy', 'true', 'documents', 'UPDATE');

-- DELETE policy
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES ('documents_delete_policy', 'true', 'documents', 'DELETE');
`;

// Function to make a REST API call to Supabase
function executeSQL() {
  return new Promise((resolve, reject) => {
    // Prepare the request options
    const options = {
      hostname: `${projectRef}.supabase.co`,
      path: '/rest/v1/rpc/pgexec',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    };

    // Create the request
    const req = https.request(options, (res) => {
      let data = '';

      // Collect response data
      res.on('data', (chunk) => {
        data += chunk;
      });

      // Process the complete response
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (e) {
            // If not JSON, just return the raw data
            resolve(data);
          }
        } else {
          console.error(`HTTP Error: ${res.statusCode}`);
          try {
            const parsedError = JSON.parse(data);
            reject(parsedError);
          } catch (e) {
            reject(new Error(`HTTP Error: ${res.statusCode}, ${data}`));
          }
        }
      });
    });

    // Handle request errors
    req.on('error', (error) => {
      reject(error);
    });

    // Send the request with the SQL payload
    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

// Alternative approach using direct SQL endpoint
function executeSQLAlternative() {
  return new Promise((resolve, reject) => {
    // Prepare the request options for the SQL endpoint
    const options = {
      hostname: `${projectRef}.supabase.co`,
      path: '/rest/v1/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      }
    };

    // Create the request
    const req = https.request(options, (res) => {
      let data = '';

      // Collect response data
      res.on('data', (chunk) => {
        data += chunk;
      });

      // Process the complete response
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (e) {
            // If not JSON, just return the raw data
            resolve(data);
          }
        } else {
          console.error(`HTTP Error: ${res.statusCode}`);
          try {
            const parsedError = JSON.parse(data);
            reject(parsedError);
          } catch (e) {
            reject(new Error(`HTTP Error: ${res.statusCode}, ${data}`));
          }
        }
      });
    });

    // Handle request errors
    req.on('error', (error) => {
      reject(error);
    });

    // Send the request with the SQL payload
    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

// Main function to fix the documents bucket policies
async function fixDocumentsPolicies() {
  console.log('Fixing documents bucket policies...');
  
  try {
    // Try the first method
    const result = await executeSQL();
    console.log('Successfully updated policies via pgexec RPC!');
    return result;
  } catch (error) {
    console.warn('Error executing SQL via pgexec:', error);
    console.log('Trying alternative SQL endpoint...');
    
    try {
      // Try the alternative method
      const altResult = await executeSQLAlternative();
      console.log('Successfully updated policies via SQL endpoint!');
      return altResult;
    } catch (altError) {
      console.error('Error executing SQL via alternative endpoint:', altError);
      
      // If both methods fail, provide instructions for manual execution
      console.log('\n===== MANUAL EXECUTION REQUIRED =====');
      console.log('Please execute the following SQL in your Supabase dashboard:');
      console.log(sql);
      console.log('===================================\n');
      
      throw new Error('Failed to update policies automatically');
    }
  }
}

// Execute the function
fixDocumentsPolicies()
  .then(() => {
    console.log('Documents bucket policies have been fixed!');
    console.log('You should now be able to upload files to the documents bucket.');
  })
  .catch((error) => {
    console.error('Failed to fix documents bucket policies:', error.message);
  });
