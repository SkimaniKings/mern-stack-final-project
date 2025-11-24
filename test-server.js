// Simple HTTP server to display test results
import http from 'http';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain');
  
  // Test Supabase connection
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase URL or Anon Key');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get session
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Format response
    const response = {
      status: 'success',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd(),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? '*** URL set' : 'Not set',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey ? '*** Key set' : 'Not set'
        }
      },
      supabase: {
        session: sessionData.session ? 'Active' : 'No active session',
        user: user ? {
          id: user.id,
          email: user.email,
          lastSignIn: user.last_sign_in_at
        } : 'No authenticated user',
        error: userError?.message || null
      }
    };
    
    res.statusCode = 200;
    res.end(JSON.stringify(response, null, 2));
    
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      status: 'error',
      message: error.message,
      stack: error.stack
    }, null, 2));
  }
});

// Start server
const PORT = 3001;
server.listen(PORT, 'localhost', () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log('Open this URL in your browser to see the test results');
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
