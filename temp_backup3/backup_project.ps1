# Backup Script for Pitchlab-AntiGravity
$projectName = "Pitchlab-AntiGravity"
$backupFile = "$projectName`_Backup.zip"
$excludeList = "node_modules", "build", ".dart_tool", ".git", "dist", "*.zip"

Write-Host "Creating backup for $projectName..."

# Remove old backup if exists
if (Test-Path $backupFile) {
    Remove-Item $backupFile
}

# Compress files using pipeline to filter exclusions
Get-ChildItem -Path . -Exclude $excludeList | Compress-Archive -DestinationPath $backupFile -Force

Write-Host "Backup created: $backupFile"
Write-Host "Copy this file to your new laptop."
