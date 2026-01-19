import { cn } from '../lib/utils'
import { CollaborationPanel } from './CollaborationPanel'
import {
  IconMenu2,
  IconX,
  IconCode,
  IconEye,
  IconShare,
  IconChartBar,
  IconHistory,
  IconDownload,
} from '@tabler/icons-react'

interface AppHeaderProps {
  title: string
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  mobileView: 'editor' | 'preview'
  setMobileView: (view: 'editor' | 'preview') => void
  selectedId: string | null
  content: string
  onContentChange: (content: string) => void
  onOpenShareModal: () => void
  onOpenAnalytics: () => void
  onOpenVersionHistory: () => void
  onExportPdf: () => void
}

function getStatusText(status: 'idle' | 'saving' | 'saved' | 'error') {
  switch (status) {
    case 'saving': return 'Saving…'
    case 'saved': return 'All changes saved'
    case 'error': return 'Save failed'
    default: return 'Ready'
  }
}

export function AppHeader({
  title,
  autosaveStatus,
  mobileMenuOpen,
  setMobileMenuOpen,
  mobileView,
  setMobileView,
  selectedId,
  content,
  onContentChange,
  onOpenShareModal,
  onOpenAnalytics,
  onOpenVersionHistory,
  onExportPdf,
}: AppHeaderProps) {
  return (
    <header className="h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 shrink-0">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 grid place-items-center text-slate-500"
        >
          {mobileMenuOpen ? <IconX className="w-5 h-5" /> : <IconMenu2 className="w-5 h-5" />}
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-md">
          {title || 'Untitled Presentation'}
        </h1>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={cn(
            "h-2 w-2 rounded-full",
            autosaveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
            autosaveStatus === 'saved' ? 'bg-green-500' :
            autosaveStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'
          )} />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {getStatusText(autosaveStatus)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Collaboration Panel */}
        <div className="hidden sm:block">
          <CollaborationPanel
            presentationId={selectedId}
            content={content}
            onContentChange={onContentChange}
          />
        </div>

        {/* Mobile view toggle */}
        <div className="lg:hidden flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => setMobileView('editor')}
            className={cn(
              "h-8 w-8 rounded-md grid place-items-center transition-colors",
              mobileView === 'editor' ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600" : "text-slate-500"
            )}
            title="Editor"
          >
            <IconCode className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileView('preview')}
            className={cn(
              "h-8 w-8 rounded-md grid place-items-center transition-colors",
              mobileView === 'preview' ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600" : "text-slate-500"
            )}
            title="Preview"
          >
            <IconEye className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onOpenShareModal}
          disabled={!selectedId}
          className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/30 dark:hover:bg-sky-800/50 disabled:opacity-50 disabled:cursor-not-allowed text-sky-700 dark:text-sky-300 text-sm font-medium transition-all"
          title="Share presentation"
        >
          <IconShare className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
        <button
          onClick={onOpenAnalytics}
          disabled={!selectedId}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 text-sm font-medium transition-all"
          title="View Analytics"
        >
          <IconChartBar className="w-4 h-4" />
          <span className="hidden sm:inline">Analytics</span>
        </button>
        <button
          onClick={onOpenVersionHistory}
          disabled={!selectedId}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 text-sm font-medium transition-all"
          title="Version History (Cmd/Ctrl+Z to undo)"
        >
          <IconHistory className="w-4 h-4" />
          <span className="hidden sm:inline">History</span>
        </button>
        <button
          onClick={onExportPdf}
          disabled={!selectedId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow-md transition-all"
        >
          <IconDownload className="w-4 h-4" />
          <span className="hidden sm:inline">Export PDF</span>
        </button>
      </div>
    </header>
  )
}
