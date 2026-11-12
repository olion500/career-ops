import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { prepare, acknowledge, canonicalUrl, normalize, matches, hash } from '../delta.mjs';
import { collect, validatePolicy } from '../collect.mjs';
import { migrate } from '../migrate-user.mjs';
import { configure } from '../configure.mjs';
import { loadStates, normalizeStatus, normalizeCompany, roleMatch } from '../../../lib/states.mjs';
import { loadCanonicalStates, resolveCanonicalStateId } from '../../../tracker-utils.mjs';
const CODE = fileURLToPath(new URL('../../../', import.meta.url));
const roots = [];
const fresh = () => { const p = fs.mkdtempSync(path.join(os.tmpdir(), 'career-kr-')); roots.push(p); return p; };
test.after(() => roots.forEach(p => fs.rmSync(p, { recursive: true, force: true })));
// No real HTTP or paid-model calls are permitted by these tests.
globalThis.fetch = async () => { throw new Error('NETWORK_FORBIDDEN'); };
const now = '2026-11-12T04:54:26Z';
const row = (n = 1, x = {}) => ({ source: 'fixture', id: n, url: `https://example.com/jobs/${n}`, title: 'Senior Backend Engineer', company: '가상기업', location: '서울', deadline: '2026-12-10', collected_at: now, snippet: 'Kubernetes 백엔드 개발 자격과 근무 조건. '.repeat(200), ...x });
const opts = root => ({ root, now, commit: true });

test('preview is entirely read-only and makes no network call', async () => {
  const root = fresh();
  const result = await prepare([row()], { root, now });
  assert.equal(result.jobs.length, 1); assert.deepEqual(fs.readdirSync(root), []);
});
test('commit writes real latest-core inbox/history and full/raw archives', async () => {
  const root = fresh(), r = await prepare([row(), row(1, { url: row().url + '?utm_source=x#frag' })], opts(root));
  assert.equal(r.stats.duplicates, 1); assert.equal(r.jobs.length, 1);
  assert.equal(r.jobs[0].truncated, true); assert.equal(r.jobs[0].excerpt.length, 1200);
  assert.ok(fs.existsSync(path.join(root, r.jobs[0].fullTextFile)));
  assert.equal(fs.readdirSync(path.join(root, 'data/kr/raw')).length, 1);
  assert.equal(fs.readFileSync(path.join(root, 'data/pipeline.md'), 'utf8').split('\n').filter(x => x.startsWith('- [ ]')).length, 1);
  assert.equal(fs.readFileSync(path.join(root, 'data/scan-history.tsv'), 'utf8').trim().split('\n').length, 2);
});
test('unacknowledged work survives repeated imports; ack makes idle queue empty', async () => {
  const root = fresh(), a = await prepare([row()], opts(root));
  const b = await prepare([row(1, { collected_at: '2026-11-13T00:00:00Z' })], opts(root));
  assert.equal(b.stats.unchanged, 1); assert.equal(b.batchId, a.batchId); assert.equal(b.jobs.length, 1);
  await acknowledge(a.batchId, { root });
  assert.equal((await prepare([row()], opts(root))).jobs.length, 0);
  assert.equal(fs.readFileSync(path.join(root, 'data/pipeline.md'), 'utf8').split('\n').filter(x => x.startsWith('- [ ]')).length, 1);
});
test('meaningful text change requeues, and stale ack cannot drop newer work', async () => {
  const root = fresh(), a = await prepare([row()], opts(root));
  const b = await prepare([row(1, { snippet: '다른 조건' })], opts(root));
  assert.notEqual(a.batchId, b.batchId);
  assert.deepEqual(await acknowledge(a.batchId, { root }), { acknowledged: 0, stale: 1 });
  assert.equal((await prepare([], opts(root))).jobs.length, 1);
});
test('profile and filter changes reconsider cached jobs, including prior rejects', async () => {
  const root = fresh(), a = await prepare([row()], { ...opts(root), filters: { title_filter: { positive: ['Frontend'] } } });
  assert.equal(a.jobs.length, 0);
  const b = await prepare([], opts(root)); assert.equal(b.jobs.length, 1); await acknowledge(b.batchId, { root });
  fs.writeFileSync(path.join(root, 'cv.md'), '사용자 새 이력');
  assert.equal((await prepare([], opts(root))).jobs.length, 1);
});
test('budgets defer work without discarding it and ack advances next batch', async () => {
  const root = fresh(), a = await prepare([row(1), row(2), row(3)], { ...opts(root), maxJobs: 1 });
  assert.equal(a.stats.deferred, 2); assert.equal(a.jobs.length, 1); await acknowledge(a.batchId, { root });
  const b = await prepare([], { ...opts(root), maxJobs: 1 }); assert.equal(b.stats.pending, 2); assert.notEqual(a.jobs[0].id, b.jobs[0].id);
});
test('expired and explicitly closed never reach AI; missing in partial response is not closed', async () => {
  const root = fresh();
  const a = await prepare([row(1, { deadline: '2026-11-11' }), row(2, { active: 0 }), row(3)], opts(root));
  assert.equal(a.stats.closed, 2); assert.equal(a.jobs.length, 1);
  const b = await prepare([], opts(root)); assert.equal(b.jobs.length, 1);
  const c = await prepare([], { ...opts(root), now: '2027-01-01T00:00:00Z' }); assert.equal(c.jobs.length, 0);
});
test('relative deadline does not drift and unknown year is not invented', async () => {
  const root = fresh();
  const a = await prepare([row(1, { deadline: 'D-2', collected_at: '2026-11-10T20:00:00Z' }), row(2, { deadline: '~11.10' })], opts(root));
  assert.equal(a.jobs.find(j => j.url.endsWith('/1')).deadline.date, '2026-11-13');
  assert.equal(a.jobs.find(j => j.url.endsWith('/2')).deadline.date, null);
  const b = await prepare([], { ...opts(root), now: '2026-11-15T00:00:00Z' }); assert.equal(b.jobs.length, 1);
});
test('cached offset timestamp expires at the instant, not end of the Seoul day', async () => {
  const root = fresh();
  const a = await prepare([row(1, { deadline: '2026-11-12T06:00:00Z' })], opts(root));
  assert.equal(a.jobs.length, 1);
  assert.equal((await prepare([], { ...opts(root), now: '2026-11-12T07:00:00Z' })).jobs.length, 0);
});
test('reopened posting can return and writer failure keeps work retryable', async () => {
  const root = fresh();
  await prepare([row(1, { active: 0 })], opts(root));
  assert.equal((await prepare([row(1)], opts(root))).jobs.length, 1);
  const broken = fresh(); fs.mkdirSync(path.join(broken, 'data/pipeline.md'), { recursive: true });
  await assert.rejects(prepare([row(2)], opts(broken)));
  fs.rmdirSync(path.join(broken, 'data/pipeline.md'));
  const retry = await prepare([], opts(broken)); assert.equal(retry.jobs.length, 1);
});
test('same title at different requisitions or Korean companies is NOT collapsed', async () => {
  const r = await prepare([row(1), row(2), row(3, { company: '다른기업' })], { root: fresh(), now });
  assert.equal(r.jobs.length, 3); assert.notEqual(normalizeCompany('가상기업'), normalizeCompany('다른기업'));
});
test('tracked posting URLs are excluded without rewriting the tracker', async () => {
  const root = fresh(); fs.mkdirSync(path.join(root, 'data'));
  const tracker = '# Tracker\n| # | Date | Company | Role | Status | URL |\n| 1 | 2026-01-01 | 가상기업 | Backend | 지원 | https://example.com/jobs/1 |\n';
  fs.writeFileSync(path.join(root, 'data/applications.md'), tracker);
  const a = await prepare([row()], opts(root)); assert.equal(a.stats.tracked, 1); assert.equal(a.jobs.length, 0);
  assert.equal(fs.readFileSync(path.join(root, 'data/applications.md'), 'utf8'), tracker);
});
test('bad inputs cannot corrupt committed cache', async () => {
  const root = fresh(); await prepare([row()], opts(root)); const p = path.join(root, 'data/kr/state.json'), before = fs.readFileSync(p, 'utf8');
  for (const bad of [null, [row(1, { url: 'javascript:alert(1)' })], [row(1, { url: 'https://u:p@example.com/a' })], [row(1, { title: '' })]]) await assert.rejects(prepare(bad, opts(root)));
  assert.equal(fs.readFileSync(p, 'utf8'), before);
  await assert.rejects(acknowledge('../../other', { root }));
});
test('deterministic filters preserve unknowns unless explicitly constrained', () => {
  const job = normalize(row(), now);
  assert.equal(matches(job, {}), true); assert.equal(matches(job, { title_filter: { positive: ['backend'], negative: ['intern'] } }), true);
  assert.equal(matches(job, { location_filter: { positive: ['부산'] } }), false);
  assert.throws(() => matches(job, { title_filter: { positive: 'backend' } }));
  assert.equal(canonicalUrl('https://example.com/a?b=2&utm_medium=x&a=1#b'), 'https://example.com/a?a=1&b=2');
});
test('source policy blocks old endpoints and expired/unreviewed configs before HTTP', async () => {
  for (const provider of ['wanted', 'jumpit', 'zighang', 'inthiswork', 'saramin', 'greeting']) await assert.rejects(collect({ provider, enabled: true }, { now: Date.parse(now) }));
});
const reviewed = { provider: 'saramin', enabled: true, saramin_access_key_env: 'KR_TEST_SYNTHETIC_KEY', max_pages: 1, access_review: { allowed: true, urls: ['https://oapi.saramin.co.kr/guide/job-search'], reviewed_at: '2026-11-12T00:00:00Z', valid_until: '2026-11-13T00:00:00Z' } };
test('collector stops on HTTP 429 without retries or credential leakage', async () => {
  process.env.KR_TEST_SYNTHETIC_KEY = 'TEST-NOT-REAL'; let calls = 0;
  try { await assert.rejects(collect(reviewed, { now: Date.parse(now), fetchImpl: async () => { calls++; return new Response('', { status: 429 }); } }), /HTTP 429/); }
  finally { delete process.env.KR_TEST_SYNTHETIC_KEY; }
  assert.equal(calls, 1);
});
test('collector mock API success reaches the zero-AI delta importer', async () => {
  process.env.KR_TEST_SYNTHETIC_KEY = 'TEST-NOT-REAL';
  try {
    const jobs = await collect(reviewed, { now: Date.parse(now), fetchImpl: async () => new Response(JSON.stringify({ jobs: { total: 1, job: [{ active: 1, url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123', company: { detail: { name: '가상기업' } }, position: { title: 'Senior Backend', location: { name: '서울' } } }] } }), { status: 200 }) });
    assert.equal(jobs.length, 1); assert.equal((await prepare(jobs, opts(fresh()))).jobs.length, 1);
  } finally { delete process.env.KR_TEST_SYNTHETIC_KEY; }
});
test('migration previews without writes, copies byte-for-byte, refuses overwrite and symlinks', () => {
  const src = fresh(), parent = fresh(), dest = path.join(parent, 'new');
  fs.mkdirSync(path.join(src, 'data')); fs.writeFileSync(path.join(src, 'cv.md'), '개인 이력'); fs.writeFileSync(path.join(src, 'data/applications.md'), '지원 이력'); fs.writeFileSync(path.join(src, '.env'), 'DO_NOT_COPY');
  assert.equal(migrate(src, dest).committed, false); assert.equal(fs.existsSync(dest), false);
  const r = migrate(src, dest, { commit: true }); assert.equal(r.files.length, 2); assert.equal(fs.existsSync(path.join(dest, '.env')), false);
  for (const f of r.files) assert.equal(hash(fs.readFileSync(path.join(dest, f.path))), f.sha256);
  assert.throws(() => migrate(src, dest, { commit: true }), /NEW/);
  fs.symlinkSync('/etc/passwd', path.join(src, 'data/link')); assert.throws(() => migrate(src, path.join(parent, 'other')), /Symlink/);
});
test('workflow install preserves old custom text and is idempotent', () => {
  const root = fresh(); fs.mkdirSync(path.join(root, 'modes')); fs.writeFileSync(path.join(root, 'modes/_custom.md'), '기존 규칙\n');
  assert.equal(configure(root).changed, true); assert.equal(configure(root).changed, false);
  assert.ok(fs.readFileSync(path.join(root, 'modes/_custom.md'), 'utf8').startsWith('기존 규칙\n'));
});
test('workflow configuration restores aliases after upstream update without replacing labels', () => {
  const root = fresh(), code = fresh(); fs.mkdirSync(path.join(code, 'templates'));
  const p = path.join(code, 'templates/states.yml');
  fs.writeFileSync(p, 'states:\n  - id: applied\n    label: Applied\n    aliases: [sent]\n');
  assert.equal(configure(root, code).changedAliases, true);
  assert.match(fs.readFileSync(p, 'utf8'), /label: Applied/); assert.match(fs.readFileSync(p, 'utf8'), /aliases: \[sent, 지원\]/);
  assert.equal(configure(root, code).changedAliases, false);
});
test('Korean state compatibility uses current upstream resolver, keeps new lifecycle stages', () => {
  const states = loadCanonicalStates(path.join(CODE, 'templates/states.yml'));
  for (const [value, id] of Object.entries({ 지원: 'applied', 응답: 'responded', 평가완료: 'evaluated', 면접: 'interview', 오퍼: 'offer', 불합격: 'rejected', 보류: 'discarded', 과제: 'assessment', 입사: 'hired' })) assert.equal(resolveCanonicalStateId(value, states), id);
  assert.equal(normalizeStatus('지원', loadStates().aliasMap).status, 'Applied');
  assert.equal(roleMatch('백엔드 개발자', '백엔드 개발자'), true);
});
test('CLI dry run writes nothing; legacy wrapper no args never collects', () => {
  const root = fresh(), input = path.join(root, 'jobs.json'); fs.writeFileSync(input, JSON.stringify([row()]));
  const output = execFileSync(process.execPath, [path.join(CODE, 'scan-boards.mjs'), input, '--dry-run', `--root=${root}`, '--limit=1'], { encoding: 'utf8' });
  assert.equal(JSON.parse(output).jobs.length, 1); assert.deepEqual(fs.readdirSync(root), ['jobs.json']);
  assert.match(execFileSync(process.execPath, [path.join(CODE, 'scan-boards.mjs')], { encoding: 'utf8' }), /No network/);
});
test('two concurrent import processes do not lose records or duplicate inbox rows', async () => {
  const root = fresh(), a = path.join(root, 'a.json'), b = path.join(root, 'b.json');
  fs.writeFileSync(a, JSON.stringify([row(1)])); fs.writeFileSync(b, JSON.stringify([row(2)]));
  const run = input => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(CODE, 'integrations/kr/import.mjs'), input, '--commit', `--root=${root}`, `--now=${now}`], { stdio: ['ignore', 'pipe', 'pipe'] }); let err = '';
    child.stderr.on('data', b => { err += b; }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(err)));
  });
  await Promise.all([run(a), run(b)]);
  const r = await prepare([], opts(root)); assert.equal(r.stats.pending, 2);
  assert.equal(fs.readFileSync(path.join(root, 'data/pipeline.md'), 'utf8').split('\n').filter(x => x.startsWith('- [ ]')).length, 2);
});
