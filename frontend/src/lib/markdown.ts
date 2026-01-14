export function setFrontmatterValue(content: string, key: string, value: string): string {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const fm = fmMatch ? fmMatch[1] : ''
  const body = fmMatch ? content.slice(fmMatch[0].length) : content
  const lines = fm ? fm.split('\n') : []
  let updated = false
  const newLines = lines.map(line => {
    if (line.trim().startsWith(`${key}:`)) {
      updated = true
      return `${key}: ${value}`
    }
    return line
  })
  if (!updated) {
    newLines.push(`${key}: ${value}`)
  }
  const fmBlock = ['---', ...newLines.filter(Boolean), '---'].join('\n')
  return `${fmBlock}${body}`
}

export interface SlideBlock {
  id: string
  content: string
  comment?: string
}

export interface ParsedSlides {
  frontmatter: Record<string, string>
  slides: SlideBlock[]
}

function stripQuotes(value: string): string {
  return value.replace(/^"(.*)"$/, '$1')
}

function serializeFrontmatter(frontmatter: Record<string, string>): string {
  const preferredOrder = ['marp', 'title', 'theme', 'paginate', 'footer']
  const merged = { ...frontmatter }
  merged.marp = merged.marp || 'true'
  const orderedEntries = [
    ...preferredOrder
      .filter(key => merged[key] !== undefined)
      .map(key => [key, merged[key] as string]),
    ...Object.entries(merged).filter(([key]) => !preferredOrder.includes(key)),
  ]

  const lines = orderedEntries
    .filter(([, value]) => value !== undefined)
    .map(([key, rawValue]) => {
      const value = String(rawValue ?? '')
      if (value.includes('\n')) {
        const indented = value.split('\n').map(line => `  ${line}`).join('\n')
        return `${key}: |\n${indented}`
      }
      return `${key}: ${value}`
    })

  return `---\n${lines.join('\n')}\n---`
}

export function parseFrontmatter(content: string): { frontmatter: Record<string, string>, body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\s*/)
  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const lines = match[1].split('\n')
  const frontmatter: Record<string, string> = {}

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }

    const blockScalar = line.match(/^([A-Za-z0-9_-]+):\s*\|\s*$/)
    if (blockScalar) {
      const key = blockScalar[1]
      i++
      const valueLines: string[] = []
      while (i < lines.length) {
        const next = lines[i]
        if (next.startsWith(' ') || next.startsWith('\t') || next.trim() === '') {
          const stripped = next.startsWith('  ')
            ? next.slice(2)
            : next.replace(/^\t/, '')
          valueLines.push(stripped)
          i++
        } else {
          break
        }
      }
      frontmatter[key] = valueLines.join('\n')
      continue
    }

    const kv = line.match(/^([^:]+):\s*(.*)$/)
    if (kv) {
      const key = kv[1].trim()
      const rawValue = kv[2] ?? ''
      frontmatter[key] = stripQuotes(rawValue.trim())
    }
    i++
  }

  const body = content.slice(match[0].length)
  return { frontmatter, body }
}

function parseSlideContent(raw: string, index: number): SlideBlock {
  let comment = ''
  let body = raw
  const commentMatch = raw.match(/^<!--\s*slide-comment:\s*([\s\S]*?)\s*-->\s*\n?/i)
  if (commentMatch) {
    comment = commentMatch[1]
    body = raw.slice(commentMatch[0].length)
  }
  return {
    id: `slide-${index}`,
    content: body,
    comment: comment,
  }
}

export function parseSlides(content: string): ParsedSlides {
  const { frontmatter, body } = parseFrontmatter(content)
  const normalizedBody = body.startsWith('\n') ? body.slice(1) : body
  const rawSlides = normalizedBody ? normalizedBody.split(/\n---\s*\n/) : []
  const slides = rawSlides.length > 0 ? rawSlides.map(parseSlideContent) : [{
    id: 'slide-0',
    content: '',
    comment: '',
  }]

  return {
    frontmatter,
    slides,
  }
}

function buildSlideBlock(slide: SlideBlock): string {
  const parts = []
  if (slide.comment && slide.comment.trim().length > 0) {
    parts.push(`<!-- slide-comment:\n${slide.comment}\n-->`)
  }
  parts.push(slide.content || '# New Slide')
  return parts.join('\n')
}

export function serializeSlides(frontmatter: Record<string, string>, slides: SlideBlock[]): string {
  const fm = serializeFrontmatter(frontmatter)
  const slideStrings = slides.map(buildSlideBlock)
  const body = slideStrings.join('\n\n---\n\n')
  return `${fm}\n\n${body}`
}
