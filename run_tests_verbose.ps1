# Run tests with verbose output for debugging
param(
    [string]$testPath = "test"
)

Set-Location "C:\Users\lokes\OneDrive\Documents\medicare ai"

Write-Host "Running Dart tests with verbose output..." -ForegroundColor Green

& "C:\Users\lokes\develop\flutter\bin\dart.bat" test --verbose $testPath

Write-Host "Test execution completed." -ForegroundColor Yellow