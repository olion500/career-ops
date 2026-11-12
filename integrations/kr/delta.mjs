import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { deadlineInfo, seoulDay } from './bridge.mjs';
import { loadYaml } from '../../lib/yaml-document.mjs';
import { acquireDirLock } from '../../lib/dir-lock.mjs';
import { getCareerOpsRoot, resolveTrackerPath } from '../../path-resolver.mjs';
import { fileURLToPath } from 'node:url';

const CODE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const text = value => typeof value === 'string' ? value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const json = (p, fallback) => fs.existsSync(p) ? JSON.parse(read(p)) : fallback;
export function atomic(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${randomUUID()}.tmp`;
  try { fs.writeFileSync(tmp, typeof data === 'string' ? data : JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 }); fs.renameSync(tmp, p); }
  finally { fs.rmSync(tmp, { force: true }); }
}
export function canonicalUrl(raw) {
  const u = new URL(raw);
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) throw new Error('Invalid job URL');
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  return u.toString();
}
export function normalize(row, now) {
  if (!row || typeof row !== 'object' || Array.isArray(row) || !text(row.title) || typeof row.url !== 'string') throw new Error('Each job needs title and URL');
  const rawDeadline = text(row.deadline || row.validThrough);
  const deadline = deadlineInfo(rawDeadline, row.collected_at, now);
  if (row.active === 0 || row.active === '0' || ['closed', 'expired'].includes(row.status)) deadline.status = 'closed';
  // Relative text is resolved once against the original collection instant.
  // Fingerprints include the fixed date, NOT a changing days-remaining label.
  return {
    url: canonicalUrl(row.url), title: text(row.title), company: text(row.company),
    location: text(row.location), source: text(row.source || row.portal) || 'local-json',
    employment_type: text(row.employment_type), salary: text(row.salary),
    deadline: { raw: rawDeadline, date: deadline.date, closed: deadline.status === 'closed' },
    description: text(row.description || row.snippet),
  };
}
export function matches(job, filters = {}) {
  const includes = (value, words) => words.some(k => value.toLocaleLowerCase('en').includes(k.toLocaleLowerCase('en')));
  for (const name of ['title', 'location']) {
    const f = filters[`${name}_filter`] || {};
    for (const key of ['positive', 'negative']) if (f[key] != null && (!Array.isArray(f[key]) || f[key].some(x => typeof x !== 'string'))) throw new Error(`Invalid ${name}_filter.${key}`);
    if (f.positive?.length && !includes(job[name], f.positive)) return false;
    if (f.negative?.length && includes(job[name], f.negative)) return false;
  }
  return true;
}
function contextHash(root, filters) {
  const user = ['cv.md', 'config/profile.yml', 'config/cv-facts.json', 'modes/_profile.md', 'modes/_custom.md', 'modes/_brief.md'];
  const system = ['VERSION', 'modes/oferta.md', 'modes/_shared.md', 'integrations/kr/delta.mjs', 'integrations/kr/bridge.mjs'];
  return hash({ user: user.map(p => [p, read(path.join(root, p))]), system: system.map(p => [p, read(path.join(CODE, p))]), filters });
}
function trackedUrls(root) {
  // URL identity only. Do not merge distinct requisitions because their
  // company/title happen to match. The core writer handles its own inbox dedup.
  const set = new Set();
  for (const m of read(resolveTrackerPath(root)).matchAll(/https?:\/\/[^\s<>|)\]]+/g)) {
    try { set.add(canonicalUrl(m[0])); } catch { /* not a posting link */ }
  }
  return set;
}
export async function prepare(rows, { root = getCareerOpsRoot(), now = new Date().toISOString(), commit = false, filters, maxJobs = 20, excerptChars = 1200 } = {}) {
  if (!Array.isArray(rows)) throw new Error('Expected job-searcher JSON array');
  if (!seoulDay(now)) throw new Error('Invalid now');
  if (!Number.isInteger(maxJobs) || maxJobs < 1 || maxJobs > 200 || !Number.isInteger(excerptChars) || excerptChars < 0 || excerptChars > 10000) throw new Error('Invalid budget');
  root = path.resolve(root);
  const base = path.join(root, 'data/kr');
  const statePath = path.join(base, 'state.json');
  // Preview never creates a cache, lock, pipeline or history.
  let release;
  if (commit) { fs.mkdirSync(base, { recursive: true }); release = (await acquireDirLock(`${statePath}.lock`, { staleMs: 300000, timeoutMs: 30000, retryMs: 40, maxWaitMs: 35000 })).release; }
  try {
    const state = json(statePath, { version: 1, records: {} });
    if (state.version !== 1 || !state.records || typeof state.records !== 'object') throw new Error('Unsupported/corrupt KR cache; preserve it for review');
    const doc = loadYaml(read(path.join(root, 'portals.yml'))) || {};
    // Only these explicit, deterministic prefilters are applied here.
    // Other career-ops gates remain in the full evaluation workflow.
    filters ??= { title_filter: doc.title_filter || {} };
    const context = contextHash(root, filters), seen = new Set();
    const stats = { input: rows.length, duplicates: 0, changed: 0, unchanged: 0, closed: 0, filtered: 0, tracked: 0 };
    for (const row of rows) {
      const job = normalize(row, now), key = hash(job.url);
      if (seen.has(key)) { stats.duplicates++; continue; }
      seen.add(key);
      const contentHash = hash(job), old = state.records[key];
      if (!old || old.contentHash !== contentHash) stats.changed++; else stats.unchanged++;
      const revision = hash([contentHash, context]);
      state.records[key] = { job, contentHash, revision, acknowledged: old?.acknowledged || null, lastSeen: now };
    }
    const applied = trackedUrls(root), pending = [];
    // Re-check ALL cached jobs. A filter/profile change must also reconsider
    // prior rejects, and an absent row in a partial response never means closed.
    for (const [key, rec] of Object.entries(state.records)) {
      rec.revision = hash([rec.contentHash, context]);
      const raw = rec.job.deadline.raw;
      const relative = /D-\s*\d+|내일\s*마감|오늘\s*마감/i.test(raw);
      const info = deadlineInfo(relative ? rec.job.deadline.date || raw : raw, rec.lastSeen, now);
      if (rec.job.deadline.closed || info.status === 'closed') { stats.closed++; continue; }
      if (!matches(rec.job, filters)) { stats.filtered++; continue; }
      if (applied.has(rec.job.url)) { stats.tracked++; continue; }
      if (rec.acknowledged === rec.revision) continue;
      const { description, ...small } = rec.job;
      pending.push({ id: key, revision: rec.revision, ...small,
        excerpt: description.slice(0, excerptChars), truncated: description.length > excerptChars,
        fullTextFile: `data/kr/archive/${rec.contentHash}.json`,
      });
    }
    pending.sort((a, b) => (a.deadline.date || '9999').localeCompare(b.deadline.date || '9999') || a.id.localeCompare(b.id));
    const jobs = pending.slice(0, maxJobs);
    const batchId = hash(jobs.map(j => [j.id, j.revision]));
    const batch = { version: 1, batchId, generatedAt: now, purpose: 'triage-only; read fullTextFile and verify source before full evaluation or application', stats: { ...stats, pending: pending.length, selected: jobs.length, deferred: pending.length - jobs.length }, jobs };
    if (commit) {
      const rawPath = path.join(base, 'raw', `${hash(rows)}.json`);
      if (!fs.existsSync(rawPath)) atomic(rawPath, rows);
      for (const rec of Object.values(state.records)) {
        const archive = path.join(base, 'archive', `${rec.contentHash}.json`);
        if (!fs.existsSync(archive)) atomic(archive, rec.job);
      }
      // Cache and immutable batch land BEFORE any inbox write. A later writer
      // error leaves this batch retryable, never silently acknowledged.
      atomic(statePath, state);
      if (!fs.existsSync(path.join(base, 'batches', `${batchId}.json`))) atomic(path.join(base, 'batches', `${batchId}.json`), batch);
      atomic(path.join(base, 'ai-input.json'), batch);
      const { appendToPipeline, appendToScanHistory } = await import('../../scan.mjs');
      const offers = jobs.map(j => ({ url: j.url, title: j.title, company: j.company, location: j.location, source: j.source, note: `KR triage ${j.id.slice(0, 8)}; full text: ${j.fullTextFile}` }));
      const pipelinePath = path.join(root, 'data/pipeline.md'), historyPath = path.join(root, 'data/scan-history.tsv');
      await appendToPipeline(offers, { pipelinePath, scanHistoryPath: historyPath, historyPolicy: {} });
      await appendToScanHistory(offers, seoulDay(now), 'added', { historyPath, historyPolicy: {} });
    }
    return batch;
  } finally { if (release) release(); }
}
export async function acknowledge(batchId, { root = getCareerOpsRoot() } = {}) {
  if (!/^[a-f0-9]{64}$/.test(batchId)) throw new Error('Invalid batch ID');
  const base = path.join(root, 'data/kr'), p = path.join(base, 'state.json');
  const release = (await acquireDirLock(`${p}.lock`, { staleMs: 300000, timeoutMs: 30000, retryMs: 40, maxWaitMs: 35000 })).release;
  try {
    const state = json(p, null), batch = json(path.join(base, 'batches', `${batchId}.json`), null);
    if (!state || !batch) throw new Error('Unknown batch; nothing acknowledged');
    let acknowledged = 0, stale = 0;
    for (const job of batch.jobs) {
      const rec = state.records[job.id];
      if (rec?.revision !== job.revision) { stale++; continue; }
      rec.acknowledged = job.revision; acknowledged++;
    }
    atomic(p, state);
    return { acknowledged, stale };
  } finally { release(); }
}
