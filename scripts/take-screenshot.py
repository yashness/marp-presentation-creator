#!/usr/bin/env python3
"""Take a screenshot of the application."""

import time
from playwright.sync_api import sync_playwright

def take_screenshot():
    """Take screenshot of the application."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        print("Loading application...")
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(3)

        print("Taking screenshot...")
        page.screenshot(path="screenshots/redesigned-ui.png", full_page=False)
        print("Screenshot saved to screenshots/redesigned-ui.png")

        browser.close()

if __name__ == "__main__":
    take_screenshot()
