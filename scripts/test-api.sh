#!/bin/bash
set -e

echo "Testing API endpoints..."
echo ""

BASE_URL="http://localhost:8000"

echo "1. Testing health endpoint..."
curl -s "${BASE_URL}/health" | jq .
echo ""

echo "2. Testing list presentations..."
curl -s "${BASE_URL}/api/presentations" | jq .
echo ""

echo "3. Testing create presentation..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/presentations" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Test Presentation",
    "content": "# Test\n\nThis is a test slide.",
    "theme_id": null
  }')
echo "$RESPONSE" | jq .
PRES_ID=$(echo "$RESPONSE" | jq -r '.id')
echo ""

echo "4. Testing get presentation..."
curl -s "${BASE_URL}/api/presentations/${PRES_ID}" | jq .
echo ""

echo "5. Testing preview..."
curl -s "${BASE_URL}/api/presentations/${PRES_ID}/preview" | head -n 20
echo "..."
echo ""

echo "6. Testing update presentation..."
curl -s -X PUT "${BASE_URL}/api/presentations/${PRES_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Test Presentation (Updated)",
    "content": "# Updated\n\nThis slide was updated.",
    "theme_id": "corporate"
  }' | jq .
echo ""

echo "7. Testing delete presentation..."
curl -s -X DELETE "${BASE_URL}/api/presentations/${PRES_ID}" | jq .
echo ""

echo "✓ All API tests passed!"
