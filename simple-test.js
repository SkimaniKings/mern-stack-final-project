// Simple test script to verify Node.js execution
const fs = require('fs');
const path = require('path');

// Create a test output file
const outputPath = path.join(__dirname, 'test-output.txt');
const timestamp = new Date().toISOString();

// Test writing to a file
try {
  fs.writeFileSync(outputPath, `Test file created at: ${timestamp}\n`);
  fs.appendFileSync(outputPath, `Node.js version: ${process.version}\n`);
  fs.appendFileSync(outputPath, `Platform: ${process.platform} ${process.arch}\n`);
  
  // Test environment variables
  fs.appendFileSync(outputPath, '\nEnvironment Variables:\n');
  fs.appendFileSync(outputPath, `NODE_ENV: ${process.env.NODE_ENV || 'not set'}\n`);
  fs.appendFileSync(outputPath, `SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set'}\n`);
  
  // List files in current directory
  fs.appendFileSync(outputPath, '\nFiles in current directory:\n');
  const files = fs.readdirSync('.');
  files.forEach(file => {
    fs.appendFileSync(outputPath, `- ${file}\n`);
  });
  
  console.log(`✅ Test completed. Check ${outputPath} for results.`);
} catch (error) {
  console.error('❌ Error running test:', error.message);
}
