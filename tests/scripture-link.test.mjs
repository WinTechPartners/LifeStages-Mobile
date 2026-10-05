import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveScriptureLink } from '../lib/scripture-link.ts'
const books = [{name:'John',chapters:21},{name:'1 Corinthians',chapters:16}]
test('sermon scripture links resolve exact books and chapter/verse ranges', () => {
  assert.deepEqual(resolveScriptureLink('John 3:16–18', books), {book:books[0],chapter:3,firstVerse:16,lastVerse:18})
  assert.equal(resolveScriptureLink('1 Corinthians 13', books)?.chapter,13)
  assert.equal(resolveScriptureLink(' john 3:16 ', books)?.firstVerse,16)
})
test('ambiguous references and out-of-range chapters never open a different passage', () => {
  for (const value of ['John 22','John 0','John 3:0','John 3:18-16','Unknown 1','John 3; 1 Corinthians 13','John 3:16-4:2']) assert.equal(resolveScriptureLink(value, books),null)
})
