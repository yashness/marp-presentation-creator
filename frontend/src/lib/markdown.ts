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
