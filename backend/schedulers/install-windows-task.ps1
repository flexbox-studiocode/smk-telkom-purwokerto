# Mendaftarkan/ menghapus Task Scheduler harian backup (Windows).
# Jalankan dari PowerShell. Tidak perlu hak admin untuk task per-user biasa.
#
# Contoh:
#   powershell -ExecutionPolicy Bypass -File schedulers\install-windows-task.ps1
#   powershell -ExecutionPolicy Bypass -File schedulers\install-windows-task.ps1 -TaskName "SMK-Backup-Test" -Time "02:00"
#   powershell -ExecutionPolicy Bypass -File schedulers\install-windows-task.ps1 -Unregister
param(
  [string]$TaskName = 'SMK-Telkom-Backup-Daily',
  [string]$NodeExe = '',
  [string]$BackendDir = '',
  [string]$Time = '02:00',
  [switch]$Unregister,
  [switch]$RunNow
)

$ErrorActionPreference = 'Stop'

if ($Unregister) {
  schtasks /Delete /TN $TaskName /F | Out-Null
  Write-Host "Task '$TaskName' dihapus."
  exit 0
}

if (-not $BackendDir) { $BackendDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path }
if (-not $NodeExe) { $NodeExe = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path $NodeExe)) { throw "Node executable tidak ditemukan: $NodeExe" }
if (-not (Test-Path (Join-Path $BackendDir 'scripts\backup.mjs'))) { throw "Backend dir tidak valid (scripts\backup.mjs hilang): $BackendDir" }

$templatePath = Join-Path $PSScriptRoot 'windows-backup-daily.xml'
$template = Get-Content $templatePath -Raw
$xml = $template.
  Replace('__CMD_EXE__', $env:ComSpec).
  Replace('__NODE_EXE__', $NodeExe).
  Replace('__BACKEND_DIR__', $BackendDir).
  Replace('__TIME__', $Time)

$tmp = Join-Path $env:TEMP ("smk-backup-task-" + [guid]::NewGuid().ToString('N') + ".xml")
Set-Content -Path $tmp -Value $xml -Encoding Unicode

try {
  schtasks /Create /TN $TaskName /XML $tmp /F
  if ($LASTEXITCODE -ne 0) { throw "schtasks /Create gagal (exit $LASTEXITCODE)." }
  Write-Host "Task '$TaskName' terdaftar (Time=$Time, Node=$NodeExe, Backend=$BackendDir)."
  if ($RunNow) {
    schtasks /Run /TN $TaskName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "schtasks /Run gagal (exit $LASTEXITCODE)." }
    Write-Host "Task dijalankan sekarang. Cek backend\logs\backup.log."
  }
} finally {
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}
