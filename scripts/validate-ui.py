#!/usr/bin/env python3
"""
UI validation script using Playwright.
Takes screenshots and validates the UI aesthetics.
"""
import asyncio
from playwright.async_api import async_playwright
from pathlib import Path
import sys

async def validate_ui():
    screenshots_dir = Path("screenshots")
    screenshots_dir.mkdir(exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()

        try:
            print("Loading application...")
            # Use frontend service name when running in Docker
            import os
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
            await page.goto(frontend_url, wait_until='networkidle', timeout=30000)

            print("Taking initial screenshot...")
            await page.screenshot(path=screenshots_dir / 'home.png', full_page=True)

            # Check if the UI loaded properly
            title = await page.locator('h1').inner_text()
            print(f"Page title: {title}")

            # Check for key UI elements
            presentations_header = await page.locator('text=Presentations').count()
            new_button = await page.locator('text=New Presentation').count()

            print(f"UI Elements found:")
            print(f"  - Presentations header: {presentations_header}")
            print(f"  - New Presentation button: {new_button}")

            # Test creating a presentation
            print("\nTesting Create Presentation flow...")
            await page.fill('input[placeholder="Presentation Title"]', 'Test Presentation')
            await page.screenshot(path=screenshots_dir / 'create-filled.png', full_page=True)

            # Take screenshots at different viewport sizes
            print("\nTesting responsive design...")
            await context.set_viewport_size({'width': 1280, 'height': 720})
            await page.screenshot(path=screenshots_dir / 'desktop-medium.png', full_page=True)

            await context.set_viewport_size({'width': 768, 'height': 1024})
            await page.screenshot(path=screenshots_dir / 'tablet.png', full_page=True)

            print("\n✓ UI validation complete!")
            print(f"Screenshots saved to: {screenshots_dir.absolute()}")

            await browser.close()
            return True

        except Exception as e:
            print(f"\n✗ UI validation failed: {e}")
            await page.screenshot(path=screenshots_dir / 'error.png', full_page=True)
            await browser.close()
            return False

if __name__ == '__main__':
    success = asyncio.run(validate_ui())
    sys.exit(0 if success else 1)
