import { compileScript } from '@vue/compiler-sfc'
import { getDesCache, getId } from './cache.ts'
import { getTemplateOptions } from './template.ts'
import ts from 'typescript'

export function resolveScript(
  filename: string,
  scriptOptions = {},
  templateOptions = {},
  isProd: boolean
) {
  const descriptor = getDesCache(filename)
  const error: any[] = []
  let warnings: any[] = []
  const { script, scriptSetup } = descriptor
  const isTs = (script && script.lang === 'ts') || (scriptSetup && scriptSetup.lang === 'ts')
  let code = 'export default {}'

  if (!descriptor.script && !descriptor.scriptSetup) {
    return { code }
  }
  const scopeId = getId(filename)

  try {
    const res = compileScript(descriptor, {
      ...scriptOptions,
      id: scopeId,
      isProd,
      inlineTemplate: true,
      templateOptions: descriptor.template ? getTemplateOptions(descriptor, templateOptions, isProd) : undefined,
      fs: ts.sys
    })
    code = res.content
    warnings = res.warnings!
  } catch (e: any) {
    error.push({
      text: e.message
    })
  }

  return {
    code,
    error,
    warnings,
    isTs
  }
}
