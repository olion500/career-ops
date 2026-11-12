#!/usr/bin/env node
// Explicitly opt-in collection lane. The importer itself NEVER uses network.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { atomic } from './delta.mjs';
import saramin from './providers/saramin.mjs';
import greeting from './providers/greeting.mjs';

export function validatePolicy(config, now = Date.now()) {
  if (!config || !['saramin', 'greeting'].includes(config.provider)) throw new Error('Only official Saramin API or reviewed company Greeting pages are supported. Wanted, Jumpit, Zighang and Inthiswork are disabled in this lane.');
  if (config.enabled !== true) throw new Error('Source is disabled');
  const p = config.access_review;
  if (p?.allowed !== true || !Array.isArray(p.urls) || !p.urls.length || !p.urls.every(x => typeof x === 'string' && /^https:\/\//.test(x)) || !Number.isFinite(Date.parse(p.reviewed_at)) || !Number.isFinite(Date.parse(p.valid_until)) || Date.parse(p.reviewed_at) > now || Date.parse(p.valid_until) <= now || Date.parse(p.valid_until) - Date.parse(p.reviewed_at) > 30 * 86400000) throw new Error('A current source-specific access review is required (maximum 30 days). robots.txt alone is not legal permission.');
  if (!Number.isInteger(config.max_pages) || config.max_pages < 1 || config.max_pages > 5) throw new Error('Set max_pages from 1 to 5');
  if (config.provider === 'greeting' && (!Array.isArray(config.greeting_companies) || !config.greeting_companies.length)) throw new Error('Explicit company list required');
  return config.provider;
}
export async function collect(config, { now = Date.now(), fetchImpl = globalThis.fetch } = {}) {
  const id = validatePolicy(config, now), provider = id === 'saramin' ? saramin : greeting;
  const hosts = new Set(id === 'saramin' ? ['oapi.saramin.co.kr'] : config.greeting_companies.map(x => x.includes('.') ? x : `${x}.career.greetinghr.com`));
  const request = async (url, options = {}) => {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !hosts.has(u.hostname) || u.username || u.password || (u.port && u.port !== '443') || !/^[a-z0-9.-]+$/.test(u.hostname) || !u.hostname.includes('.') || /(^|\.)localhost$|(^|\.)local$|^[\d.]+$/.test(u.hostname)) throw new Error('Request is outside the declared source hosts');
    const r = await fetchImpl(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { ...options.headers, 'User-Agent': 'career-ops-local-kr/1.0 (job-search assistant)' } });
    if (r.status >= 300 && r.status < 400) throw Object.assign(new Error('Source redirect requires allowlisted destination'), { status: r.status, location: r.headers.get('location') });
    if (!r.ok) throw Object.assign(new Error(`Source returned HTTP ${r.status}; stop and review access`), { status: r.status, retryable: false });
    return r;
  };
  const ctx = { maxPages: config.max_pages, fetchJson: async (u, o) => (await request(u, o)).json(), fetchText: async (u, o) => (await request(u, o)).text() };
  const jobs = await provider.fetch(config, ctx);
  const collected_at = new Date(now).toISOString();
  return jobs.map(j => ({ ...j, source: id, collected_at }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { config: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } } });
    if (values.help) console.log('node integrations/kr/collect.mjs --config=reviewed-source.json --output=/new/jobs.json\nOff by default. Requires current access review. Never enable prohibited endpoints.');
    else {
      if (!values.config || !values.output) throw new Error('--config and --output required');
      if (fs.existsSync(values.output)) throw new Error('Output exists; use a new file name to preserve the earlier export');
      const jobs = await collect(JSON.parse(fs.readFileSync(values.config, 'utf8')));
      atomic(values.output, jobs);
      console.log(JSON.stringify({ collected: jobs.length, output: path.resolve(values.output) }));
    }
  } catch (e) { console.error(String(e.message).replace(/([?&]access-key=)[^&\s]+/g, '$1[REDACTED]')); process.exitCode = 1; }
}
