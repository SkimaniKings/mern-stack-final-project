// Minimal test script to check basic functionality
console.log('Script started at:', new Date().toISOString());

// Simple async test
async function test() {
  console.log('Async test started');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Async test completed');
  return true;
}

// Run the test
test()
  .then(result => {
    console.log('Test result:', result);
    console.log('Script completed at:', new Date().toISOString());
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
