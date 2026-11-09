import {timingSafeEqual} from 'node:crypto'
export function authorizedWarmup(supplied:unknown,env:Record<string,string|undefined>=process.env){const expected=env.WARMUP_SECRET||env.CRON_SECRET||'';return typeof supplied==='string'&&expected.length>=32&&Buffer.byteLength(supplied)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))}
