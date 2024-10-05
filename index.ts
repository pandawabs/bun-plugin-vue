import { plugin, type BunPlugin, type Loader } from "bun"
import core from '@vue/compiler-core'
import { randomBytes as _randomBytes, createHash } from 'crypto'
import fs from 'fs/promises'
import fs2 from 'fs'
import path from 'path'
import ts from 'typescript'
import { compileScript, compileStyleAsync, compileTemplate, parse } from 'vue/compiler-sfc'

const randomBytesClassic = _randomBytes

function randomBytes(seed: string | Buffer = randomBytesClassic(32)) {
  randomBytes.seed = seed
  randomBytes.currentSeed = seed

  return randomBytes

  function randomBytes (n: number) {
      var result = Buffer.allocUnsafe(n)
      var used = 0

      while (used < result.length) {
          randomBytes.currentSeed = seed = next(seed)
          seed.copy(result as any, used)
          used += seed.length
      }

      return result
  }
}

function next (seed: string | Buffer) {
  return createHash('sha256').update(seed as any).digest()
}

type Rule = { regex: RegExp, replacement: string }
const rules: Rule[] = []
function replaceRules(path: string): string {
  for (const rule of rules) {
      path = path.replace(rule.regex, rule.replacement)
  }

  return path
}

export function pluginVue3(): BunPlugin {
  return {
    name: "vue loader",
    setup(build) {
      let lang: Loader = 'js'
      const generatedCSS: string[] = []

      build.onLoad({ filter: /\.vue$/ }, async args => {
        const opts = {} as Record<string, any>
        const transforms: Record<string, core.DirectiveTransform> = {}
        const random = randomBytes(typeof opts.scopeId === "object" && typeof opts.scopeId.random === "string" ? opts.scopeId.random : undefined)
  
        const content = await fs.readFile(args.path, 'utf8')
  
        const encPath = args.path.replace(/\\/g, "\\\\")
  
        const filename = path.relative(process.cwd(), args.path)
        
        const id = !opts.scopeId || opts.scopeId === "hash"
            ? createHash("md5").update(filename).digest().toString("hex").substring(0, 8)
            : random(4).toString("hex")
  
        const { descriptor } = parse(content, {
            filename
        })
        const script = (descriptor.script || descriptor.scriptSetup) ? compileScript(descriptor, { id, fs: ts.sys }) : undefined
  
        const dataId = "data-v-" + id
        let code = ""
        
        if (script) {
          lang = script.lang === 'ts' ? 'ts' : 'js'

          if (descriptor.script || descriptor.scriptSetup) {
            const src = (descriptor.script && !descriptor.scriptSetup && descriptor.script.src) || encPath
            code += script?.content.replace("export default ", `const script = `) + ';'
          } else {
            code += "const script = {};"
          }
        }
  
        for (const index in descriptor.styles) {
              const style: import("@vue/compiler-sfc").SFCStyleBlock = descriptor.styles[index]
  
              const result = await compileStyleAsync({
                  filename: args.path,
                  id,
                  source: style.content,
                  postcssOptions: opts.postcss?.options,
                  postcssPlugins: opts.postcss?.plugins,
                  preprocessLang: style.lang as any,
                  preprocessOptions: Object.assign({
                      includePaths: [
                          path.dirname(args.path)
                      ],
                      importer: [
                          (url: string) => {
                              const projectRoot = process.env.npm_config_local_prefix || process.cwd()
                              const modulePath = path.join(projectRoot, "node_modules", url)
  
                              if (fs2.existsSync(modulePath)) {
                                  return { file: modulePath }
                              }
  
                              return null
                          },
                          (url: string) => ({ file: replaceRules(url) })
                      ]
                  }, opts.preprocessorOptions),
                  scoped: style.scoped,
              })
  
              if (result.errors.length > 0) {
                  const errors = result.errors as (Error & { column: number; line: number; file: string })[]
  
                  console.log('css errors ->', errors)
              }
  
              if (opts.cssInline) {
                  if (opts.generateHTML) {
                      generatedCSS.push(result.code)
                      console.log('generatedCSS ->', generatedCSS)
                  }
                  
                  const cssText =  result.code
                  const contents = `
                  {
                      const el = document.createElement("style");
                      el.textContent = ${JSON.stringify(cssText)};
                      document.head.append(el);
                  }`
                  code += contents
              } else {
                // console.log('css ->', result.code)
              }
        }
  
        const renderFuncName = opts.renderSSR ? "ssrRender" : "render"
  
        if (descriptor.template) {
          let source = descriptor.template?.content!
    
          const result = compileTemplate({
              id,
              source,
              filename: args.path,
              scoped: descriptor.styles.some(o => o.scoped),
              slotted: descriptor.slotted,
              ssr: opts.renderSSR,
              ssrCssVars: [],
              isProd: (process.env.NODE_ENV === "production") || false,
              compilerOptions: {
                  inSSR: opts.renderSSR,
                  directiveTransforms: transforms,
                  bindingMetadata: script?.bindings,
                  ...opts.compilerOptions
              }
          })
  
          console.log('tips ->', result.tips)
    
          if (result.errors.length > 0) {
            console.log('template errors ->', result.errors)
          }
  
          code += result.code
          code += `script.${renderFuncName} = ${renderFuncName};`
        }
  
        code += `script.__file = ${JSON.stringify(filename)};`
        if (descriptor.styles.some(style => style.scoped)) {
          code += `script.__scopeId = ${JSON.stringify(dataId)};`
        }
        if (opts.renderSSR) {
          code += "script.__ssrInlineRender = true;"
        }
        
        code += "export default script;"
  
        return {
            loader: lang,
            contents: code,
            resolveDir: path.dirname(args.path),
        }
      })
    },
  }
}

export default plugin(pluginVue3())
