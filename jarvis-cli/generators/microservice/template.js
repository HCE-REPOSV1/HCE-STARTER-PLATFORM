const path = require("path")
const fs = require("fs")

const { ensureDir } = require("../../core/file-system")
const { render } = require("../../core/template-engine")

function copyBaseMicroservice(targetPath, serviceName) {
  const templatePath = path.join(
    __dirname,
    "..",
    "..",
    "templates",
    "microservice"
  )

  copyRecursive(templatePath, targetPath, {
    SERVICE_NAME: serviceName
  })
}

function copyRecursive(src, dest, variables = {}) {
  ensureDir(dest)

  const entries = fs.readdirSync(src)

  entries.forEach(entry => {
    const srcPath = path.join(src, entry)
    const destPath = path.join(dest, entry)

    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath, variables)
    } else {
      const content = fs.readFileSync(srcPath, "utf8")
      const rendered = render(content, variables)

      fs.writeFileSync(destPath, rendered)
    }
  })
}

module.exports = {
  copyBaseMicroservice
}