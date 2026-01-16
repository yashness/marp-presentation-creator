import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './ui/button'
import {
  MoreHorizontal,
  LayoutGrid,
  Minimize2,
  Maximize2,
  Scissors,
  Copy,
  Loader2,
} from 'lucide-react'
import type { SlideOperation } from '../api/client'

interface SlideActionsMenuProps {
  onLayoutClick: () => void
  onOperation: (operation: SlideOperation) => void
  onDuplicate: () => void
  loadingOperation: string | null
}

export function SlideActionsMenu({
  onLayoutClick,
  onOperation,
  onDuplicate,
  loadingOperation,
}: SlideActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isLoading = loadingOperation !== null

  const actions = [
    {
      key: 'layout',
      label: 'Apply Layout',
      icon: LayoutGrid,
      description: 'Change slide structure',
      onClick: () => {
        onLayoutClick()
        setIsOpen(false)
      },
    },
    {
      key: 'simplify',
      label: 'Simplify',
      icon: Minimize2,
      description: 'Make more concise',
      onClick: () => {
        onOperation('simplify')
        setIsOpen(false)
      },
    },
    {
      key: 'expand',
      label: 'Expand',
      icon: Maximize2,
      description: 'Add more detail',
      onClick: () => {
        onOperation('expand')
        setIsOpen(false)
      },
    },
    {
      key: 'split',
      label: 'Split',
      icon: Scissors,
      description: 'Divide into multiple slides',
      onClick: () => {
        onOperation('split')
        setIsOpen(false)
      },
    },
    {
      key: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      description: 'Clone this slide',
      onClick: () => {
        onDuplicate()
        setIsOpen(false)
      },
    },
  ]

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        title="More actions"
        className="text-xs px-2"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MoreHorizontal className="w-4 h-4" />
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1"
            >
              {actions.map((action) => {
                const Icon = action.icon
                const isActionLoading = loadingOperation === action.key
                return (
                  <button
                    key={action.key}
                    onClick={action.onClick}
                    disabled={isLoading}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <div className="h-6 w-6 rounded bg-slate-100 grid place-items-center flex-shrink-0">
                      {isActionLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                      ) : (
                        <Icon className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </div>
                    <span className="text-slate-700">{action.label}</span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
