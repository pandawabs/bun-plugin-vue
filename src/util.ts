import path from 'node:path'

export function validateDependency() {
  try {
    import.meta.resolve('vue')
  } catch {
    throw new Error('Vue has not been installed')
  }
}

export function resolvePath(filePath: string) {
  const [filename, query] = filePath.split('?', 2)
  const dirname = path.dirname(filename!)

  return [filename, dirname, query]
}

/**
 * Builds a JS module by calling a method that adds the CSS content to the DOM, if the
 * document object is available.
 * Reference: {@link https://github.com/Bytenote/bun-css-loader/blob/a018be2aa2950fa6ec5f9fb500dc18b8b8761b81/src/utils.ts#L78C1-L95C2}
 *
 * @param content CSS content
 * @param styleId Optional style tag ID
 *
 * @returns JS module content
 */
export function buildJsModule(cssContent: string, styleId: string = 'css-loader-styles'): string {
  const strCssVar = `let css = ${JSON.stringify(cssContent)};`
  const strMethodAction = `
    if(head) {
      if(!styleElem) {
        head.insertAdjacentHTML('beforeend', \`<style id="${styleId}">\${content}</style>\`);
      }
      else {
        styleElem.textContent += \`\${content}\`;
      }
    } `
  const strMethod = `
    function injectCss(content) {
      const head = document.head ?? document.getElementsByTagName('head')[0];
      const styleElem = document.getElementById('${styleId}');
      ${strMethodAction} 
    }
    if(document) { injectCss(css); }
  `
  const strExport = 'export default css'
  const jsCode = [strCssVar, strMethod, strExport].filter(Boolean).join('\n\n')

  return jsCode
}
