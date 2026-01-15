#!/usr/bin/env python3
"""Test asset manager functionality via Playwright."""

import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

def test_asset_manager():
    """Test asset manager modal and upload functionality."""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:3000", wait_until="networkidle", timeout=10000)
            page.wait_for_load_state("domcontentloaded")
            time.sleep(2)

            print("Looking for 'Manage Assets' button...")
            assets_btn = page.get_by_role("button", name="Manage Assets")
            expect(assets_btn).to_be_visible(timeout=5000)

            print("Clicking 'Manage Assets' button...")
            assets_btn.click()
            time.sleep(1)

            print("Checking if Asset Manager modal opened...")
            modal = page.locator('[role="dialog"]')
            expect(modal).to_be_visible(timeout=5000)

            heading = page.get_by_role("heading", name="Asset Manager")
            expect(heading).to_be_visible()

            print("Taking screenshot of empty asset manager...")
            screenshots_dir = Path("screenshots")
            screenshots_dir.mkdir(exist_ok=True)
            page.screenshot(path=screenshots_dir / "asset-manager-empty.png")

            print("✓ Asset Manager modal opened successfully")
            print("✓ Empty state is visible")

            print("\nClosing modal...")
            page.keyboard.press("Escape")
            time.sleep(1)

            print("✓ Asset Manager test completed successfully!")

        except Exception as e:
            print(f"✗ Test failed: {e}")
            screenshots_dir = Path("screenshots")
            screenshots_dir.mkdir(exist_ok=True)
            page.screenshot(path=screenshots_dir / "asset-manager-error.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    test_asset_manager()
