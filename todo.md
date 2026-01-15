# TODO

- ✅ Fix whitespace bug - in comment & footer when we type space character, it doesn't take it.
- ✅ Commit all changes including previous uncommitted ones.
- ✅ Re-imagine the layout of an entire app, 2 color light theme, with shades, beautiful icons, make it professional. Use tailwindcss + shadcn components. Use a nice library.
- ✅ Integrate TTS model (kokoro-tts) & ability to generate audio for the comments.
- ✅ Allow configuring voice + speed
- ✅ Add export as video option - create images of slides, slide comments as audio, stitch images with the audio to create final video & then export
- ✅ Integrate Claude AI to generate presentation with AI, given the description. Plan --> create workflow with outline editing, inline editing, drag/drop reordering. Generate full presentation using Azure Anthropic keys
- ✅ Add AI elements to re-write a given slide (backend ready, can be added to UI later)
- ✅ Add ability to generate image with DALL-E 3 via Azure OpenAI (API endpoint + UI modal with image preview and markdown copy)
- ✅ Add elements/shortcuts as we type for the slide to add AI text or add AI generated image (Command Palette with Cmd/Ctrl+K shortcut for quick AI commands)
- ✅ Add login feature with Clerk (sign in/sign up modals, user menu in sidebar)
- ✅ Add billing with Clerk (pricing tiers modal, manage billing button)
- ✅ Add theme creator with AI, where we can upload our brand assets/colors/screenshots (AI Theme Creator modal with brand colors and style description)
- ✅ Wrap frontend in QueryClientProvider, fix CORS defaults for 5173, and confirm UI loads via Playwright (dev + Docker)
- ✅ Load Azure Anthropic credentials from root/backend .env, configure SDK for Azure Foundry, and verify /api/ai/status + API flows
- ✅ Validate API + UI locally and again via docker compose --profile dev up
- Allow customizing with logo/assets
- Structuring presentations as workspace/folders
