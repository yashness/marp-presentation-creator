#!/usr/bin/env python3
"""Test presentation generation flow."""
import requests
import json
import sys

API_BASE = "http://localhost:8000/api"

def test_presentation_generation():
    """Test the full presentation generation flow."""
    print("Step 1: Generate outline...")
    outline_response = requests.post(
        f"{API_BASE}/ai/generate-outline",
        json={
            "description": "Quick intro to Python lists",
            "slide_count": 3,
            "theme": "default"
        }
    )

    if outline_response.status_code != 200:
        print(f"❌ Outline generation failed: {outline_response.status_code}")
        print(outline_response.text)
        return False

    response_data = outline_response.json()
    outline_data = response_data["outline"]
    print(f"✅ Outline generated: {outline_data['title']}")

    print("\nStep 2: Generate full presentation...")
    content_response = requests.post(
        f"{API_BASE}/ai/generate-content",
        json={
            "outline": outline_data,
            "theme": "default"
        }
    )

    if content_response.status_code != 200:
        print(f"❌ Content generation failed: {content_response.status_code}")
        print(content_response.text)
        return False

    content_data = content_response.json()
    print(f"✅ Presentation generated successfully!")
    print(f"Content length: {len(content_data['content'])} chars")

    # Check if content has comments
    if "<!--" in content_data['content']:
        print("✅ Narration comments found in content")
    else:
        print("⚠️  No narration comments found in content")

    return True

if __name__ == "__main__":
    success = test_presentation_generation()
    sys.exit(0 if success else 1)
