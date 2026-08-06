@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Full Measure needs Node.js 22 or newer.
  echo Download the LTS installer from https://nodejs.org/ and run this again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo.
  echo Preparing Full Measure for this computer...
  echo This first run downloads the desktop shell and local media engine.
  echo Later renders do not require an internet connection.
  echo.
  call npm ci
  if errorlevel 1 (
    echo.
    echo Setup did not finish. The error above is the useful part.
    pause
    exit /b 1
  )
)

call npm start
if errorlevel 1 (
  echo.
  echo Full Measure stopped with an error.
  pause
  exit /b 1
)

endlocal
