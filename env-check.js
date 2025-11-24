// Simple environment check script
console.log('=== Environment Check ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform, process.arch);
console.log('Current directory:', process.cwd());

// Test file system access
const fs = require('fs');
const path = require('path');

// Create a test file
try {
  const testFile = path.join(__dirname, 'test-env-check.txt');
  fs.writeFileSync(testFile, 'Test file created at ' + new Date().toISOString());
  console.log('✅ Successfully wrote to file system');
  
  // Read it back
  const content = fs.readFileSync(testFile, 'utf8');
  console.log('File content:', content);
  
  // Clean up
  fs.unlinkSync(testFile);
  console.log('✅ Cleaned up test file');
  
} catch (error) {
  console.error('❌ File system error:', error.message);
}

// Test environment variables
console.log('\nEnvironment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set');

console.log('\n=== Test Complete ===');
