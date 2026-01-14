#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Full Stack Validation"
echo "=========================================="
echo ""

# Make scripts executable
chmod +x "$SCRIPT_DIR/rebuild-frontend.sh"
chmod +x "$SCRIPT_DIR/test-api.sh"
chmod +x "$SCRIPT_DIR/validate-ui.py"

# Step 1: Rebuild and start containers
echo "Step 1: Rebuilding and starting containers..."
bash "$SCRIPT_DIR/rebuild-frontend.sh"
echo ""

# Wait for services to be ready
echo "Waiting for services to stabilize..."
sleep 5
echo ""

# Step 2: Test API endpoints
echo "Step 2: Testing API endpoints..."
bash "$SCRIPT_DIR/test-api.sh"
echo ""

# Step 3: Validate UI with Playwright
echo "Step 3: Validating UI with Playwright..."
cd "$SCRIPT_DIR/.."
python3 -m pip install -q playwright
python3 -m playwright install chromium
python3 "$SCRIPT_DIR/validate-ui.py"
echo ""

echo "=========================================="
echo "✓ Full validation complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review screenshots in ./screenshots/"
echo "2. Check Docker logs: docker compose logs"
echo "3. Access frontend: http://localhost:3000"
echo "4. Access backend: http://localhost:8000"
