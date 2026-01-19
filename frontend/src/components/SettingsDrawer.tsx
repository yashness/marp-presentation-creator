import type { Theme, ThemeCreatePayload } from '../api/client'
import { SlidersHorizontal, X, Download, Palette, Volume2, Sparkles } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { ExportButton } from './ExportButton'
import { VideoExportButton } from './VideoExportButton'
import { TTSButton } from './TTSButton'
import { ThemeStudio } from './ThemeStudio'

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  selectedTheme: string | null
  selectedId: string | null
  themes: Theme[]
  normalizedFrontmatter: Record<string, string>
  currentSlideIndex: number
  currentSlideComment: string
  themeStatus: string | null
  onTitleChange: (value: string) => void
  onThemeChange: (value: string | null) => void
  onPaginateChange: (checked: boolean) => void
  onFooterChange: (value: string) => void
  onExport: (format: 'pdf' | 'html' | 'pptx') => void
  onCreateTheme: (data: ThemeCreatePayload) => Promise<Theme | null>
  onUpdateTheme: (id: string, data: ThemeCreatePayload) => Promise<Theme | null>
  onDeleteTheme: (id: string) => Promise<void | null>
  onOpenThemeCreator: () => void
  onApplyTheme: (themeId: string, themeName: string) => void
}

export function SettingsDrawer({
  isOpen,
  onClose,
  title,
  selectedTheme,
  selectedId,
  themes,
  normalizedFrontmatter,
  currentSlideIndex,
  currentSlideComment,
  themeStatus,
  onTitleChange,
  onThemeChange,
  onPaginateChange,
  onFooterChange,
  onExport,
  onCreateTheme,
  onUpdateTheme,
  onDeleteTheme,
  onOpenThemeCreator,
  onApplyTheme,
}: SettingsDrawerProps) {
  const customThemes = themes.filter(t => !t.is_builtin)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-50" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary-500" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Settings</p>
              <p className="text-xs text-slate-500">Meta, exports, TTS, and themes.</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <PresentationMetaSection
            title={title}
            selectedTheme={selectedTheme}
            themes={themes}
            normalizedFrontmatter={normalizedFrontmatter}
            onTitleChange={onTitleChange}
            onThemeChange={onThemeChange}
            onPaginateChange={onPaginateChange}
            onFooterChange={onFooterChange}
            onClose={onClose}
          />

          <ExportsSection
            selectedId={selectedId}
            presentationTitle={title}
            onExport={onExport}
          />

          <TTSSection
            presentationId={selectedId}
            slideIndex={currentSlideIndex}
            commentText={currentSlideComment}
          />

          <ThemeControlsSection
            customThemes={customThemes}
            selectedTheme={selectedTheme}
            themeStatus={themeStatus}
            onApplyTheme={onApplyTheme}
            onOpenThemeCreator={onOpenThemeCreator}
          />

          <div className="rounded-lg border border-slate-200 p-4 shadow-sm">
            <ThemeStudio
              themes={themes}
              selectedTheme={selectedTheme}
              onThemeChange={onThemeChange}
              onCreateTheme={onCreateTheme}
              onUpdateTheme={onUpdateTheme}
              onDeleteTheme={onDeleteTheme}
              onOpenAICreator={onOpenThemeCreator}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface PresentationMetaSectionProps {
  title: string
  selectedTheme: string | null
  themes: Theme[]
  normalizedFrontmatter: Record<string, string>
  onTitleChange: (value: string) => void
  onThemeChange: (value: string | null) => void
  onPaginateChange: (checked: boolean) => void
  onFooterChange: (value: string) => void
  onClose: () => void
}

function PresentationMetaSection({
  title,
  selectedTheme,
  themes,
  normalizedFrontmatter,
  onTitleChange,
  onThemeChange,
  onPaginateChange,
  onFooterChange,
  onClose,
}: PresentationMetaSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Presentation meta</p>
          <p className="text-xs text-slate-500">Title, theme, pagination, footer.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
          Hide
        </Button>
      </div>
      <div className="space-y-3">
        <Input
          type="text"
          placeholder="Presentation title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <Select value={selectedTheme || ''} onChange={(e) => onThemeChange(e.target.value || null)}>
          <option value="">Default theme</option>
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2 text-sm">
          <input
            id="paginate-drawer"
            type="checkbox"
            defaultChecked={normalizedFrontmatter.paginate === 'true'}
            onChange={(e) => onPaginateChange(e.target.checked)}
            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="paginate-drawer" className="text-slate-700">Paginate slides</label>
        </div>
        <textarea
          placeholder="Footer text (supports spaces and new lines)"
          className="w-full border border-slate-200 rounded-md p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          rows={3}
          defaultValue={normalizedFrontmatter.footer}
          onChange={(e) => onFooterChange(e.target.value)}
        />
      </div>
    </div>
  )
}

interface ExportsSectionProps {
  selectedId: string | null
  presentationTitle: string
  onExport: (format: 'pdf' | 'html' | 'pptx') => void
}

function ExportsSection({ selectedId, presentationTitle, onExport }: ExportsSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-primary-500" />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Exports</p>
            <p className="text-sm text-slate-700">Download your deck</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton format="pdf" onClick={onExport} disabled={!selectedId} />
          <ExportButton format="html" onClick={onExport} disabled={!selectedId} />
          <ExportButton format="pptx" onClick={onExport} disabled={!selectedId} />
          <VideoExportButton presentationId={selectedId} presentationTitle={presentationTitle} />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Use structured editing to keep slides tidy, then switch to editor view for raw tweaks.
      </p>
    </div>
  )
}

interface TTSSectionProps {
  presentationId: string | null
  slideIndex: number
  commentText: string
}

function TTSSection({ presentationId, slideIndex, commentText }: TTSSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Text-to-speech</p>
            <p className="text-xs text-slate-500">Generate and play slide narration.</p>
          </div>
        </div>
      </div>
      <TTSButton
        presentationId={presentationId}
        slideIndex={slideIndex}
        commentText={commentText}
      />
      <p className="text-xs text-slate-500">Uses Kokoro TTS. Voice defaults to Bella for reliability.</p>
    </div>
  )
}

interface ThemeControlsSectionProps {
  customThemes: Theme[]
  selectedTheme: string | null
  themeStatus: string | null
  onApplyTheme: (themeId: string, themeName: string) => void
  onOpenThemeCreator: () => void
}

function ThemeControlsSection({
  customThemes,
  selectedTheme,
  themeStatus,
  onApplyTheme,
  onOpenThemeCreator,
}: ThemeControlsSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-secondary-600" />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Theme controls</p>
            <p className="text-sm text-slate-700">Apply or create custom themes.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onOpenThemeCreator} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Theme creator
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {customThemes.map(theme => (
          <Button
            key={theme.id}
            variant={selectedTheme === theme.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onApplyTheme(theme.id, theme.name)}
          >
            {theme.name}
          </Button>
        ))}
      </div>
      {themeStatus && <p className="text-xs text-slate-500">{themeStatus}</p>}
    </div>
  )
}
