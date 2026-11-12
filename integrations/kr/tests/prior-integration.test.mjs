import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deadlineInfo, normalizePostings, seoulDay } from '../bridge.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = path.resolve(process.env.CAREER_OPS_ENGINE || path.join(root, '../..'));
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'career-restart-test-'));
process.env.CAREER_OPS_ROOT = sandbox;
// An accidental ordinary HTTP fetch fails the test instead of reading live data.
globalThis.fetch = async () => { throw new Error('NETWORK_FORBIDDEN_IN_OFFLINE_TEST'); };
const fromEngine = name => import(pathToFileURL(path.join(engine, name)).href);
const { default: saramin, normalizeSaraminJob, redact } = await fromEngine('integrations/kr/providers/saramin.mjs');
const { default: greeting, parseGreetingBoard } = await fromEngine('integrations/kr/providers/greeting.mjs');
const { loadProviders, resolveProvider } = await fromEngine('providers/_registry.mjs');
const scan = await fromEngine('scan.mjs');
const now = '2026-11-12T04:40:00Z';
const row = extra => ({ source: 'saramin', url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123', title: '검증용 개발자', company: '가상기업', location: '서울', salary: null, deadline: null, collected_at: now, ...extra });
const apiRow = extra => ({ active: 1, url: row({}).url, company: { detail: { name: '가상기업' } }, position: { title: '검증용 개발자', location: { name: '서울' } }, ...extra });
const record = { deploy: true, fixed: false, openingJobPosition: { openingJobPositions: [] }, openingId: 9, title: '가상 개발자', openDate: '2026-11-11T10:00:00+09:00', group: { name: '가상기업' } };
const html = JSON.stringify(record);

test('upstream registry loads and routes both Korean modules', async () => {
  const providers = await loadProviders(path.join(engine, 'integrations/kr/providers'));
  assert.equal(resolveProvider({ provider: 'saramin' }, providers).provider.id, 'saramin');
  assert.equal(resolveProvider({ provider: 'greeting' }, providers).provider.id, 'greeting');
});
test('Saramin missing key fails before any request', async () => {
  const variable = 'CAREER_RESTART_MISSING_TEST_ONLY';
  assert.equal(process.env[variable], undefined);
  await assert.rejects(saramin.fetch({ saramin_access_key_env: variable }, { fetchJson: async () => { throw new Error('UNEXPECTED_REQUEST'); } }), /no access key/);
});
test('Saramin rejects explicitly closed records and fixed expired deadlines', () => {
  assert.equal(normalizeSaraminJob(apiRow({ active: 0 })), null);
  assert.equal(normalizeSaraminJob(apiRow({ 'close-type': '1', 'expiration-timestamp': '1' })), null);
  const job = normalizeSaraminJob(apiRow({ 'close-type': '1', 'expiration-date': '2026-11-13T23:59:59+09:00' }), { now: Date.parse(now) });
  assert.equal(job.validThrough, '2026-11-13T14:59:59.000Z');
});
test('Saramin rolling-hire sentinel is not a fixed deadline or salary', () => {
  const job = normalizeSaraminJob(apiRow({ 'close-type': '2', 'expiration-timestamp': '1' }));
  assert.ok(job); assert.equal(job.validThrough, undefined); assert.equal(job.salary, undefined);
});
test('Saramin mock transport normalizes and deduplicates without real credentials', async () => {
  const variable = 'CAREER_RESTART_SYNTHETIC_TEST_ONLY';
  const saved = process.env[variable];
  process.env[variable] = 'SYNTHETIC-NOT-A-CREDENTIAL';
  let calls = 0;
  try {
    const jobs = await saramin.fetch({ saramin_access_key_env: variable, max_pages: 1 }, { fetchJson: async url => {
      calls++; assert.equal(new URL(url).hostname, 'oapi.saramin.co.kr');
      return { jobs: { total: 2, job: [apiRow({}), apiRow({})] } };
    } });
    assert.equal(calls, 1); assert.equal(jobs.length, 1);
    const sentinel = Object.assign(new Error('request failed: https://oapi.saramin.co.kr/?access-key=SYNTHETIC-NOT-A-CREDENTIAL&count=1'), { status: 400 });
    await assert.rejects(saramin.fetch({ saramin_access_key_env: variable, max_pages: 1 }, { fetchJson: async () => { throw sentinel; } }), err => {
      assert.equal(err, sentinel);
      assert.equal(err.message.includes('SYNTHETIC-NOT-A-CREDENTIAL'), false);
      return true;
    });
  } finally { if (saved === undefined) delete process.env[variable]; else process.env[variable] = saved; }
  assert.equal(redact('https://oapi.saramin.co.kr/?access-key=dummy&count=1').includes('dummy'), false);
});
test('Greeting requires explicit companies and parses synthetic records', async () => {
  await assert.rejects(greeting.fetch({}, {}), /no companies/);
  const jobs = parseGreetingBoard(html, 'synthetic');
  assert.equal(jobs.length, 1); assert.equal(jobs[0].url, 'https://synthetic.career.greetinghr.com/ko/o/9');
});
test('Greeting preserves the final declared custom domain after redirect', async () => {
  const jobs = await greeting.fetch({ greeting_companies: ['synthetic', 'careers.example.com'], max_pages: 1 }, { fetchText: async url => {
    if (url.includes('synthetic.career.greetinghr.com')) throw Object.assign(new Error('redirect'), { status: 302, location: 'https://careers.example.com/ko/home' });
    assert.equal(url, 'https://careers.example.com/ko/home'); return html;
  } });
  assert.equal(jobs[0].url, 'https://careers.example.com/ko/o/9');
});
test('Greeting refuses an undeclared redirect host', async () => {
  await assert.rejects(greeting.fetch({ greeting_companies: ['synthetic'], max_pages: 1 }, { fetchText: async () => { throw Object.assign(new Error('redirect'), { status: 302, location: 'https://unlisted.example.net/ko' }); } }), /not listed/);
});
test('bridge uses Seoul date rather than the previous UTC date', () => {
  assert.equal(seoulDay('2026-11-11T15:30:00Z'), '2026-11-12');
  assert.equal(deadlineInfo('2026-11-11', now, '2026-11-11T15:30:00Z').status, 'closed');
});
test('bridge does not invent a year for MM.DD or trust upstream guessed status', () => {
  assert.equal(deadlineInfo('~11.10', now, now).status, 'unknown');
  const result = normalizePostings([row({ deadline: '~11.10', deadline_date: '2027-11-10', status: 'open' })], { now });
  assert.equal(result.review[0].date, null); assert.equal(result.review[0].status, 'unknown');
});
test('relative deadlines stay anchored to collection time on later imports', () => {
  const info = deadlineInfo('D-2', '2026-11-09T20:00:00Z', now);
  assert.equal(info.date, '2026-11-12'); assert.equal(info.status, 'closing_soon');
  assert.equal(deadlineInfo('D-2', null, now).status, 'unknown');
});
test('range, rolling, invalid date and exact offset timestamp semantics', () => {
  assert.equal(deadlineInfo('2026.11.01 ~ 2026.11.15', now, now).date, '2026-11-15');
  assert.equal(deadlineInfo('2026.11.01 ~ 채용시', now, now).status, 'rolling');
  assert.equal(deadlineInfo('2026-02-30', now, now).status, 'unknown');
  assert.equal(deadlineInfo('2026-11-12T23:30:00Z', now, now).date, '2026-11-13');
  assert.equal(deadlineInfo('2026-11-12T00:00:00Z', now, now).status, 'closed');
});
test('bridge keeps unknowns, removes closed rows/URL duplicates, never guesses salary', () => {
  const result = normalizePostings([row({}), row({ url: row({}).url + '&utm_source=test' }), row({ url: 'https://example.com/expired', deadline: '2026-11-01' })], { now });
  assert.equal(result.jobs.length, 1); assert.equal(result.skippedDuplicate, 1); assert.equal(result.skippedClosed, 1);
  assert.equal(result.jobs[0].salary, undefined); assert.equal(result.review[0].status, 'unknown');
});
test('bridge rejects malformed arrays and executable/credential URLs', () => {
  assert.throws(() => normalizePostings({ postings: [] }), /배열/);
  assert.throws(() => normalizePostings([row({ url: 'javascript:alert(1)' })]), /주소/);
  assert.throws(() => normalizePostings([row({ url: 'https://user:pass@example.com/' })]), /주소/);
});
test('actual career-ops pipeline and history remain deduplicated over two imports', async () => {
  const result = normalizePostings([row({ deadline: '2026-11-15' })], { now });
  const pipelinePath = path.join(sandbox, 'data', 'pipeline.md');
  const historyPath = path.join(sandbox, 'data', 'scan-history.tsv');
  fs.mkdirSync(path.dirname(pipelinePath), { recursive: true });
  for (let i = 0; i < 2; i++) {
    await scan.appendToPipeline(result.jobs, { pipelinePath, scanHistoryPath: historyPath, historyPolicy: {} });
    await scan.appendToScanHistory(result.jobs, '2026-11-12', 'added', { historyPath, historyPolicy: {} });
  }
  assert.equal(fs.readFileSync(pipelinePath, 'utf8').split('\n').filter(line => line.startsWith('- [ ] ')).length, 1);
  assert.equal(fs.readFileSync(historyPath, 'utf8').trim().split('\n').length, 2);
});
