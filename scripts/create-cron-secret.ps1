# Create CRON_SECRET in Google Cloud Secret Manager
# Prerequisites:
#   1. gcloud auth login   (opens browser - sign in with your Google account)
#   2. gcloud config set project gen-lang-client-0322888127
# Usage: .\scripts\create-cron-secret.ps1

$ErrorActionPreference = "Stop"
$project = "gen-lang-client-0322888127"
$secretName = "CRON_SECRET"
$secretValue = "subhub-cron-2026-secret"

# Use gcloud from PATH or common install location
$gcloudPath = if (Get-Command gcloud -ErrorAction SilentlyContinue) { "gcloud" }
else { "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" }

# Check authentication
$authCheck = & $gcloudPath auth list --format="value(account)" 2>&1
if (-not $authCheck -or $authCheck -match "No credentialed") {
    Write-Host "ERROR: Not authenticated. Run this first:" -ForegroundColor Red
    Write-Host "  gcloud auth login" -ForegroundColor Yellow
    Write-Host "  (A browser will open - sign in with your Google account)" -ForegroundColor Gray
    exit 1
}

Write-Host "Creating secret $secretName in project $project..."

# Write secret value without trailing newline
$tempFile = [System.IO.Path]::GetTempFileName()
try {
    [System.IO.File]::WriteAllText($tempFile, $secretValue)

    # Try create first (fails if secret exists)
    & $gcloudPath secrets create $secretName --data-file=$tempFile --project=$project 2>&1
    if ($LASTEXITCODE -ne 0) {
        # Secret may already exist - add new version
        Write-Host "Secret may already exist. Adding new version..."
        & $gcloudPath secrets versions add $secretName --data-file=$tempFile --project=$project 2>&1
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Success: CRON_SECRET created/updated in Secret Manager."
    } else {
        exit $LASTEXITCODE
    }
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}
