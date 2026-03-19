function render(template, variables) {
  return Object.keys(variables).reduce((acc, key) => {
    return acc.replace(new RegExp(`{{${key}}}`, "g"), variables[key])
  }, template)
}

module.exports = { render }