@echo off
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     PharmaClinic — Quick Start           ║
echo  ╚══════════════════════════════════════════╝
echo.

echo [1/4] Installing backend dependencies...
cd backend
call npm install
echo.

echo [2/4] Seeding database...
call npm run seed
echo.

echo [3/4] Installing frontend dependencies...
cd ..\frontend
call npm install
echo.

echo [4/4] Starting servers...
echo.
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:5173
echo  Admin:    http://localhost:5173/admin
echo.
echo  Login: admin@pharmyclinic.com / Admin@123456
echo.

start cmd /k "cd ..\backend && npm run dev"
timeout /t 3 /nobreak > nul
start cmd /k "cd .\frontend && npm run dev"

echo  Both servers starting...
pause
