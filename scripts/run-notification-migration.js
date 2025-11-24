// Script to run the notification preferences migration
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get Supabase URL and service key from .env file or environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Path to the migration file
const migrationFile = path.join(__dirname, '..', 'migrations', 'add_notification_preferences_rpc.sql');

// Check if the file exists
if (!fs.existsSync(migrationFile)) {
  console.error(`Error: Migration file not found: ${migrationFile}`);
  process.exit(1);
}

// Read the SQL file
const sql = fs.readFileSync(migrationFile, 'utf8');

// Create a temporary file with the SQL content
const tempFile = path.join(__dirname, 'temp_migration.sql');
fs.writeFileSync(tempFile, sql);

try {
  // Run the migration using curl
  console.log('Running notification preferences migration...');
  
  const command = `curl -X POST "${SUPABASE_URL}/rest/v1/rpc/pgapply" -H "apikey: ${SUPABASE_SERVICE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" -H "Content-Type: application/json" -d @${tempFile.replace(/\\/g, '\\\\')}`;
  
  execSync(command, { stdio: 'inherit' });
  
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Error running migration:', error.message);
} finally {
  // Clean up the temporary file
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
}
