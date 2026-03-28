#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     PharmaClinic — Quick Start           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
  echo "⚠️  MongoDB is not running. Starting..."
  if command -v brew &> /dev/null; then
    brew services start mongodb-community 2>/dev/null || mongod --fork --logpath /tmp/mongod.log
  else
    sudo systemctl start mongod 2>/dev/null || mongod --fork --logpath /tmp/mongod.log
  fi
  sleep 2
fi

echo "✅ MongoDB check done"
echo ""

# Backend
echo "[1/4] Installing backend dependencies..."
cd backend
npm install
echo ""

echo "[2/4] Seeding database..."
npm run seed
echo ""

# Frontend
echo "[3/4] Installing frontend dependencies..."
cd ../frontend
npm install
echo ""

echo "[4/4] Starting both servers..."
echo ""
echo "  Backend:  http://localhost:5000"
echo "  Frontend: http://localhost:5173"
echo "  Admin:    http://localhost:5173/admin"
echo ""
echo "  Login: admin@pharmyclinic.com / Admin@123456"
echo ""

# Start backend in background
cd ../backend
npm run dev &
BACKEND_PID=$!

sleep 2

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "  Press Ctrl+C to stop both servers"
echo ""

# Wait and cleanup
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'Servers stopped.'; exit 0" INT TERM
wait
