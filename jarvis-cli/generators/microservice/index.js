const path = require("path")
const { buildServiceName } = require("../../core/naming")
const { log, success } = require("../../core/logger")
const { createStructure } = require("./structure")
const { generateDomainLayer } = require("./domain.generator")
const { generateInfrastructure } = require("./infrastructure.generator")
const { generateAppModule } = require("./module.generator")
const { copyBaseMicroservice } = require("./template")
/**
 * Generator de microservicios
 * @param {string[]} domainFiles
 * @param {object} options
 */
module.exports = function generateMicroservices(domainFiles = [], options = {}) {
  log("Generating microservices...")
  domainFiles.forEach(file => {
    const domain = normalizeDomain(file)
    const Domain = toPascalCase(domain)
    const serviceName = buildServiceName(domain, options.type)
    const serviceRoot = path.join(process.cwd(), "apps", serviceName)
    const src = path.join(serviceRoot, "src")

    // 1. estructura base
    createStructure(src)
    // 2. template base (nest app)
    copyBaseMicroservice(serviceRoot, serviceName)
    // 3. capas
    generateDomainLayer(src, domain, Domain)
    generateInfrastructure(src, domain, Domain)
    // 4. módulo
    generateAppModule(src, [domain])
    success(`Service generated: ${serviceName}`)
  })
}

/* =========================================================
 * HELPERS (deben vivir aquí o en core)
 * ========================================================= */

function normalizeDomain(file) {
  return file.replace(".yaml", "")
}

function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}