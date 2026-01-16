import { useState } from 'react'
import type { Theme, ThemeCreatePayload, ThemeColors, ThemeTypography, ThemeSpacing } from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { DEFAULT_THEME_TEMPLATE } from '../lib/themeDefaults'
import { Palette, Sparkles, Trash2, RotateCcw, Save, Type, Ruler } from 'lucide-react'

interface ThemeStudioProps {
  themes: Theme[]
  selectedTheme: string | null
  onThemeChange: (themeId: string | null) => void
  onCreateTheme: (data: ThemeCreatePayload) => Promise<Theme | null>
  onUpdateTheme: (id: string, data: ThemeCreatePayload) => Promise<Theme | null>
  onDeleteTheme: (id: string) => Promise<void | null>
  onOpenAICreator: () => void
}

interface ColorFieldConfig {
  key: keyof ThemeColors
  label: string
  description: string
}

interface TypographyFieldConfig {
  key: keyof ThemeTypography
  label: string
  description: string
}

interface SpacingFieldConfig {
  key: keyof ThemeSpacing
  label: string
  description: string
}

const COLOR_FIELDS: ColorFieldConfig[] = [
  { key: 'background', label: 'Background', description: 'Slide background color' },
  { key: 'text', label: 'Body Text', description: 'Default paragraph text' },
  { key: 'h1', label: 'Title (H1)', description: 'Main slide titles' },
  { key: 'h2', label: 'Subtitle (H2)', description: 'Section headings' },
  { key: 'h3', label: 'Heading (H3)', description: 'Subsection headings' },
  { key: 'link', label: 'Links', description: 'Hyperlink color' },
  { key: 'code_background', label: 'Inline Code BG', description: 'Background for `code`' },
  { key: 'code_text', label: 'Inline Code Text', description: 'Text color for `code`' },
  { key: 'code_block_background', label: 'Code Block BG', description: 'Background for code blocks' },
  { key: 'code_block_text', label: 'Code Block Text', description: 'Text in code blocks' },
]

const TYPOGRAPHY_FIELDS: TypographyFieldConfig[] = [
  { key: 'font_family', label: 'Font Family', description: 'Primary font stack' },
  { key: 'font_size', label: 'Base Font Size', description: 'Default text size' },
  { key: 'h1_size', label: 'Title Size', description: 'H1 heading size' },
  { key: 'h1_weight', label: 'Title Weight', description: 'H1 font weight' },
  { key: 'h2_size', label: 'Subtitle Size', description: 'H2 heading size' },
  { key: 'h2_weight', label: 'Subtitle Weight', description: 'H2 font weight' },
  { key: 'h3_size', label: 'Heading Size', description: 'H3 heading size' },
  { key: 'h3_weight', label: 'Heading Weight', description: 'H3 font weight' },
  { key: 'code_font_family', label: 'Code Font', description: 'Monospace font for code' },
]

const SPACING_FIELDS: SpacingFieldConfig[] = [
  { key: 'slide_padding', label: 'Slide Padding', description: 'Outer slide margins' },
  { key: 'h1_margin_bottom', label: 'Title Margin', description: 'Space below titles' },
  { key: 'h2_margin_top', label: 'Subtitle Margin', description: 'Space above subtitles' },
  { key: 'code_padding', label: 'Code Padding', description: 'Inline code padding' },
  { key: 'code_block_padding', label: 'Block Padding', description: 'Code block padding' },
  { key: 'border_radius', label: 'Border Radius', description: 'General rounded corners' },
  { key: 'code_block_border_radius', label: 'Code Radius', description: 'Code block corners' },
]

function ColorInput({
  value,
  onChange,
  label,
  description,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  description: string
}) {
  const isValidColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <div
        className="w-10 h-10 rounded-lg border-2 border-slate-200 flex-shrink-0 cursor-pointer relative overflow-hidden"
        style={{ backgroundColor: isValidColor ? value : '#ffffff' }}
      >
        <input
          type="color"
          value={isValidColor ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        {!isValidColor && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            ?
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className="text-xs text-slate-400">{description}</span>
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="mt-1 h-8 text-sm font-mono"
        />
      </div>
    </div>
  )
}

function TextInput({
  value,
  onChange,
  label,
  description,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  description: string
}) {
  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-400">{description}</span>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  )
}

export function ThemeStudio({
  themes,
  selectedTheme,
  onThemeChange,
  onCreateTheme,
  onUpdateTheme,
  onDeleteTheme,
  onOpenAICreator,
}: ThemeStudioProps) {
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [themeDraft, setThemeDraft] = useState<ThemeCreatePayload>({
    ...DEFAULT_THEME_TEMPLATE,
    name: '',
  })
  const [status, setStatus] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<'colors' | 'typography' | 'spacing' | null>('colors')

  const customThemes = themes.filter((t) => !t.is_builtin)

  const loadThemeIntoDraft = (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId)
    if (!theme || !theme.colors || !theme.typography || !theme.spacing) {
      setStatus('Unable to load theme for editing.')
      return
    }
    setEditingThemeId(themeId)
    setThemeDraft({
      name: theme.name,
      description: theme.description || '',
      colors: { ...theme.colors },
      typography: { ...theme.typography },
      spacing: { ...theme.spacing },
    })
    setStatus(`Editing: ${theme.name}`)
  }

  const resetThemeDraft = () => {
    setEditingThemeId(null)
    setThemeDraft({ ...DEFAULT_THEME_TEMPLATE, name: '' })
    setStatus(null)
  }

  const updateColor = (key: string, value: string) => {
    setThemeDraft((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }))
  }

  const updateTypography = (key: string, value: string) => {
    setThemeDraft((prev) => ({
      ...prev,
      typography: { ...prev.typography, [key]: value },
    }))
  }

  const updateSpacing = (key: string, value: string) => {
    setThemeDraft((prev) => ({
      ...prev,
      spacing: { ...prev.spacing, [key]: value },
    }))
  }

  const handleSaveTheme = async () => {
    setStatus(null)
    const payload = {
      ...themeDraft,
      name: themeDraft.name.trim() || 'Custom Theme',
    }
    const operation = editingThemeId
      ? () => onUpdateTheme(editingThemeId, payload)
      : () => onCreateTheme(payload)
    const saved = await operation()
    if (!saved) {
      setStatus('Could not save theme. Please try again.')
      return
    }

    setStatus(editingThemeId ? 'Theme updated!' : 'Theme created!')
    onThemeChange(saved.id)
    if (!editingThemeId) {
      setEditingThemeId(saved.id)
    }
  }

  const handleDeleteTheme = async () => {
    if (!editingThemeId) return
    const theme = themes.find((t) => t.id === editingThemeId)
    if (theme?.is_builtin) return
    if (!confirm(`Delete theme "${theme?.name}"?`)) return

    await onDeleteTheme(editingThemeId)
    if (selectedTheme === editingThemeId) {
      onThemeChange(null)
    }
    resetThemeDraft()
    setStatus('Theme deleted.')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary-600" />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Theme Studio</p>
            <p className="text-sm text-slate-700">Create, edit, or delete custom themes.</p>
          </div>
        </div>
        <Sparkles className="w-5 h-5 text-primary-500" />
      </div>

      {/* AI Theme Creator Button */}
      <Button size="sm" onClick={onOpenAICreator} variant="secondary" className="w-full gap-2">
        <Sparkles className="w-4 h-4" />
        AI Theme Creator
      </Button>

      {/* Theme Selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">Load existing custom theme</label>
        <Select
          value={editingThemeId || ''}
          onChange={(e) => {
            const id = e.target.value
            if (!id) {
              resetThemeDraft()
              return
            }
            loadThemeIntoDraft(id)
          }}
        >
          <option value="">— Create new theme —</option>
          {customThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={resetThemeDraft} className="gap-1">
            <RotateCcw className="w-3 h-3" />
            Reset draft
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDeleteTheme}
            disabled={!editingThemeId}
            className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
            Delete theme
          </Button>
        </div>
      </div>

      {/* Theme Name & Description */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Theme Name</label>
          <Input
            placeholder="My Theme"
            value={themeDraft.name}
            onChange={(e) => setThemeDraft((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
          <Input
            placeholder="A brief description"
            value={themeDraft.description || ''}
            onChange={(e) => setThemeDraft((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {/* Colors Section */}
        <button
          onClick={() => setExpandedSection(expandedSection === 'colors' ? null : 'colors')}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary-600" />
            <span className="font-medium text-slate-700">Colors</span>
            <span className="text-xs text-slate-400">({Object.keys(themeDraft.colors).length} properties)</span>
          </div>
          <span className="text-slate-400">{expandedSection === 'colors' ? '−' : '+'}</span>
        </button>
        {expandedSection === 'colors' && (
          <div className="px-4 py-2 bg-white max-h-64 overflow-y-auto">
            {COLOR_FIELDS.map((field) => (
              <ColorInput
                key={field.key}
                value={themeDraft.colors[field.key] || ''}
                onChange={(v) => updateColor(field.key, v)}
                label={field.label}
                description={field.description}
              />
            ))}
          </div>
        )}

        {/* Typography Section */}
        <button
          onClick={() => setExpandedSection(expandedSection === 'typography' ? null : 'typography')}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors border-t border-slate-200"
        >
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-secondary-600" />
            <span className="font-medium text-slate-700">Typography</span>
            <span className="text-xs text-slate-400">({Object.keys(themeDraft.typography).length} properties)</span>
          </div>
          <span className="text-slate-400">{expandedSection === 'typography' ? '−' : '+'}</span>
        </button>
        {expandedSection === 'typography' && (
          <div className="px-4 py-2 bg-white max-h-64 overflow-y-auto">
            {TYPOGRAPHY_FIELDS.map((field) => (
              <TextInput
                key={field.key}
                value={themeDraft.typography[field.key] || ''}
                onChange={(v) => updateTypography(field.key, v)}
                label={field.label}
                description={field.description}
              />
            ))}
          </div>
        )}

        {/* Spacing Section */}
        <button
          onClick={() => setExpandedSection(expandedSection === 'spacing' ? null : 'spacing')}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors border-t border-slate-200"
        >
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-slate-700">Spacing</span>
            <span className="text-xs text-slate-400">({Object.keys(themeDraft.spacing).length} properties)</span>
          </div>
          <span className="text-slate-400">{expandedSection === 'spacing' ? '−' : '+'}</span>
        </button>
        {expandedSection === 'spacing' && (
          <div className="px-4 py-2 bg-white max-h-64 overflow-y-auto">
            {SPACING_FIELDS.map((field) => (
              <TextInput
                key={field.key}
                value={themeDraft.spacing[field.key] || ''}
                onChange={(v) => updateSpacing(field.key, v)}
                label={field.label}
                description={field.description}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSaveTheme} className="flex-1 gap-2">
          <Save className="w-4 h-4" />
          {editingThemeId ? 'Update Theme' : 'Create Theme'}
        </Button>
        <Button size="sm" variant="outline" onClick={resetThemeDraft}>
          Reset fields
        </Button>
      </div>

      {/* Status */}
      {status && (
        <p className="text-xs text-slate-600 text-center">{status}</p>
      )}
      {editingThemeId && (
        <p className="text-xs text-slate-500 text-center">Editing theme: {themeDraft.name || 'Unnamed'}</p>
      )}
    </div>
  )
}
