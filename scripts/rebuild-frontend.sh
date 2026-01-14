#!/bin/bash
set -e

echo "Rebuilding frontend container..."
docker compose build frontend

echo "Stopping existing containers..."
docker compose down

echo "Starting containers..."
docker compose up -d

echo "Waiting for containers to be healthy..."
sleep 10

echo "Checking container status..."
docker compose ps

echo "Checking frontend logs..."
docker compose logs frontend --tail=50

echo "Checking backend logs..."
docker compose logs backend --tail=50

echo ""
echo "Frontend should be available at: http://localhost:3000"
echo "Backend should be available at: http://localhost:8000"
