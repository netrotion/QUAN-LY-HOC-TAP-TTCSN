# ==============================================================================
# HaUI Advisor — Database Restore Script for PowerShell (Task 5.1)
# TV5 Platform / DevOps
# Usage: .\restore.ps1 -BackupPath "path/to/backup.sql" [-Force]
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,
    [string]$ContainerName = "haui-db",
    [string]$DbName = "haui_advisor",
    [string]$DbUser = "postgres",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $BackupPath)) {
    Write-Error "[ERROR] Tep sao luu khong ton tai: $BackupPath"
    exit 1
}

if (-not $Force) {
    $Confirmation = Read-Host "[WARNING] Thao tac nay se ghi de du lieu trong database '$DbName'. Tiep tuc? (y/N)"
    if ($Confirmation -notmatch "^[yY]$") {
        Write-Host "[INFO] Huy thao tac khoi phuc." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "[INFO] Dang kiem tra container '$ContainerName'..." -ForegroundColor Cyan
$RunningContainers = docker ps --format '{{.Names}}'
if ($RunningContainers -notcontains $ContainerName) {
    Write-Error "[ERROR] Container '$ContainerName' khong dang chay. Vui long khoi dong ha tang bang docker compose truoc."
    exit 1
}

try {
    Write-Host "[INFO] Dang tien hanh khoi phuc co so du lieu..." -ForegroundColor Cyan
    Get-Content -Path $BackupPath -Raw | docker exec -i $ContainerName psql -U $DbUser -d $DbName
    Write-Host "[SUCCESS] Khoi phuc co so du lieu thanh cong tu $BackupPath!" -ForegroundColor Green
} catch {
    Write-Error "[ERROR] Loi khi khoi phuc co so du lieu: $_"
    exit 1
}
