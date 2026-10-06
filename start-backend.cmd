@echo off
cd /d "%~dp0backend"
if exist "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" (
  "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
) else (
  call npm run dev
)
pause
