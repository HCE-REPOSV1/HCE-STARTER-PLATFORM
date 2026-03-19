const path = require("path")
const { writeFile } = require("../../core/file-system")
const { toPascalCase } = require("../../core/naming")

module.exports.generateInfrastructure = (src, domain) => {
  const Domain = toPascalCase(domain)

  writeFile(
    path.join(src, "infrastructure/controllers", `${domain}.controller.ts`),
    `
import { Controller, Get, Post, Param, Body } from '@nestjs/common'

@Controller('${domain}s')
export class ${Domain}Controller {

  @Get()
  findAll() {}

  @Get(':id')
  findOne(@Param('id') id: string) {}

  @Post()
  create(@Body() body: any) {}

}
`
  )

  writeFile(
    path.join(src, "dto", `create-${domain}.dto.ts`),
    `
export class Create${Domain}Dto {
  name!: string
}
`
  )
}