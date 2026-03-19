const path = require("path")
const { writeFile } = require("../../core/file-system")
const { toPascalCase } = require("../../core/naming")
module.exports.generateDomainLayer = (src, domain) => {
  const Domain = toPascalCase(domain)
  writeFile(
    path.join(src, "domain/entities", `${domain}.entity.ts`),
    `
export class ${Domain} {
  id!: string
  name!: string
}
`
  )

  writeFile(
    path.join(src, "domain/repositories", `${domain}.repository.ts`),
    `
import { ${Domain} } from '../entities/${domain}.entity'

export interface ${Domain}Repository {
  save(entity: ${Domain}): Promise<void>
  findById(id: string): Promise<${Domain} | null>
}
`
  )
}