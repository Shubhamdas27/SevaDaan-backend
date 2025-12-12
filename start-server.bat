@echo off
echo Starting SevaDaan NGO Backend Server...
echo.

REM Change to the Backend directory
cd /d "D:\Project\Backend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Check if dist folder exists, if not build the project
if not exist "dist" (
    echo Building TypeScript project...
    npm run build
    echo.
)

REM Start the server
echo Starting server...
echo Working directory: %CD%
node dist/server.js

pause
