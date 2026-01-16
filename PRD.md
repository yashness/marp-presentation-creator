# Product Requirements Document

## Product Vision

Create a modern, user-friendly presentation builder that combines the simplicity of Markdown with the power of WYSIWYG editing, enabling users to create professional presentations quickly.

## Target Users

1. **Developers**: Need to create technical presentations with code snippets
2. **Educators**: Want simple, distraction-free presentation creation
3. **Content Creators**: Require version-controllable presentation files
4. **Teams**: Need collaborative, git-friendly presentation workflows

## Core Use Cases

### Use Case 1: Quick Presentation Creation

**Actor**: Developer

**Goal**: Create a technical presentation in under 10 minutes

**Flow**:
1. Open web UI
2. Click "New Presentation"
3. Type Markdown with code blocks
4. See live preview
5. Export to PDF
6. Share with team

**Success Criteria**: Can create and export in < 10 minutes

### Use Case 2: Template-Based Workflows

**Actor**: Educator

**Goal**: Use consistent branding across presentations

**Flow**:
1. CLI: `marpify init lecture --template academic`
2. Edit generated slides.md
3. CLI: `marpify export slides.md`
4. Distribute PDF to students

**Success Criteria**: Templates accelerate creation by 50%

### Use Case 3: Collaborative Editing

**Actor**: Team

**Goal**: Version-control presentations in git

**Flow**:
1. Clone presentation repo
2. Edit .md files locally
3. Commit changes
4. CI/CD exports to PDF automatically
5. Review changes via git diff

**Success Criteria**: Presentations are diffable and mergeable

## Features

### MVP (Phase 1) ✅ Complete

#### Must Have
- [x] Create, read, update, delete presentations
- [x] Markdown editor with syntax highlighting (Monaco Editor)
- [x] Live preview of Marp slides
- [x] Export to PDF
- [x] Basic theme support
- [x] CLI for init and export
- [x] REST API
- [x] Docker deployment

#### Should Have
- [x] Export to HTML
- [x] Export to PPTX
- [x] Multiple built-in themes
- [x] Theme customization UI (Theme Studio with all color properties)
- [x] Keyboard shortcuts (Cmd/Ctrl+K command palette, undo/redo)

### Phase 2: Enhanced Editing ✅ Complete

- [x] Drag-and-drop slides
- [x] Image upload and management (Asset Manager)
- [x] Font selection in themes
- [x] Color picker (Theme Studio)
- [x] Template library (8 built-in templates)
- [x] Folder organization with hierarchy
- [x] Video export with TTS narration

### Phase 3: Collaboration ✅ Complete

- [x] Real-time multi-user editing (WebSocket sync)
- [x] Version history with checkpointing
- [x] Presentation sharing links (public/private with password)
- [x] Collaborator presence indicators

### Phase 4: AI Features ✅ Complete

- [x] AI-powered presentation generation from descriptions
- [x] AI slide rewriting and transformation
- [x] AI image generation (DALL-E 3)
- [x] AI theme generation from screenshots
- [x] AI chat panel with streaming responses
- [x] Multi-language support (15 languages)
- [x] Text-to-Speech with Kokoro TTS

### Phase 5: Extended Features ✅ Complete

- [x] Custom fonts upload and management (.ttf, .otf, .woff, .woff2)
- [x] Presentation analytics with view counts and engagement tracking

### Backlog

All major features implemented. Future enhancements tracked in Phase 6.

#### Won't Have (Yet)
- User authentication (OAuth)
- Multi-tenancy
- Cloud storage
- Mobile native app

## Functional Requirements

### FR-1: Presentation Management

**Description**: Users can create, view, edit, and delete presentations

**Acceptance Criteria**:
- API endpoint creates presentation with valid Markdown
- Returns 400 for invalid data
- Presentations persist across restarts
- Deletions are permanent

### FR-2: Live Preview

**Description**: Markdown changes render in real-time

**Acceptance Criteria**:
- Preview updates within 500ms of typing
- Supports all Marp directives
- Shows syntax errors
- Handles large files (100+ slides)

### FR-3: Export

**Description**: Export presentations to multiple formats

**Acceptance Criteria**:
- PDF export maintains formatting
- HTML export is self-contained
- PPTX export preserves slides
- Export completes within 10s for 50 slides

### FR-4: Theme System

**Description**: Apply and customize presentation themes

**Acceptance Criteria**:
- 3+ built-in themes
- Custom CSS upload
- Theme preview before applying
- Invalid CSS rejected with error

### FR-5: CLI

**Description**: Command-line tools for automation

**Acceptance Criteria**:
- `marpify init` creates valid project
- `marpify export` produces correct format
- All commands have --help
- All options have shorthand flags

## Non-Functional Requirements

### Performance

- **Response Time**: API responds in < 200ms for CRUD operations
- **Rendering**: Preview renders in < 500ms for typical slides
- **Export**: PDF export completes in < 10s for 50 slides
- **Scalability**: Handles 100 concurrent users

### Reliability

- **Uptime**: 99% availability
- **Data Integrity**: No data loss
- **Error Handling**: Graceful degradation
- **Backups**: Daily automated backups (future)

### Usability

- **Learning Curve**: New users productive in < 5 minutes
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile**: Responsive design (view-only initially)

### Security

- **Input Validation**: All inputs validated via Pydantic
- **CORS**: Configured per environment
- **Secrets**: Never logged or exposed
- **XSS Protection**: Content sanitization

### Maintainability

- **Code Quality**: All functions ≤ 10 lines
- **Testing**: 80%+ test coverage
- **Documentation**: All APIs documented
- **Logging**: Structured logs with levels

## Success Metrics

### User Metrics

- **Adoption**: 100 active users in 3 months
- **Engagement**: 5+ presentations per user
- **Retention**: 60% monthly active users

### Technical Metrics

- **Performance**: 95th percentile response time < 500ms
- **Reliability**: < 0.1% error rate
- **Quality**: 0 critical bugs in production

### Business Metrics

- **Cost**: Infrastructure < $100/month for MVP
- **Efficiency**: 50% faster than PowerPoint/Keynote
- **Satisfaction**: 4.5+ star rating

## Constraints

### Technical

- Must use Marp CLI (no custom renderer)
- File-based storage (no DB initially)
- Single-tenant (no auth initially)

### Business

- Open-source (MIT license)
- Free tier only (no monetization initially)
- Self-hosted deployment model

### Timeline

- MVP: 4 weeks
- Phase 2: 8 weeks
- Phase 3: 12 weeks

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Marp CLI changes API | High | Low | Version pinning, integration tests |
| Large file performance | Medium | Medium | Pagination, lazy loading |
| Browser compatibility | Low | Low | Modern browsers only, documented |
| Export queue overload | Medium | Medium | Rate limiting, async queue (future) |

## Open Questions

1. Should we support custom Marp plugins?
2. What's the max presentation size we support?
3. Do we need offline mode?
4. Should exports be stored or generated on-demand?

## Appendix

### Competitor Analysis

| Product | Strengths | Weaknesses |
|---------|-----------|------------|
| PowerPoint | Feature-rich, familiar | Not Markdown, binary files |
| Google Slides | Collaborative | Not Markdown, requires internet |
| Marp CLI | Simple, Markdown | No GUI, command-line only |
| Slidev | Developer-friendly | Vue.js dependency, complex setup |

### User Personas

**Persona 1: Alex the Developer**
- Needs: Fast, keyboard-driven workflow
- Pain: PowerPoint is slow and clunky
- Goal: Create tech talks in Markdown

**Persona 2: Sarah the Educator**
- Needs: Simple, consistent templates
- Pain: Too many formatting options distract
- Goal: Focus on content, not design

**Persona 3: Team Lead Chris**
- Needs: Version-controlled presentations
- Pain: Can't track changes in binary files
- Goal: Git-based presentation workflow
