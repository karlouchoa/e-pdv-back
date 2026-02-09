from pathlib import Path
import re
base = Path('tmp_inventory_head.ts').read_bytes().decode('utf-8', errors='replace')
base = base.replace("import { BadRequestException, Injectable } from '@nestjs/common';",
                    "import { BadRequestException, Injectable, Logger } from '@nestjs/common';")
base = base.replace("private readonly companyCache = new Map<string, number>();",
                    "private readonly companyCache = new Map<string, number>();\n  private readonly logger = new Logger('InventoryService');")
base = re.sub(r"const warehouseInput = dto\.warehouse\?\.trim\(\);\s*\n\s*let empresa;\s*\n\s*let warehouseLabel = warehouseInput \?\? '';",
              "const warehouseInput = dto.warehouse?.trim();\n    let empresa;\n    let warehouseLabel = warehouseInput ?? '';\n\n    this.logger.debug(`[createMovement] tenant=${tenant} warehouseInput='${warehouseInput}' payloadWarehouseRaw='${dto.warehouse}'`);",
              base)
base = re.sub(r"empresa = await prisma\.t_emp\.findFirst\({\s*\n\s*where: \{ \.\.\.whereCompany, NOT: \{ isdeleted: true \} \ },\s*\n\s*\}\);",
              "empresa = await prisma.t_emp.findFirst({\n      where: { ...whereCompany, NOT: { isdeleted: true } },\n    });\n\n    this.logger.debug(`[createMovement] companyLookup where=${JSON.stringify(whereCompany)} result=${empresa ? `cdemp=${empresa.cdemp} ID=${empresa.ID}` : 'null'}`);",
              base)
base = re.sub(r"empresa = await prisma\.t_emp\.findFirst\({\s*\n\s*where: \{ cdemp: defaultCdemp, NOT: \{ isdeleted: true \} \ },\s*\n\s*\}\);",
              "empresa = await prisma.t_emp.findFirst({\n      where: { cdemp: defaultCdemp, NOT: { isdeleted: true } },\n    });\n\n    this.logger.debug(`[createMovement] companyByDefault defaultCdemp=${defaultCdemp} result=${empresa ? `cdemp=${empresa.cdemp} ID=${empresa.ID}` : 'null'}`);",
              base)
base = base.replace("// console.log('Empresa selecionada:', empresa);\n\n    if (!empresa) {",
                   "// console.log('Empresa selecionada:', empresa);\n\n    // Fallback: se o cdemp informado nao existir, tenta usar o almoxarifado padrao do tenant\n    if (!empresa) {\n      const defaultCdemp = await this.getCompanyId(tenant, prisma);\n      warehouseLabel = warehouseLabel || defaultCdemp.toString();\n      empresa = await prisma.t_emp.findFirst({\n        where: { cdemp: defaultCdemp, NOT: { isdeleted: true } },\n      });\n\n      this.logger.warn(`[createMovement] companyFallback triggered input='${warehouseInput}' defaultCdemp=${defaultCdemp} result=${empresa ? `cdemp=${empresa.cdemp} ID=${empresa.ID}` : 'null'}`);\n    }\n\n    if (!empresa) {")
Path('src/inventory/inventory.service.ts').write_text(base, encoding='utf-8')
