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

### Implemented (2026-01-16 Backlog)
- [x] Template library for common presentation types
  - 8 built-in templates: Pitch Deck, Lecture, Project Update, Workshop, Technical Overview, Team Intro, Product Launch, Retrospective
  - Template model with categories and theme associations
  - API endpoints: /api/templates, /api/templates/categories
  - TemplateLibrary modal UI with category filtering and preview
- [x] Presentation sharing links (public/private)
  - ShareLink model with password protection and expiry
  - View counting and link revocation
  - API endpoints: /api/share/*
  - ShareModal for creating/managing links
  - SharedViewer for public presentation access
- [x] Multi-language support for AI generation
  - Language parameter in outline and content generation
  - 15 supported languages (Spanish, French, German, Chinese, Japanese, etc.)
  - Language selector in AI Generation Modal
- [x] Mobile responsive editing view
  - Mobile menu toggle for sidebar on small screens
  - Editor/Preview toggle buttons (one panel visible at a time on mobile)
  - Responsive header and spacing adjustments
- [x] Real-time collaborative editing with WebSocket sync
  - CollaborationManager service for real-time sessions
  - WebSocket endpoint: /api/collab/ws/:presentationId
  - Collaborator presence with colored avatars
  - Content sync, cursor, and selection broadcasting
  - CollaborationPanel UI with join dialog and live indicator

### Recently Completed (2026-01-16)
- [x] Custom fonts upload and management
  - Font model with family, weight, style support
  - Font service for upload/delete/list
  - API endpoints: /api/fonts/*
  - FontManager modal UI with upload form
  - Integration with Theme Studio font selector
  - Support for .ttf, .otf, .woff, .woff2 formats
- [x] Presentation analytics (view counts, engagement)
  - PresentationView and DailyAnalytics models
  - Analytics service for tracking views and exports
  - API endpoints: /api/analytics/*
  - AnalyticsPanel with stats cards and daily chart
  - View tracking for shared presentations
  - Export tracking in presentation editor

### Refactoring (2026-01-19)
- [x] Fix backend Dockerfile uv cache permission issue
- [x] Refactor EditorPanel component (1250 lines → ~800 lines)
  - Extracted SlideRewriteModal for AI slide rewriting UI
  - Extracted CommentGeneratorModal for AI comment generation UI
  - Extracted SelectionRewriteModal for text selection rewriting UI
  - Extracted SettingsDrawer for presentation settings panel
- [x] Refactor AIChatPanel component (968 lines → ~750 lines)
  - Extracted ChatMessageBubble for message rendering
  - Extracted ChatInputArea for input controls
- [x] Add Azure Container Apps deployment infrastructure
  - Bicep templates for Container Apps, Key Vault, Storage
  - GitHub Actions workflows for CI/CD
  - azd configuration for quick deployment
- [x] Refactor App.tsx component (919 lines → ~555 lines)
  - Extracted AppSidebar for sidebar with presentations list
  - Extracted AppHeader for header with actions and status

### Backlog
(All backlog items completed!)
