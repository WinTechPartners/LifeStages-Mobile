import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = process.env.NEXT_PUBLIC_API_BASE_URL
if (!backend || new URL(backend).protocol !== 'https:') throw new Error('Set NEXT_PUBLIC_API_BASE_URL to the HTTPS LifeStages backend before building.')
const stage = fs.mkdtempSync(path.join(root, '.mobile-build-'))
// Build a client-only copy. The server app and API routes stay in the source repository.
for (const folder of ['app', 'components', 'context', 'lib', 'public', 'types']) {
  fs.cpSync(path.join(root, folder), path.join(stage, folder), { recursive: true,
    filter: source => source !== path.join(root, 'app', 'api') })
}
for (const file of ['package.json', 'next.config.mjs', 'tsconfig.json', 'postcss.config.mjs', 'components.json']) {
  fs.copyFileSync(path.join(root, file), path.join(stage, file))
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(stage, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
const build = spawnSync(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build', '--webpack'], {
  cwd: stage, stdio: 'inherit', env: { ...process.env, BUILD_TARGET: 'mobile', NEXT_TELEMETRY_DISABLED: '1' },
})
if (build.status !== 0) { console.error(`Mobile build failed; diagnostic copy preserved at ${stage}`); process.exit(build.status || 1) }
if (!fs.existsSync(path.join(stage, 'out', 'index.html'))) throw new Error('Mobile export did not contain index.html')
const output = path.join(root, 'out')
if (fs.existsSync(output)) fs.renameSync(output, path.join(root, `.mobile-out-backup-${Date.now()}`))
fs.cpSync(path.join(stage, 'out'), output, { recursive: true })
console.log(`Locally bundled mobile UI is ready at ${output}`)
