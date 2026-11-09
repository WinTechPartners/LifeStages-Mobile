import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),ts=require('typescript')
function fixture(native,completed=true){
 const calls=[],opened={opener:'old'},exports={};
 const code=ts.transpileModule(fs.readFileSync(new URL('../lib/external-links.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(code,{exports,URL,require:id=>id==='@capacitor/app-launcher'?{AppLauncher:{openUrl:async input=>{calls.push(['native',input.url]);return{completed}}}}:{isNative:()=>native},window:{open:(...args)=>{calls.push(['web',...args]);return opened}}})
 return {api:exports,calls,opened}
}
test('iPhone music links use the native OS launcher rather than web popups',async()=>{
 const f=fixture(true);await f.api.openMusicLink('https://www.youtube.com/results?search_query=Amazing+Grace');await f.api.openMusicLink('https://open.spotify.com/search/Amazing%20Grace');assert.equal(f.calls.length,2);assert.ok(f.calls.every(c=>c[0]==='native'))
})
test('failed native launches surface an error without navigating the app',async()=>{
 const f=fixture(true,false);await assert.rejects(f.api.openMusicLink('https://youtu.be/dQw4w9WgXcQ'),/Unable to open/);assert.equal(f.calls.length,1)
})
test('malformed or unsupported music links never reach the launcher',async()=>{
 const f=fixture(true);for(const url of ['javascript:alert(1)','https://youtube.com.evil.example/watch','https://user:pass@youtube.com/watch','http://youtube.com/watch']) await assert.rejects(f.api.openMusicLink(url));assert.equal(f.calls.length,0)
})
test('web music links open a separate tab and remove its opener',async()=>{
 const f=fixture(false);await f.api.openMusicLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ');assert.equal(f.calls[0][0],'web');assert.equal(f.calls[0][2],'_blank');assert.equal(f.opened.opener,null)
})
