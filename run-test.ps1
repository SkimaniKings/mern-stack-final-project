# PowerShell script to run test and capture output
$ErrorActionPreference = "Stop"

# Get the current timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = "test-output-$timestamp.txt"

Write-Host "Running test and saving output to $outputFile..."

# Run the test and capture all output
try {
    # Run the test script and redirect all output streams
    $output = node .\test-node.js 2>&1
    
    # Save the output to a file
    $output | Out-File -FilePath $outputFile -Encoding utf8
    
    # Also display the output
    Write-Host "=== Test Output ==="
    $output
    Write-Host "==================="
    
    # Check if the output file was created
    if (Test-Path $outputFile) {
        $fileInfo = Get-Item $outputFile
        Write-Host "Output saved to: $($fileInfo.FullName)"
        Write-Host "File size: $($fileInfo.Length) bytes"
        
        # Display the first 10 lines of the output file
        Write-Host "`nFirst 10 lines of output:"
        Get-Content $outputFile -TotalCount 10 | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Host "Warning: Output file was not created"
    }
    
} catch {
    Write-Host "Error running test: $_"
    Write-Host $_.ScriptStackTrace
    exit 1
}
