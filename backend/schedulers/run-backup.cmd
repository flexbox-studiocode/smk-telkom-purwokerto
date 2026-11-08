@echo off
REM Wrapper harian backup MySQL + uploads untuk Windows Task Scheduler.
REM Pemakaian: run-backup.cmd [path\node.exe]
REM Semua output ditulis ke backend\logs\backup.log dan exit code diteruskan.
REM Lock anti-izin-ganda ditangani oleh scripts/backup.mjs (.backup.lock).
setlocal enabledelayedexpansion
set "NODE_EXE=%~1"
if "%NODE_EXE%"=="" set "NODE_EXE=node"
set "BACKEND_DIR=%~dp0.."
if not exist "%BACKEND_DIR%\logs" mkdir "%BACKEND_DIR%\logs"
set "LOG=%BACKEND_DIR%\logs\backup.log"

pushd "%BACKEND_DIR%"
if errorlevel 1 (
  echo [%DATE% %TIME%] gagal masuk ke "%BACKEND_DIR%" 1>&2
  exit /b 1
)
echo [%DATE% %TIME%] backup start node="%NODE_EXE%" >> "%LOG%"
"%NODE_EXE%" scripts\backup.mjs >> "%LOG%" 2>&1
set "CODE=!ERRORLEVEL!"
echo [%DATE% %TIME%] backup exit !CODE! >> "%LOG%"
popd
exit /b !CODE!
