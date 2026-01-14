import type { ThemeCreatePayload } from '../api/client'

export const DEFAULT_THEME_TEMPLATE: ThemeCreatePayload = {
  name: 'Custom Theme',
  description: 'A tailored Marp look with crisp contrast and modern typography',
  colors: {
    background: '#0b1024',
    text: '#e2e8f0',
    h1: '#0ea5e9',
    h2: '#7c3aed',
    h3: '#0ea5e9',
    link: '#38bdf8',
    code_background: '#0f172a',
    code_text: '#e2e8f0',
    code_block_background: '#111827',
    code_block_text: '#e5e7eb',
  },
  typography: {
    font_family: 'Sora, "Helvetica Neue", sans-serif',
    font_size: '28px',
    h1_size: '52px',
    h1_weight: '700',
    h2_size: '38px',
    h2_weight: '700',
    h3_size: '30px',
    h3_weight: '600',
    code_font_family: '"JetBrains Mono", monospace',
  },
  spacing: {
    slide_padding: '64px',
    h1_margin_bottom: '24px',
    h2_margin_top: '18px',
    code_padding: '2px 10px',
    code_block_padding: '18px',
    border_radius: '10px',
    code_block_border_radius: '12px',
  },
}
