# Test script to verify Node.js environment and output
$outputFile = "$PSScriptRoot\test-env-output.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

"=== Environment Test - $timestamp ===`n" | Out-File -FilePath $outputFile

# Basic system info
"`n=== System Info ===" | Out-File -FilePath $outputFile -Append
"Hostname: $env:COMPUTERNAME" | Out-File -FilePath $outputFile -Append
"Username: $env:USERNAME" | Out-File -FilePath $outputFile -Append
"Current Directory: $PWD" | Out-File -FilePath $outputFile -Append

# Node.js info
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    "`n=== Node.js Info ===" | Out-File -FilePath $outputFile -Append
    "Node.js Version: $nodeVersion" | Out-File -FilePath $outputFile -Append
    "npm Version: $npmVersion" | Out-File -FilePath $outputFile -Append
} catch {
    "`nError getting Node.js/npm versions: $_" | Out-File -FilePath $outputFile -Append
}

# Run a simple Node.js test
$testScript = @'
console.log('Test script started at:', new Date().toISOString());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- TEST_VAR:', process.env.TEST_VAR || 'not set');
console.log('Test script completed at:', new Date().toISOString());
'@

$tempFile = [System.IO.Path]::GetTempFileName() + '.js'
$testScript | Out-File -FilePath $tempFile -Encoding utf8

"`n=== Running Test Script ===" | Out-File -FilePath $outputFile -Append
try {
    $env:TEST_VAR = "TestValue"
    $output = node $tempFile 2>&1
    $output | Out-File -FilePath $outputFile -Append
} catch {
    "Error running test script: $_" | Out-File -FilePath $outputFile -Append
} finally {
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -ErrorAction SilentlyContinue
    }
}

# Check file system access
"`n=== File System Test ===" | Out-File -FilePath $outputFile -Append
try {
    $testFile = "$PSScriptRoot\test-write.txt"
    "Test content at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $testFile -Encoding utf8
    if (Test-Path $testFile) {
        "Successfully wrote to: $testFile" | Out-File -FilePath $outputFile -Append
        $content = Get-Content -Path $testFile -Raw
        "File content: $content" | Out-File -FilePath $outputFile -Append
        Remove-Item $testFile -ErrorAction SilentlyContinue
        "Test file cleaned up" | Out-File -FilePath $outputFile -Append
    } else {
        "Failed to write test file" | Out-File -FilePath $outputFile -Append
    }
} catch {
    "File system test failed: $_" | Out-File -FilePath $outputFile -Append
}

# Display the results
"`n=== Test Completed Successfully ===" | Out-File -FilePath $outputFile -Append
"Results saved to: $outputFile" | Out-File -FilePath $outputFile -Append

# Show the contents of the output file
Get-Content -Path $outputFile
