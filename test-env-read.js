// Simple script to test reading .env.local file
const fs = require('fs');
const path = require('path');

// Output file for test results
const outputFile = path.join(__dirname, 'test-env-read-result.txt');

// Log function to write to file and console
function log(message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(outputFile, logMessage);
  console.log(logMessage);
}

// Clear the output file
fs.writeFileSync(outputFile, `=== Environment Read Test - ${new Date().toISOString()} ===\n\n`);

log('Starting environment read test...');

// Path to .env.local
const envPath = path.join(__dirname, '.env.local');

// Check if file exists
log(`Checking if ${envPath} exists...`);

if (!fs.existsSync(envPath)) {
  log(`❌ Error: ${envPath} does not exist`);
  process.exit(1);
}

log(`✅ ${envPath} exists`);

// Try to read the file
try {
  log('Reading file content...');
  const content = fs.readFileSync(envPath, 'utf8');
  
  log('File content:', {
    length: content.length,
    first100Chars: content.substring(0, 100) + (content.length > 100 ? '...' : '')
  });
  
  // Log a few lines for verification
  const lines = content.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
  
  log(`Found ${lines.length} non-empty, non-comment lines in .env.local`);
  
  // Log the first few lines
  const linesToShow = Math.min(10, lines.length);
  log(`First ${linesToShow} lines:`);
  
  for (let i = 0; i < linesToShow; i++) {
    const line = lines[i];
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    
    log(`${i + 1}. ${key}=${value ? '***' + (value.length > 10 ? value.substring(0, 10) + '...' : '***') : '(empty)'}`);
  }
  
  log('\n✅ Successfully read .env.local file');
  
} catch (error) {
  log('❌ Error reading .env.local file:', {
    name: error.name,
    message: error.message,
    code: error.code,
    errno: error.errno,
    syscall: error.syscall,
    path: error.path
  });
  
  // Try to get directory listing
  try {
    const files = fs.readdirSync(__dirname);
    log('\nDirectory contents:', {
      files: files.slice(0, 20), // Show first 20 files
      totalFiles: files.length
    });
  } catch (dirError) {
    log('\nFailed to list directory:', {
      name: dirError.name,
      message: dirError.message
    });
  }
  
  process.exit(1);
}
