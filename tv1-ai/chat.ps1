# ==============================================================================
# Script khởi chạy HaUI Advisor Terminal Chat
# Tương tác trực tiếp trên Terminal / PowerShell
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path "$ScriptDir\..").Path

Push-Location $ProjectRoot
try {
    .\mvnw.cmd -pl tv1-ai compile exec:java
} finally {
    Pop-Location
}
