import type { BunPlugin } from 'bun'
import { getId } from './cache'
import { resolvePath, validateDependency, buildJsModule } from './util'
import { loadEntry } from './entry'
import { resolveScript } from './script'
import { resolveTemplate } from './template'
import { resolveStyle } from './style'
import { parse as parseQuery } from 'querystring'

validateDependency()

interface VueLoaderOptions {
  scriptOptions?: {}
  templateOptions?: {}
  styleOptions?: {}
}

const vueLoader = ({
  scriptOptions,
  templateOptions,
  styleOptions,
}: VueLoaderOptions = {}): BunPlugin => ({
  name: 'vueLoader',
  setup(build) {
    const isProd = process.env.NODE_ENV === 'production'

    build.onLoad({ filter: /\.vue$/ }, async (args) => {
      const filename = args.path
      let file: Bun.BunFile

      try {
        file = Bun.file(filename)
        const source = await file.text()
        const { code } = loadEntry(source, filename)

        return {
          contents: code,
        }
      } catch (error) {
        console.error(`[VueLoader] error on load Vue ${file!.name}: ${error}`)
      }
    })

    /**
     * Reference: {@link https://github.com/tsukkee/bun-plugin-vue3-prototype/blob/92b7d787302eea99377ae95dba58e560271b77b2/bun-vue-plugin.ts#L8C1-L34C8}
     */
    build.onResolve({ filter: /\.vue/ }, (args) => {
      const paramsString = args.path.split('?')[1]
      const params = new URLSearchParams(paramsString)
      const type = params.get('type')

      switch (type) {
        case 'script':
          return {
            path: args.path,
            namespace: 'sfc-script',
          }
        case 'template':
          return {
            path: args.path,
            namespace: 'sfc-template',
          }
        case 'style':
          return {
            path: args.path,
            namespace: 'sfc-style',
          }
        default:
          return
      }
    })

    /**
     * Reference: {@link https://github.com/tsukkee/bun-plugin-vue3-prototype/blob/92b7d787302eea99377ae95dba58e560271b77b2/bun-vue-plugin.ts#L41C5-L51C8}
     */
    build.onLoad({ filter: /.*/, namespace: 'sfc-script' }, async (args) => {
      const [filename, dirname] = resolvePath(args.path)
      const { code, error, isTs } = resolveScript(filename!, scriptOptions, undefined, isProd)

      return {
        contents: code,
        errors: error,
        resolveDir: dirname,
        loader: isTs ? 'tsx' : 'js',
      }
    })

    /**
     * Reference: {@link https://github.com/tsukkee/bun-plugin-vue3-prototype/blob/92b7d787302eea99377ae95dba58e560271b77b2/bun-vue-plugin.ts#L53C5-L73C8}
     */
    build.onLoad({ filter: /.*/, namespace: 'sfc-template' }, async (args) => {
      const [filename, dirname] = resolvePath(args.path)
      const { code, errors } = resolveTemplate(filename!, templateOptions, isProd)

      return {
        contents: code,
        errors,
        resolveDir: dirname,
        loader: 'tsx',
      }
    })

    /**
     * Reference: {@link https://github.com/tsukkee/bun-plugin-vue3-prototype/blob/92b7d787302eea99377ae95dba58e560271b77b2/bun-vue-plugin.ts#L75C5-L91C8}
     */
    build.onLoad({ filter: /.*/, namespace: 'sfc-style' }, async (args) => {
      const [filename, dirname, query] = resolvePath(args.path)
      const { index, isModule, isNameImport } = parseQuery(query!)
      const moduleWithNameImport = !!(isModule && isNameImport)
      const id = getId(filename!)
      const { styleCode, errors } = await resolveStyle(
        filename!,
        styleOptions,
        Number(index),
        !!isModule,
        moduleWithNameImport,
        isProd,
      )

      return {
        contents: buildJsModule(styleCode, `sfc-style-${id}-${index}`),
        errors,
        resolveDir: dirname,
        loader: 'js',
      }
    })
  },
})
export default vueLoader
