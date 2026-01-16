# TODO

## Completed (2026-01-15)

✅ Upgraded to Tailwind CSS v4
  - Installed @tailwindcss/postcss v4.1.18 and @tailwindcss/cli v4.1.18
  - Migrated from tailwind.config.js to @theme inline directive in index.css
  - Updated PostCSS configuration to use @tailwindcss/postcss
  - Configured Aceternity UI component registry in components.json

✅ Fixed Tailwind CSS v4 @layer base error
  - Removed @layer base directive causing conflict with @import "tailwindcss"
  - Styles now work correctly with Tailwind v4

✅ Migrated to Aceternity UI Components
  - Installed Aceternity UI components (sidebar, floating-dock, animated-modal, file-upload, spotlight, background-gradient, tabs, bento-grid, card-hover-effect, text-generate-effect, glowing-effect)
  - Created collapsible presentations sidebar using motion/react animations
  - Added smooth spring animations for sidebar open/close
  - Redesigned layout with Editor and Preview as main columns

✅ Fixed Asset Manager and Uploads
  - Fixed Asset interface to use size_bytes matching backend
  - Constructed full URLs using API_BASE_URL
  - Integrated Aceternity file-upload component

✅ AI Features
  - AI inline magic button for slide content rewriting with length control (short/medium/long)
  - AI button in comments to regenerate narrations
  - Regenerate All Comments feature with context awareness
  - Magic image generation icons on each slide
  - Sample audio preview for voice selection

✅ Reload Reliability
  - AI generation modal state persists in localStorage
  - State restored on page reload with indicator banner

✅ AI Content Quality
  - Fixed NARRATION prefix in generated comments
  - Fixed generic "# Slide X" headers
  - Comments now directly explain slide content
  - Comments are cohesive with previous/next slides
  - Added intro/outro slides with natural commentary

✅ UI Improvements
  - Collapsible sidebar for presentations list
  - Insert slides between existing slides with + button
  - Buttons wrap properly (no overflow)
  - Minimal 2-color theme with shades (no gradients)
  - Consistent color scheme across all components

✅ Theme Color Extraction from Screenshots
  - Added backend endpoint `/api/themes/extract-colors` using Claude Vision
  - Created `ColorExtractionService` to analyze images and extract color palettes
  - Updated `ThemeCreatorModal` with image upload/drag-drop zone
  - AI extracts dominant colors with descriptive names from uploaded screenshots
  - Extracted colors pre-fill the theme color inputs for easy tweaking

✅ Video Persistence
  - Added `/api/video/list` endpoint to browse all exported videos
  - Added `/api/video/{id}/exists` endpoint to check video existence
  - Updated `VideoExportButton` to show download icon if video exists
  - Re-export button available alongside download for regeneration

✅ Audio Generation Persistence (Content-Hash Based)
  - Added `/api/tts/{presentation_id}/audio` endpoint to list all audio files
  - Added content-hash based audio system for stable mappings across slide reordering
  - New endpoints: `/api/tts/{id}/audio/hash/{hash}` for hash-based lookup
  - New endpoint: `/api/tts/{id}/audio/generate` with content_hash parameter
  - Added HEAD support for checking audio existence (fixes 405 errors)
  - Created SlideAudio and VideoExport DB models for reliable persistence
  - Added cleanup endpoints for orphaned audio files
  - Frontend computes SHA-256 content hash matching backend

✅ Folder Layout Improvements
  - Added sorting for presentations (Newest/Oldest/A-Z) with cycle button
  - Presentations now default to "newest first" order
  - Sort indicator shows current sort order

## Remaining TODOs

- None! All tasks completed.
