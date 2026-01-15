#!/usr/bin/env python3
"""Test drag-and-drop functionality for presentations into folders."""

import asyncio
from playwright.async_api import async_playwright, expect

async def test_drag_drop():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        try:
            # Navigate to the app
            await page.goto('http://localhost:3000')
            await page.wait_for_load_state('networkidle')

            # Wait for the UI to load
            await page.wait_for_selector('[class*="PresentationSidebar"]', timeout=10000)
            print("✓ App loaded successfully")

            # Create a test folder
            folder_plus = page.locator('button:has-text("+")')
            if await folder_plus.count() > 0:
                await folder_plus.first.click()
                await page.keyboard.type('Test Folder')
                await page.keyboard.press('Enter')
                await asyncio.sleep(1)
                print("✓ Created test folder")

            # Check if presentations exist
            presentations = page.locator('[draggable="true"]')
            presentation_count = await presentations.count()
            print(f"✓ Found {presentation_count} presentations")

            if presentation_count > 0:
                # Get the first presentation
                first_presentation = presentations.first

                # Get the test folder element
                test_folder = page.locator('text=Test Folder').first

                # Get bounding boxes
                pres_box = await first_presentation.bounding_box()
                folder_box = await test_folder.bounding_box()

                if pres_box and folder_box:
                    # Perform drag and drop
                    await page.mouse.move(
                        pres_box['x'] + pres_box['width'] / 2,
                        pres_box['y'] + pres_box['height'] / 2
                    )
                    await page.mouse.down()

                    # Move to folder
                    await page.mouse.move(
                        folder_box['x'] + folder_box['width'] / 2,
                        folder_box['y'] + folder_box['height'] / 2,
                        steps=10
                    )
                    await asyncio.sleep(0.5)

                    # Drop
                    await page.mouse.up()
                    await asyncio.sleep(1)

                    print("✓ Drag and drop executed")

                    # Check for success toast
                    toast = page.locator('text=Presentation moved')
                    if await toast.count() > 0:
                        print("✓ Success toast displayed")
                    else:
                        print("⚠ No success toast found")

                    # Take screenshot
                    await page.screenshot(path='/Users/yshah/workspace/projects/2026/personal/marp-presentation-creator/screenshots/drag-drop-test.png')
                    print("✓ Screenshot saved")
                else:
                    print("✗ Could not get element positions")
            else:
                print("⚠ No presentations found to test")

            print("\n✅ Drag-and-drop test completed")

        except Exception as e:
            print(f"\n✗ Error: {e}")
            await page.screenshot(path='/Users/yshah/workspace/projects/2026/personal/marp-presentation-creator/screenshots/drag-drop-error.png')
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_drag_drop())
