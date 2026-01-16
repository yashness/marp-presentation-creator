import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import {
  createShareLink,
  getShareLinks,
  revokeShareLink,
} from '../api/client'
import type { ShareLink } from '../api/client'
import {
  Link,
  Copy,
  Check,
  Trash2,
  Loader2,
  Globe,
  Lock,
  Calendar,
  Eye,
  Plus,
} from 'lucide-react'

interface ShareModalProps {
  open: boolean
  onClose: () => void
  presentationId: string | null
  presentationTitle: string
}

export function ShareModal({ open, onClose, presentationId, presentationTitle }: ShareModalProps) {
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // New link options
  const [isPublic, setIsPublic] = useState(true)
  const [password, setPassword] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<string>('')
  const [showNewLinkForm, setShowNewLinkForm] = useState(false)

  const loadLinks = useCallback(async () => {
    if (!presentationId) return
    setLoading(true)
    try {
      const data = await getShareLinks(presentationId)
      setLinks(data)
    } catch (error) {
      console.error('Failed to load share links:', error)
    } finally {
      setLoading(false)
    }
  }, [presentationId])

  useEffect(() => {
    if (open && presentationId) {
      loadLinks()
    }
  }, [open, presentationId, loadLinks])

  const handleCreate = async () => {
    if (!presentationId) return
    setCreating(true)
    try {
      const newLink = await createShareLink({
        presentation_id: presentationId,
        is_public: isPublic,
        password: password || null,
        expires_in_days: expiresInDays ? parseInt(expiresInDays, 10) : null,
      })
      setLinks([newLink, ...links])
      setShowNewLinkForm(false)
      setPassword('')
      setExpiresInDays('')
      setIsPublic(true)
    } catch (error) {
      console.error('Failed to create share link:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (linkId: string) => {
    if (!confirm('Revoke this share link?')) return
    try {
      await revokeShareLink(linkId)
      setLinks(links.filter((l) => l.id !== linkId))
    } catch (error) {
      console.error('Failed to revoke share link:', error)
    }
  }

  const handleCopy = async (link: ShareLink) => {
    await navigator.clipboard.writeText(link.share_url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <Link className="w-5 h-5 text-sky-400" />
            Share Presentation
          </DialogTitle>
          <p className="text-sm text-slate-400 mt-1">{presentationTitle}</p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Create New Link Section */}
          {!showNewLinkForm ? (
            <Button
              onClick={() => setShowNewLinkForm(true)}
              className="w-full bg-sky-500 hover:bg-sky-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Share Link
            </Button>
          ) : (
            <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 space-y-4">
              <h3 className="font-medium text-white">New Share Link</h3>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPublic ? (
                    <Globe className="w-4 h-4 text-green-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-yellow-400" />
                  )}
                  <Label className="text-slate-300">Public Access</Label>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              <div>
                <Label className="text-slate-300">Password (optional)</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank for no password"
                  className="mt-1 bg-slate-700 border-slate-600"
                />
              </div>

              <div>
                <Label className="text-slate-300">Expires in days (optional)</Label>
                <Input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  placeholder="Leave blank for no expiry"
                  min="1"
                  className="mt-1 bg-slate-700 border-slate-600"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 bg-sky-500 hover:bg-sky-600"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Link className="w-4 h-4 mr-2" />
                  )}
                  Create Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNewLinkForm(false)}
                  className="border-slate-600"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing Links */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400">Active Links</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No share links yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {link.is_public ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Globe className="w-3 h-3 mr-1" />
                            Public
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            <Lock className="w-3 h-3 mr-1" />
                            Private
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(link)}
                          className="h-8 w-8 p-0"
                        >
                          {copiedId === link.id ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevoke(link.id)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {link.view_count} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expires: {formatDate(link.expires_at)}
                        </span>
                      </div>
                      <div className="font-mono text-slate-500 truncate">
                        {link.share_url}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
