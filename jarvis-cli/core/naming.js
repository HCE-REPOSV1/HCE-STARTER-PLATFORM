const { GENERATOR_CONFIG } = require("../utils/constants")

function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function buildServiceName(domain, type = GENERATOR_CONFIG.defaultType) {
  const prefix =
    type === "channel"
      ? GENERATOR_CONFIG.prefix.channel
      : GENERATOR_CONFIG.prefix.business

  return `${prefix}-${domain}`
}

module.exports = {
  toPascalCase,
  buildServiceName
}