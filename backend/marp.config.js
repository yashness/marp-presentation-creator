const path = require('path')
const marpKrokiPlugin = require('./kroki-plugin')

const baseDir = __dirname

module.exports = {
  themeSet: [
    path.join(baseDir, 'themes', '*.css'),
    path.join(baseDir, 'data', 'theme_cache', '*.css'),
  ],
  engine: ({ marp }) => marp.use(marpKrokiPlugin),
}
