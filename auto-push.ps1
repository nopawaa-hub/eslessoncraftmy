param(
    [string]$CommitMessage = "chore: automated build and online sync"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host " [INFO] LessonCraft MY Automated Build & Deploy" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build frontend
Write-Host "[1/3] Building production bundle in ./frontend..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\frontend"
cmd /c npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed! Aborting deploy." -ForegroundColor Red
    exit 1
}

# 2. Return to root and stage changes
Write-Host ""
Write-Host "[2/3] Staging and committing changes..." -ForegroundColor Yellow
Set-Location -Path $PSScriptRoot
git add .
git commit -m "$CommitMessage"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[NOTE] No new git changes to commit or commit returned non-zero. Proceeding to check push..." -ForegroundColor DarkGray
}

# 3. Push to origin main
Write-Host ""
Write-Host "[3/3] Pushing to origin main..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Git push failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[SUCCESS] Changes built and pushed to origin main." -ForegroundColor Green
Write-Host "[NOTE] Live server will complete deployment in 1-2 minutes. Perform a hard refresh (Ctrl + F5) when ready." -ForegroundColor Cyan
Write-Host ""
