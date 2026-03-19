const path = require("path")
const { ensureDir } = require("../../core/file-system")

function createStructure(src) {
  const folders = [
    "domain/entities",
    "domain/repositories",
    "application/use-cases",
    "infrastructure/controllers",
    "infrastructure/persistence",
    "dto"
  ]

  folders.forEach(folder => {
    ensureDir(path.join(src, folder))
  })
}

module.exports = {
  createStructure
}