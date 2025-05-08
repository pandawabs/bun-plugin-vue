import { parse } from '@vue/compiler-sfc'
import { setDesCache } from './cache'
import { setId } from './cache'

export function loadEntry(source: string, filename: string) {
  const { descriptor, errors } = parse(source, { filename })

  if (errors.length > 0) {
    console.error(errors)
  }
  setDesCache(filename, descriptor)

  const scopeId = setId(filename)
  const scriptPath = JSON.stringify(`${filename}?type=script`)
  const scriptImportCode = `import script from ${scriptPath}\nexport * from ${scriptPath}`
  let templateImportCode = ''

  if (!descriptor.scriptSetup && descriptor.template) {
    const templatePath = JSON.stringify(`${filename}?type=template`)
    templateImportCode += `import { render } from ${templatePath}\nscript.render = render`
  }
  let styleImportCode = ''
  let hasModuleInject = false

  descriptor.styles.forEach((styleBlock, i) => {
    const stylePath = `${filename}?type=style&index=${i}`

    if (styleBlock.module) {
      if (!hasModuleInject) {
        styleImportCode += `\nscript.__cssModules = cssModules = {}`
        hasModuleInject = true
      }
      const moduleName = typeof styleBlock.module === 'string' ? styleBlock.module : '$style'
      const importVarName = `\nimport __style${i} from ${JSON.stringify(
        `${stylePath}&isModule=true&isNameImport=true`
      )}`
      styleImportCode += `
        \ncssModules[${JSON.stringify(moduleName)}] = ${importVarName}
        \nimport ${JSON.stringify(`${stylePath}&isModule=true`)}
      `
    } else {
      styleImportCode += `\nimport ${JSON.stringify(stylePath)}`
    }
  })

  let scopeIdInject = ''

  if (descriptor.styles.some((styleBlock) => styleBlock.scoped)) {
    scopeIdInject += `script.__scopeId = ${JSON.stringify(scopeId)}`
  }
  const scriptExportCode = 'export default script'
  const code = [
    scriptImportCode,
    templateImportCode,
    styleImportCode,
    scriptExportCode,
    scopeIdInject,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    code,
  }
}
