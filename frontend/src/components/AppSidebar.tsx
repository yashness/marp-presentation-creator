import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../lib/utils'
import type { Presentation, Folder } from '../api/client'
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconSparkles,
  IconPhoto,
  IconSearch,
  IconFolder,
  IconDotsVertical,
  IconTrash,
  IconCopy,
  IconMessageCircle,
  IconTemplate,
  IconTypography,
} from '@tabler/icons-react'

interface AppSidebarProps {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  folders: Folder[]
  selectedFolderId: string | null
  setSelectedFolderId: (id: string | null) => void
  filteredPresentations: Presentation[]
  selectedId: string | null
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onNewPresentation: () => void
  onOpenAIModal: () => void
  onOpenAssetModal: () => void
  onOpenAIChat: () => void
  onOpenTemplateLibrary: () => void
  onOpenFontManager: () => void
  onSelectPresentation: (pres: Presentation) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

function StatusIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  return (
    <div className={cn(
      "h-2 w-2 rounded-full shrink-0",
      status === 'saving' ? 'bg-yellow-500 animate-pulse' :
      status === 'saved' ? 'bg-green-500' :
      status === 'error' ? 'bg-red-500' : 'bg-slate-400'
    )} />
  )
}

function getStatusText(status: 'idle' | 'saving' | 'saved' | 'error') {
  switch (status) {
    case 'saving': return 'Saving…'
    case 'saved': return 'Saved'
    case 'error': return 'Error'
    default: return 'Ready'
  }
}

export function AppSidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  mobileMenuOpen,
  searchQuery,
  setSearchQuery,
  folders,
  selectedFolderId,
  setSelectedFolderId,
  filteredPresentations,
  selectedId,
  menuOpenId,
  setMenuOpenId,
  autosaveStatus,
  onNewPresentation,
  onOpenAIModal,
  onOpenAssetModal,
  onOpenAIChat,
  onOpenTemplateLibrary,
  onOpenFontManager,
  onSelectPresentation,
  onDuplicate,
  onDelete,
}: AppSidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 280 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        "h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 shadow-lg relative z-50",
        "fixed lg:relative inset-y-0 left-0 transform transition-transform lg:transform-none",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo & Collapse Toggle */}
      <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <div className="h-9 w-9 rounded-lg bg-primary-700 text-white font-bold text-xs grid place-items-center shadow-sm">
                MP
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest font-medium text-slate-400">Marp</span>
                <span className="text-sm font-bold text-primary-700 dark:text-primary-400">Builder</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 grid place-items-center text-slate-500 transition-colors"
        >
          {sidebarCollapsed ? <IconChevronRight className="w-4 h-4" /> : <IconChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick Actions */}
      <div className={cn(
        "border-b border-slate-200 dark:border-slate-800 p-2 space-y-1",
        sidebarCollapsed && "px-2"
      )}>
        <SidebarButton
          onClick={onNewPresentation}
          icon={<IconPlus className="w-4 h-4 shrink-0" />}
          label="New"
          collapsed={sidebarCollapsed}
          variant="primary"
        />
        <SidebarButton
          onClick={onOpenAIModal}
          icon={<IconSparkles className="w-4 h-4 shrink-0" />}
          label="AI Generate"
          collapsed={sidebarCollapsed}
          variant="secondary"
        />
        <SidebarButton
          onClick={onOpenAssetModal}
          icon={<IconPhoto className="w-4 h-4 shrink-0" />}
          label="Assets"
          collapsed={sidebarCollapsed}
        />
        <SidebarButton
          onClick={onOpenAIChat}
          icon={<IconMessageCircle className="w-4 h-4 shrink-0" />}
          label="AI Chat"
          collapsed={sidebarCollapsed}
          variant="gradient"
        />
        <SidebarButton
          onClick={onOpenTemplateLibrary}
          icon={<IconTemplate className="w-4 h-4 shrink-0" />}
          label="Templates"
          collapsed={sidebarCollapsed}
        />
        <SidebarButton
          onClick={onOpenFontManager}
          icon={<IconTypography className="w-4 h-4 shrink-0" />}
          label="Fonts"
          collapsed={sidebarCollapsed}
        />
      </div>

      {/* Search */}
      {!sidebarCollapsed && (
        <div className="p-2 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      {/* Folders */}
      {!sidebarCollapsed && (
        <div className="px-2 py-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1 text-xs text-slate-500 px-2 mb-1">
            <IconFolder className="w-3 h-3" />
            <span>Folders</span>
          </div>
          <button
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
              !selectedFolderId ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            )}
          >
            All presentations
          </button>
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={cn(
                "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                selectedFolderId === folder.id ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              )}
            >
              {folder.name}
            </button>
          ))}
        </div>
      )}

      {/* Presentations List */}
      <div className="flex-1 overflow-y-auto">
        {sidebarCollapsed ? (
          <CollapsedPresentationList
            presentations={filteredPresentations}
            selectedId={selectedId}
            onSelect={onSelectPresentation}
          />
        ) : (
          <ExpandedPresentationList
            presentations={filteredPresentations}
            selectedId={selectedId}
            menuOpenId={menuOpenId}
            setMenuOpenId={setMenuOpenId}
            onSelect={onSelectPresentation}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="h-12 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center px-3">
        <div className={cn(
          "flex items-center gap-2",
          sidebarCollapsed && "justify-center"
        )}>
          <StatusIndicator status={autosaveStatus} />
          {!sidebarCollapsed && (
            <span className="text-xs font-medium text-slate-500">
              {getStatusText(autosaveStatus)}
            </span>
          )}
        </div>
      </div>
    </motion.aside>
  )
}

interface SidebarButtonProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  collapsed: boolean
  variant?: 'default' | 'primary' | 'secondary' | 'gradient'
}

function SidebarButton({ onClick, icon, label, collapsed, variant = 'default' }: SidebarButtonProps) {
  const variantClasses = {
    default: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300",
    primary: "bg-primary-500 hover:bg-primary-600 text-white shadow-md hover:shadow-lg",
    secondary: "bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow",
    gradient: "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-sm",
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all",
        variantClasses[variant],
        collapsed && "px-0 justify-center"
      )}
    >
      {icon}
      {!collapsed && <span className="text-sm">{label}</span>}
    </button>
  )
}

interface CollapsedPresentationListProps {
  presentations: Presentation[]
  selectedId: string | null
  onSelect: (pres: Presentation) => void
}

function CollapsedPresentationList({ presentations, selectedId, onSelect }: CollapsedPresentationListProps) {
  return (
    <div className="p-2 space-y-1">
      {presentations.slice(0, 10).map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className={cn(
            "w-full h-10 rounded-lg grid place-items-center transition-colors",
            selectedId === p.id
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
          )}
          title={p.title}
        >
          <span className="text-xs font-bold">{p.title.charAt(0).toUpperCase()}</span>
        </button>
      ))}
    </div>
  )
}

interface ExpandedPresentationListProps {
  presentations: Presentation[]
  selectedId: string | null
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
  onSelect: (pres: Presentation) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

function ExpandedPresentationList({
  presentations,
  selectedId,
  menuOpenId,
  setMenuOpenId,
  onSelect,
  onDuplicate,
  onDelete,
}: ExpandedPresentationListProps) {
  return (
    <div className="p-2 space-y-1">
      {presentations.map(p => (
        <div
          key={p.id}
          className={cn(
            "group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
            selectedId === p.id
              ? "bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
          )}
          onClick={() => onSelect(p)}
        >
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium truncate",
              selectedId === p.id ? "text-primary-800 dark:text-primary-300" : "text-slate-800 dark:text-slate-200"
            )}>
              {p.title || 'Untitled'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {new Date(p.updated_at).toLocaleDateString()}
            </p>
          </div>
          <div className="relative" data-menu-container>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpenId(menuOpenId === p.id ? null : p.id)
              }}
              className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 grid place-items-center transition-all"
            >
              <IconDotsVertical className="w-4 h-4 text-slate-500" />
            </button>
            {menuOpenId === p.id && (
              <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[140px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(p.id)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <IconCopy className="w-4 h-4" />
                  Duplicate
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(p.id)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <IconTrash className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
