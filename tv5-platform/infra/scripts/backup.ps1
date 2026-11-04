# ==============================================================================
# HaUI Advisor — Database Backup Script for PowerShell (Task 5.1)
# TV5 Platform / DevOps
# Usage: .\backup.ps1 [-OutputDir "path/to/backups"]
# ==============================================================================

[CmdletBinding()]
param (
    [string]$OutputDir = "$PSScriptRoot/../backups",
    [string]$ContainerName = "haui-db",
    [string]$DbName = "haui_advisor",
    [string]$DbUser = "postgres"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $OutputDir "${DbName}_backup_${Timestamp}.sql"

Write-Host "[INFO] Khoi tao sao luu co so du lieu HaUI Advisor..." -ForegroundColor Cyan
Write-Host "[INFO] Container: $ContainerName"
Write-Host "[INFO] Database:  $DbName"
Write-Host "[INFO] Target:    $BackupFile"

# Kiem tra container co dang chay khong
$RunningContainers = docker ps --format '{{.Names}}'
if ($RunningContainers -notcontains $ContainerName) {
    Write-Error "[ERROR] Container '$ContainerName' khong dang chay. Vui long khoi dong ha tang bang docker compose truoc."
    exit 1
}

try {
    # Chay pg_dump qua docker exec
    docker exec -t $ContainerName pg_dump -U $DbUser -d $DbName --clean --if-exists | Out-File -FilePath $BackupFile -Encoding utf8
    if ((Test-Path -Path $BackupFile) -and ((Get-Item $BackupFile).Length -gt 0)) {
        $FileSize = (Get-Item $BackupFile).Length / 1KB
        Write-Host ("[SUCCESS] Sao luu thanh cong! Tep: {0} ({1:N2} KB)" -f $BackupFile, $FileSize) -ForegroundColor Green
    } else {
        Write-Error "[ERROR] Tep sao luu rong hoac xay ra loi trong qua trinh pg_dump."
        exit 1
    }
} catch {
    Write-Error "[ERROR] Loi khi thuc thi sao luu: $_"
    exit 1
}
