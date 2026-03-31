@echo off
echo Starting Vocaband dev servers...
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop both servers
echo.

start "Vocaband Backend" cmd /k "tsx server.ts"
timeout /t 2 /nobreak > nul
start "Vocaband Frontend" cmd /k "vite"
