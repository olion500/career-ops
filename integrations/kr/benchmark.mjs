#!/usr/bin/env node
// Reproducible SYNTHETIC benchmark. No live sources, AI requests or real profile.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepare, acknowledge, atomic } from './delta.mjs';
const output = path.resolve(process.argv[2] || 'kr-benchmark');
if (fs.existsSync(output)) throw new Error('Use a new output directory');
fs.mkdirSync(output, { recursive: true });
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kr-benchmark-'));
const now = '2026-11-12T04:54:26Z';
const rows = Array.from({ length: 100 }, (_, i) => ({
  id: i, source: 'synthetic', url: `https://jobs.example.com/${i}`, company: `가상기업${i}`,
  title: i < 30 ? 'Senior Backend Engineer' : 'Frontend Designer', location: '서울', collected_at: now,
  deadline: i < 10 ? '2026-11-01' : '2026-12-31', salary: '협의',
  snippet: '백엔드 서비스 개발 및 운영, Kubernetes 기반 인프라 자동화. 필수 조건: 분산 시스템 설계, PostgreSQL, Python. 근무 조건과 실제 자격은 전체 원문에서 확인해야 합니다. '.repeat(80),
}));
rows.push(...rows.slice(10, 20).map(r => ({ ...r, url: r.url + '?utm_source=duplicate' })));
try {
  const options = { root, now, commit: true, maxJobs: 20, excerptChars: 1200, filters: { title_filter: { positive: ['backend'] } } };
  const first = await prepare(rows, options);
  await acknowledge(first.batchId, { root });
  const repeat = await prepare(rows.map(r => ({ ...r, collected_at: '2026-11-12T05:54:26Z' })), options);
  const changedRows = rows.map(r => r.id === 10 ? { ...r, snippet: r.snippet + '변경: 재택 가능' } : r);
  const changed = await prepare(changedRows, options);
  for (const [name, value] of Object.entries({ raw: rows, first, repeat, changed })) atomic(path.join(output, `${name}.json`), value);
  atomic(path.join(output, 'stats.json'), { synthetic: true, profileIncluded: false, modelCalls: 0, first: first.stats, repeat: repeat.stats, changed: changed.stats });
  console.log(JSON.stringify({ output, first: first.stats, repeat: repeat.stats, changed: changed.stats }, null, 2));
} finally { fs.rmSync(root, { recursive: true, force: true }); }
