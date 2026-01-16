import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { getAnalytics, type AnalyticsResponse } from '../api/client'
import { useApiHandler } from '../hooks/useApiHandler'
import {
  IconChartBar,
  IconEye,
  IconUsers,
  IconClock,
  IconDownload,
  IconShare,
  IconTrendingUp,
  IconCalendar,
} from '@tabler/icons-react'
import { cn } from '../lib/utils'

interface AnalyticsPanelProps {
  open: boolean
  onClose: () => void
  presentationId: string | null
  presentationTitle: string
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'primary'
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  subValue?: string
  color?: 'primary' | 'secondary' | 'success' | 'warning'
}) {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    secondary: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-400',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
        </div>
      </div>
    </div>
  )
}

function MiniChart({ data }: { data: { date: string; views: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
        No view data yet
      </div>
    )
  }

  const maxViews = Math.max(...data.map(d => d.views), 1)
  const chartWidth = 100 / data.length

  return (
    <div className="h-32 flex items-end gap-1 px-2">
      {data.map((point, i) => (
        <div
          key={point.date}
          className="flex-1 flex flex-col items-center group"
          style={{ width: `${chartWidth}%` }}
        >
          <div className="relative w-full flex justify-center">
            <div
              className={cn(
                "w-full max-w-[20px] rounded-t transition-all",
                point.views > 0 ? "bg-primary-500" : "bg-slate-200 dark:bg-slate-700"
              )}
              style={{
                height: `${Math.max((point.views / maxViews) * 100, 4)}px`
              }}
            />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {point.views} views
            </div>
          </div>
          {i % 7 === 0 && (
            <span className="text-[10px] text-slate-400 mt-1">
              {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export function AnalyticsPanel({
  open,
  onClose,
  presentationId,
  presentationTitle
}: AnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const { handleApiCall } = useApiHandler()

  const loadAnalytics = useCallback(async () => {
    if (!presentationId) return

    setLoading(true)
    const result = await handleApiCall(
      () => getAnalytics(presentationId, 30),
      '',
      'Failed to load analytics'
    )
    if (result) {
      setAnalytics(result)
    }
    setLoading(false)
  }, [presentationId, handleApiCall])

  useEffect(() => {
    if (open && presentationId) {
      loadAnalytics()
    }
  }, [open, presentationId, loadAnalytics])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--'
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconChartBar className="w-5 h-5 text-primary-500" />
            Analytics: {presentationTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : !analytics ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-500">
            <IconChartBar className="w-12 h-12 mb-2 opacity-30" />
            <p>No analytics data available</p>
            <p className="text-xs mt-1">Analytics will appear once the presentation is viewed</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={IconEye}
                label="Total Views"
                value={analytics.stats.total_views}
                color="primary"
              />
              <StatCard
                icon={IconUsers}
                label="Unique Viewers"
                value={analytics.stats.unique_viewers}
                color="secondary"
              />
              <StatCard
                icon={IconClock}
                label="Avg. Duration"
                value={formatDuration(analytics.stats.avg_duration_seconds)}
                color="warning"
              />
              <StatCard
                icon={IconDownload}
                label="Exports"
                value={analytics.stats.total_exports}
                color="success"
              />
            </div>

            {/* Time-based stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                  <IconCalendar className="w-4 h-4" />
                  <span className="text-xs">Today</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {analytics.stats.views_today}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                  <IconTrendingUp className="w-4 h-4" />
                  <span className="text-xs">This Week</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {analytics.stats.views_this_week}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                  <IconShare className="w-4 h-4" />
                  <span className="text-xs">Shared Views</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {analytics.stats.share_views}
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <IconTrendingUp className="w-4 h-4" />
                Views Over Time (Last 30 Days)
              </h3>
              <MiniChart data={analytics.daily_data} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
