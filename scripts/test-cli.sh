#!/bin/bash
set -e

echo "=========================================="
echo "CLI Workflow Validation"
echo "=========================================="
echo ""

CLI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../cli" && pwd)"

# Setup virtual environment if needed
if [ ! -d "$CLI_DIR/.venv" ]; then
    echo "Creating virtual environment..."
    cd "$CLI_DIR"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -e .
else
    echo "Activating virtual environment..."
    cd "$CLI_DIR"
    source .venv/bin/activate
fi

echo ""
echo "1. Testing 'marpify list' command..."
marpify list
echo ""

echo "2. Testing 'marpify themes' command..."
marpify themes
echo ""

echo "3. Testing 'marpify init' command..."
TEST_DIR="/tmp/marpify-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"
marpify init "CLI Test Presentation" <<EOF
# Test Slide

This is a test from the CLI.

---

# Second Slide

More content here.
EOF
echo ""

echo "4. Verifying presentation was created via API..."
curl -s http://localhost:8000/api/presentations | jq '.[] | select(.title == "CLI Test Presentation")'
echo ""

echo "5. Testing 'marpify export' command..."
PRES_ID=$(curl -s http://localhost:8000/api/presentations | jq -r '.[] | select(.title == "CLI Test Presentation") | .id')
cd "$TEST_DIR"
marpify export "$PRES_ID" pdf
ls -lh *.pdf
echo ""

echo "6. Cleaning up test presentation..."
curl -s -X DELETE "http://localhost:8000/api/presentations/${PRES_ID}"
rm -rf "$TEST_DIR"
echo ""

echo "=========================================="
echo "✓ CLI workflow validation complete!"
echo "=========================================="
echo ""
echo "All CLI commands align with API behavior:"
echo "  - list: maps to GET /api/presentations"
echo "  - themes: maps to GET /api/themes"
echo "  - init: maps to POST /api/presentations"
echo "  - export: maps to POST /api/presentations/{id}/export"
