import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import {
  fetchTemplates,
  fetchTemplateCategories,
  Template,
  TemplateCategory,
} from '../api/client'
import {
  Briefcase,
  GraduationCap,
  Code,
  Megaphone,
  RefreshCw,
  FileText,
  Loader2,
  Check,
  ArrowRight,
} from 'lucide-react'

interface TemplateLibraryProps {
  open: boolean
  onClose: () => void
  onSelect: (template: Template) => void
}

const categoryIcons: Record<string, React.ReactNode> = {
  Business: <Briefcase className="w-4 h-4" />,
  Education: <GraduationCap className="w-4 h-4" />,
  Technical: <Code className="w-4 h-4" />,
  Marketing: <Megaphone className="w-4 h-4" />,
  Agile: <RefreshCw className="w-4 h-4" />,
}

const categoryColors: Record<string, string> = {
  Business: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Education: 'bg-green-500/20 text-green-400 border-green-500/30',
  Technical: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Marketing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Agile: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

export function TemplateLibrary({ open, onClose, onSelect }: TemplateLibraryProps) {
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cats, tmpls] = await Promise.all([
        fetchTemplateCategories(),
        fetchTemplates(),
      ])
      setCategories(cats)
      setTemplates(tmpls)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === selectedCategory)

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate)
      onClose()
      setSelectedTemplate(null)
    }
  }

  const getSlideCount = (content: string): number => {
    return (content.match(/^---$/gm) || []).length
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <FileText className="w-5 h-5 text-sky-400" />
            Template Library
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          </div>
        ) : (
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="bg-slate-800 border border-slate-700 mb-4">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400"
              >
                All ({templates.length})
              </TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.name}
                  value={cat.name}
                  className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400 flex items-center gap-1.5"
                >
                  {categoryIcons[cat.name]}
                  {cat.name} ({cat.count})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-0">
              <div className="flex gap-4 h-[500px]">
                {/* Template List */}
                <ScrollArea className="w-1/2 pr-4">
                  <div className="space-y-3">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'bg-sky-500/20 border-sky-500/50 ring-1 ring-sky-500/30'
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white">
                            {template.name}
                          </h3>
                          {selectedTemplate?.id === template.id && (
                            <Check className="w-5 h-5 text-sky-400" />
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={categoryColors[template.category]}
                          >
                            {categoryIcons[template.category]}
                            <span className="ml-1">{template.category}</span>
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-slate-700/50 text-slate-300 border-slate-600"
                          >
                            {getSlideCount(template.content)} slides
                          </Badge>
                          {template.theme_id && (
                            <Badge
                              variant="outline"
                              className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                            >
                              {template.theme_id}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Template Preview */}
                <div className="w-1/2 border-l border-slate-700 pl-4">
                  {selectedTemplate ? (
                    <div className="h-full flex flex-col">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {selectedTemplate.name}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {selectedTemplate.description}
                        </p>
                      </div>
                      <ScrollArea className="flex-1 rounded-lg bg-slate-950 border border-slate-800">
                        <pre className="p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap">
                          {selectedTemplate.content.slice(0, 2000)}
                          {selectedTemplate.content.length > 2000 && '...'}
                        </pre>
                      </ScrollArea>
                      <Button
                        onClick={handleSelect}
                        className="mt-4 bg-sky-500 hover:bg-sky-600 text-white"
                      >
                        Use This Template
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      <div className="text-center">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Select a template to preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
