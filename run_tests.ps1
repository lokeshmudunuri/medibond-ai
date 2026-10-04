# Powershell script to run GGUF model package tests
# This script ensures correct working directory and runs dart test command

# Get the directory where this script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Change to the script directory (which should be the project root)
Set-Location $scriptDir

Write-Host "Running Dart tests in $scriptDir"
Write-Host "Dart executable: C:\Users\lokes\develop\flutter\bin\dart.bat"

# Run the dart test command
& "C:\Users\lokes\develop\flutter\bin\dart.bat" test

if ($LASTEXITCODE -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
} else {
    Write-Host "Some tests failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}