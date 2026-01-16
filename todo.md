## TODOs

### Completed
- [x] Add toasts for various actions (toast context provider, notifications on AI operations)
- [x] Organize toolbar buttons (AIActionsMenu dropdown, SlideActionsMenu for per-slide operations)
- [x] Add diagram layouts (flow-horizontal, flow-vertical, hierarchy, cycle, pyramid, stat-cards)
- [x] Fix split operation to preserve diagram HTML structures
- [x] Implement video generation polling with cancel ability (async export, progress tracking, cancellation)
- [x] Fix duplicate/delete buttons in presentation sidebar (z-index overlay conflict)
- [x] Fix video export to use selected Marp theme and layout styles
- [x] Add header stuck to top and footer stuck to bottom CSS styles in all themes
- [x] Verify transform command works (rearrange, restyle, rewrite for topic)
- [x] Improve Theme Studio UI with labeled color fields, descriptions, and color swatches
- [x] Add ability to edit existing themes via Theme Studio dropdown
- [x] Reset AI Theme Creator form (including screenshot) when opening fresh

### Recently Completed
- [x] Allow rewriting selected text only (Monaco editor selection tracking, API endpoint)
- [x] Fix asset manager upload for multiple files (enable multi-file selection in FileUpload)
- [x] Add tests for AI rewrite-selected-text endpoint
- [x] Add tests for asset manager API endpoints
- [x] Allow uploading/pasting additional content/docs/links as context (AI Chat context buttons)
- [x] Implement chat-like UI for incremental AI generation (AI Chat panel with streaming)
- [x] Add SSE endpoint for streaming slide creation (/api/chat/stream)
- [x] Add thinking output display in chat UI (Reasoning toggle button)
- [x] Add chat history persistence (localStorage with MAX_HISTORY limit)
- [x] Context-aware quick actions in AI Chat (mode-specific suggestions)
- [x] Add Theme mode in AI Chat for generating themes via conversation
- [x] Add "Replace slide", "Insert slide", "New presentation" actions in chat responses
- [x] Export button loading states (spinner while exporting, success checkmark)
- [x] AI Theme Creator shows all 10 color properties with live preview

### Recently Implemented (2026-01-16)
- [x] Integrate Claude Agent SDK v2 for agentic workflows
  - Created PresentationAgent with tool-use capabilities
  - Added tools: create_slide, update_slide, delete_slide, reorder_slides, apply_theme, generate_image, search_presentation, get_presentation_info
  - Streaming and non-streaming API endpoints (/api/agent/run, /api/agent/stream)
  - Automatic tool execution with conversation context
- [x] Add multi-turn conversation memory in chat (beyond current session)
  - Database models: ChatConversation, ChatMessage
  - Service layer for conversation persistence
  - API endpoints: /api/conversations/*
- [x] Add drag-drop support for context files in chat
  - Drag-drop overlay with visual feedback
  - Support for files, URLs, and text
  - Automatic URL scraping when dropping links
- [x] Add URL scraping for link context
  - URL scraper service with content extraction
  - OpenGraph metadata extraction
  - API endpoint: POST /api/scraper
- [x] Add presentation versioning/checkpointing for undo
  - PresentationVersion model with checkpoint naming
  - Version service with restore capability
  - API endpoints: /api/versions/*
  - Version history panel UI
- [x] Add undo/redo support with keyboard shortcuts
  - useUndoRedo hook with debounced history
  - Cmd/Ctrl+Z for undo, Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y for redo
  - useVersioning hook for checkpoint management

### Backlog
- [ ] Real-time collaborative editing with WebSocket sync
- [ ] Template library for common presentation types
- [ ] Presentation sharing links (public/private)
- [ ] Multi-language support for AI generation
- [ ] Mobile responsive editing view
