const path = require("path")
const { writeFile } = require("../../core/file-system")
const { toPascalCase } = require("../../core/naming")

module.exports.generateAppModule = (src, domains) => {
  const imports = domains.map(d =>
    `import { ${toPascalCase(d)}Controller } from './infrastructure/controllers/${d}.controller'`
  ).join("\n")

  const controllers = domains.map(d =>
    `${toPascalCase(d)}Controller`
  ).join(",\n")

  writeFile(
    path.join(src, "app.module.ts"),
    `
import { Module } from '@nestjs/common'
${imports}

@Module({
  controllers: [${controllers}]
})
export class AppModule {}
`
  )
}