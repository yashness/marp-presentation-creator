import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './ui/button'
import { getLayouts, applyLayout, type LayoutInfo } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import {
  LayoutGrid,
  Columns2,
  PanelLeft,
  PanelRight,
  SeparatorVertical,
  AlignCenter,
  Scale,
  GitBranch,
  ListOrdered,
  ListChecks,
  Boxes,
  SquareStack,
  Quote,
  Highlighter,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  ArrowRight,
  ArrowDown,
  RefreshCw,
  Triangle,
  BarChart3,
} from 'lucide-react'

interface LayoutPickerProps {
  isOpen: boolean
  onClose: () => void
  slideContent: string
  onApplyLayout: (newContent: string) => void
}

const ICON_MAP: Record<string, React.ReactNode> = {
  columns: <Columns2 className="w-5 h-5" />,
  'layout-grid': <LayoutGrid className="w-5 h-5" />,
  'panel-left': <PanelLeft className="w-5 h-5" />,
  'panel-right': <PanelRight className="w-5 h-5" />,
  'separator-vertical': <SeparatorVertical className="w-5 h-5" />,
  'align-center': <AlignCenter className="w-5 h-5" />,
  scale: <Scale className="w-5 h-5" />,
  'git-branch': <GitBranch className="w-5 h-5" />,
  'list-ordered': <ListOrdered className="w-5 h-5" />,
  'list-checks': <ListChecks className="w-5 h-5" />,
  boxes: <Boxes className="w-5 h-5" />,
  'square-stack': <SquareStack className="w-5 h-5" />,
  quote: <Quote className="w-5 h-5" />,
  'columns-2': <Columns2 className="w-5 h-5" />,
  highlighter: <Highlighter className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  'alert-triangle': <AlertTriangle className="w-5 h-5" />,
  'check-circle': <CheckCircle className="w-5 h-5" />,
  'x-circle': <XCircle className="w-5 h-5" />,
  'arrow-right': <ArrowRight className="w-5 h-5" />,
  'arrow-down': <ArrowDown className="w-5 h-5" />,
  'refresh-cw': <RefreshCw className="w-5 h-5" />,
  triangle: <Triangle className="w-5 h-5" />,
  'bar-chart': <BarChart3 className="w-5 h-5" />,
}

function getIcon(iconName: string) {
  return ICON_MAP[iconName] || <LayoutGrid className="w-5 h-5" />
}

export function LayoutPicker({
  isOpen,
  onClose,
  slideContent,
  onApplyLayout,
}: LayoutPickerProps) {
  const [layouts, setLayouts] = useState<Record<string, LayoutInfo>>({})
  const [diagrams, setDiagrams] = useState<Record<string, LayoutInfo>>({})
  const [callouts, setCallouts] = useState<Record<string, LayoutInfo>>({})
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'layouts' | 'diagrams' | 'callouts'>('layouts')
  const { showToast } = useToast()

  useEffect(() => {
    if (isOpen && Object.keys(layouts).length === 0) {
      setLoading(true)
      getLayouts()
        .then((data) => {
          setLayouts(data.layouts)
          setDiagrams(data.diagrams || {})
          setCallouts(data.callouts)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [isOpen, layouts])

  const handleApply = useCallback(
    async (layoutType: string) => {
      setApplying(layoutType)
      try {
        const newContent = await applyLayout(slideContent, layoutType)
        onApplyLayout(newContent)
        onClose()
        showToast('Layout applied', 'success')
      } catch (error) {
        console.error('Failed to apply layout:', error)
        showToast('Failed to apply layout', 'error')
      } finally {
        setApplying(null)
      }
    },
    [slideContent, onApplyLayout, onClose, showToast]
  )

  const items = activeTab === 'layouts' ? layouts : activeTab === 'diagrams' ? diagrams : callouts

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="absolute right-0 top-full mt-2 z-50 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-slate-800">Apply Layout</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('layouts')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'layouts'
                  ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Layouts
            </button>
            <button
              onClick={() => setActiveTab('diagrams')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'diagrams'
                  ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Diagrams
            </button>
            <button
              onClick={() => setActiveTab('callouts')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'callouts'
                  ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Callouts
            </button>
          </div>

          <div className="p-3 max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(items).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => handleApply(key)}
                    disabled={applying !== null}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group disabled:opacity-50"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary-100 text-primary-600 grid place-items-center flex-shrink-0 group-hover:bg-primary-200">
                      {applying === key ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        getIcon(info.icon)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {info.name}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {info.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              AI will reorganize your content to match the selected layout
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
