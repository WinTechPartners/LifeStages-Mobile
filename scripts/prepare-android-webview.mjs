import fs from 'node:fs'
import path from 'node:path'
import { build, transform } from 'esbuild'
import { parse } from 'acorn'

export async function prepareAndroidWebView(root, output) {
  await build({entryPoints:[path.join(root,'native/android/webview-compat.js')],bundle:true,outfile:path.join(output,'webview-compat.js'),target:'chrome80',format:'iife',minify:true})
  const files = fs.readdirSync(output,{recursive:true}).filter(file=>file.endsWith('.js'))
  for (const relative of files) {
    const file=path.join(output,relative)
    const result=await transform(fs.readFileSync(file,'utf8'),{target:'chrome80',minify:true,legalComments:'none'})
    // Catch unsupported syntax in every shipped chunk before installing on a phone.
    parse(result.code,{ecmaVersion:2020,sourceType:'script',allowReturnOutsideFunction:true})
    fs.writeFileSync(file,result.code)
  }
  for (const relative of fs.readdirSync(output,{recursive:true}).filter(file=>file.endsWith('.html'))) {
    const file=path.join(output,relative)
    fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('<head>','<head><script src="/webview-compat.js"></script>'))
  }
  console.log(`Android WebView compatibility verified across ${files.length} JavaScript files.`)
}
