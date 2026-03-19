const fs = require("fs")
const path = require("path")

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content.trim())
}

function readDirSafe(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
}

module.exports = {
  ensureDir,
  writeFile,
  readDirSafe
}