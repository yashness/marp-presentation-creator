const path = require('path')
const marpKrokiPlugin = require('./kroki-plugin')

const baseDir = __dirname

/** @type {import('@marp-team/marp-cli').Config} */
module.exports = {
  // Theme directories
  themeSet: [
    path.join(baseDir, 'themes', '*.css'),
    path.join(baseDir, 'data', 'theme_cache', '*.css'),
  ],

  // Engine configuration with Kroki plugin
  engine: ({ marp }) => marp.use(marpKrokiPlugin),

  // PPTX export: enable editable mode (requires LibreOffice)
  pptxEditable: true,

  // PDF options
  pdfOutlines: {
    pages: true,     // Include page outline in PDF
    headings: true,  // Include heading outline in PDF
  },

  // Engine options for better rendering
  options: {
    markdown: {
      breaks: true,   // Convert newlines to <br>
    },
  },
}
