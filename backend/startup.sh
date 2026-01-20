#!/bin/bash
set -e

echo "=== Installing Node.js and Marp CLI ==="

# Check if npm/node is available
if ! command -v node &> /dev/null; then
    echo "Node.js not found, installing via apt..."
    apt-get update && apt-get install -y nodejs npm
fi

# Install Marp CLI globally
if ! command -v marp &> /dev/null; then
    echo "Installing Marp CLI..."
    npm install -g @marp-team/marp-cli
fi

echo "Node version: $(node --version || echo 'not installed')"
echo "NPM version: $(npm --version || echo 'not installed')"
echo "Marp CLI: $(which marp || echo 'not found')"

# Start the application
echo "=== Starting Gunicorn ==="
cd /home/site/wwwroot
gunicorn --bind=0.0.0.0:8000 --timeout 600 -k uvicorn.workers.UvicornWorker app.main:app
