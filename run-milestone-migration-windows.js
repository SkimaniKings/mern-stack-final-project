// Windows-compatible script to run the milestone migration
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Path to the migration file
const migrationFilePath = path.join(__dirname, 'migrations', 'add_target_date_to_milestones.sql');

// Check if the migration file exists
if (!fs.existsSync(migrationFilePath)) {
  console.error(`Error: Migration file not found at ${migrationFilePath}`);
  process.exit(1);
}

// Read the migration file
const migrationSQL = fs.readFileSync(migrationFilePath, 'utf8');

// Create a temporary file with the PowerShell command
const tempFilePath = path.join(__dirname, 'temp_migration.ps1');
const powershellCommand = `
$headers = @{
    "apikey" = "${SUPABASE_SERVICE_KEY}"
    "Authorization" = "Bearer ${SUPABASE_SERVICE_KEY}"
    "Content-Type" = "application/json"
}

$body = @{
    query = ${JSON.stringify(migrationSQL)}
} | ConvertTo-Json

Invoke-RestMethod -Uri "${SUPABASE_URL}/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
`;

fs.writeFileSync(tempFilePath, powershellCommand);

try {
  console.log('Running milestone migration...');
  execSync(`powershell -ExecutionPolicy Bypass -File ${tempFilePath}`, { stdio: 'inherit' });
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Error running migration:', error.message);
} finally {
  // Clean up the temporary file
  fs.unlinkSync(tempFilePath);
}

console.log('You can now restart your application to use the target_date column in milestones.');
