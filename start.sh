#!/usr/bin/env bash
# ==============================================================================
# Start script for Sentosa — The Coffee Unit / QR Ordering System
# ==============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "  Starting Sentosa — The Coffee Unit QR Ordering System"
echo "=========================================================="

# Check if PostgreSQL is running locally
if command -v pg_isready >/dev/null 2>&1; then
  if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running on port 5432. Attempting to start via Homebrew..."
    brew services start postgresql@16 || brew services start postgresql || true
    sleep 2
  fi
fi

# Ensure dependencies are installed
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
  echo "📦 Installing project dependencies..."
  npm install
fi

echo "🚀 Launching Backend API (port 4000) and Frontend (port 5173)..."
echo "   • Customer Menu: http://localhost:5173/menu/sentosa/t/tbl_q7r8s9t0"
echo "   • Kitchen Admin POS: http://localhost:5173/admin"
echo "=========================================================="

npm run dev
