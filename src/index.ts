import { plugin, type BunPlugin, type Loader } from "bun"
import { randomBytes as _randomBytes, createHash } from 'crypto'
import fs from 'fs/promises'
import { resolvePath, validateDependency } from "./util"
import { loadEntry } from "./entry"
import { resolveScript } from "./script"
import { resolveTemplate } from "./template"
import { resolveStyle } from "./style"
import { parse as parse2 } from "querystring"

validateDependency()

const randomBytesClassic = _randomBytes

function randomBytes(seed: string | Buffer = randomBytesClassic(32)) {
  randomBytes.seed = seed
  randomBytes.currentSeed = seed

  return randomBytes

  function randomBytes(n: number) {
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

function next(seed: string | Buffer) {
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

const namespace = 'vue-script'

export function pluginVue3(): BunPlugin {
  return {
    name: "vue loader",
    setup(build) {
      const isProd = process.env.NODE_ENV === "production"

      let lang: Loader = 'js'
      const generatedCSS: string[] = []
      const opts = {} as Record<string, any>
      const random = randomBytes(typeof opts.scopeId === "object" && typeof opts.scopeId.random === "string" ? opts.scopeId.random : undefined)

      build.onLoad({ filter: /\.vue$/ }, async args => {
        const filename = args.path
        const source = await fs.readFile(filename, 'utf8')
        const { code } = loadEntry(source, filename)
        return {
          contents: code,
        }
      })

      build.onLoad({ filter: /\.vue\?type=script/ }, args => {
        console.log('args ->', args)
        const [filename, dirname] = resolvePath(args.path)
        const { code, error, isTs } = resolveScript(
          filename,
          undefined,
          undefined,
          isProd
        )
        return {
          contents: code,
          errors: error,
          resolveDir: dirname,
          loader: isTs ? 'ts' : 'js'
        }
      })

      build.onResolve({ filter: /\.vue\?type=template/ }, args => {
        return {
          path: args.path,
          namespace: 'vue-template'
        }
      })

      build.onLoad({ filter: /.*/, namespace: 'vue-template' }, args => {
        const [filename, dirname] = resolvePath(args.path)
        const { code, errors } = resolveTemplate(
          filename,
          undefined,
          isProd
        )
        return {
          contents: code,
          errors,
          resolveDir: dirname
        }
      })

      build.onLoad({ filter: /\.vue\?type=style/ }, async args => {
        console.log('hola')
        const [filename, dirname, query] = resolvePath(args.path)
        const { index, isModule, isNameImport } = parse2(query)
        const moduleWithNameImport = !!(isModule && isNameImport)
        const { styleCode, errors } = await resolveStyle(
          filename,
          undefined,
          Number(index),
          !!isModule,
          moduleWithNameImport,
          isProd
        )
        return {
          contents: styleCode,
          errors,
          resolveDir: dirname,
          loader: moduleWithNameImport ? 'json' : 'json'
        }
      })
    },
  }
}

export default plugin(pluginVue3())
