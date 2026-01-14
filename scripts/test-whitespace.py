#!/usr/bin/env python3
"""Test script to validate whitespace handling in footer and comment fields."""

import time
from playwright.sync_api import sync_playwright, expect

def test_whitespace():
    """Test that footer and comment fields properly handle spaces."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Loading application...")
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(2)

        # Test footer whitespace
        print("\n1. Testing footer whitespace handling...")
        footer_textarea = page.locator('textarea[placeholder*="Footer text"]')

        # Type spaces in footer
        footer_textarea.fill("   test footer   ")
        time.sleep(1)

        # Check if spaces are preserved
        footer_value = footer_textarea.input_value()
        if footer_value == "   test footer   ":
            print("✓ Footer preserves leading and trailing spaces")
        else:
            print(f"✗ Footer spaces not preserved. Expected '   test footer   ', got '{footer_value}'")

        # Test single space
        footer_textarea.fill(" ")
        time.sleep(1)
        footer_value = footer_textarea.input_value()
        if footer_value == " ":
            print("✓ Footer preserves single space")
        else:
            print(f"✗ Footer single space not preserved. Expected ' ', got '{footer_value}'")

        # Test comment whitespace
        print("\n2. Testing comment whitespace handling...")

        # Click "Add comment" button
        add_comment_btn = page.locator('button:has-text("Add comment")').first
        add_comment_btn.click()
        time.sleep(1)

        # Find the comment textarea
        comment_textarea = page.locator('textarea[placeholder*="Add slide comment"]').first

        # Type spaces in comment
        comment_textarea.fill("   test comment   ")
        time.sleep(1)

        # Check if spaces are preserved
        comment_value = comment_textarea.input_value()
        if comment_value == "   test comment   ":
            print("✓ Comment preserves leading and trailing spaces")
        else:
            print(f"✗ Comment spaces not preserved. Expected '   test comment   ', got '{comment_value}'")

        # Test single space
        comment_textarea.fill(" ")
        time.sleep(1)
        comment_value = comment_textarea.input_value()
        if comment_value == " ":
            print("✓ Comment preserves single space")
        else:
            print(f"✗ Comment single space not preserved. Expected ' ', got '{comment_value}'")

        print("\n✓ Whitespace validation complete!")
        browser.close()

if __name__ == "__main__":
    test_whitespace()
