function log(message) {
  console.log(`⚙ ${message}`)
}

function success(message) {
  console.log(`✔ ${message}`)
}

function error(message) {
  console.error(`❌ ${message}`)
}

module.exports = { log, success, error }