/**
 * generate-backend.js
 * Author: Gregorovichz Carlos Rossi
 * ----------------------------------------------------
 * Command: Genera microservicios NestJS (Hexagonal)
 */

const path = require("path")

const { readDirSafe } = require("../core/file-system")
const { log, error, success } = require("../core/logger")

const generateMicroservices = require("../generators/microservice")

module.exports = function generateBackend() {
  log("Generating Hexagonal NestJS backend")

  const domainsPath = path.join(process.cwd(), "api", "domains")

  // Validación robusta
  const domainFiles = readDirSafe(domainsPath)

  if (!domainFiles.length) {
    error("No domains found in api/domains")
    return
  }

  // Filtrar solo YAML (mejora importante)
  const domains = domainFiles.filter(file => file.endsWith(".yaml"))

  if (!domains.length) {
    error("No valid domain files (.yaml) found")
    return
  }

  // 🔥 Delegación total al generator
  generateMicroservices(domains)

  success("Backend generation completed")
}