import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// No network. Interpret Korean-market date-only deadlines in Asia/Seoul.
const DAY = 86400000;
export function seoulDay(instant) {
  const ms = Date.parse(instant);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
}
function realDate(y, m, d) {
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const n = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === iso ? iso : null;
}
export function deadlineInfo(raw, collectedAt, now) {
  const today = seoulDay(now);
  if (!today) throw new Error('now must be a valid timestamp');
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return { date: null, status: 'unknown', reason: '마감 정보 없음' };
  let date = null;
  let exactMs = null;
  let position = -1;
  for (const m of text.matchAll(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})(?!\d)(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2}))?/g)) {
    const candidate = realDate(m[1], m[2], m[3]);
    if (candidate) {
      const hasInstant = m[0].includes('T') && Number.isFinite(Date.parse(m[0]));
      exactMs = hasInstant ? Date.parse(m[0]) : null;
      date = hasInstant ? seoulDay(m[0]) : candidate;
      position = m.index + m[0].length;
    }
  }
  const rolling = /상시|수시|채용\s*시|open\s*until\s*filled|always/i.exec(text);
  if (rolling && (!date || rolling.index >= position)) return { date: null, status: 'rolling', reason: '상시 문구, 모집 중임을 보증하지 않음' };
  if (!date) {
    const relative = /D-\s*(\d+)/i.exec(text);
    const tomorrow = /내일\s*마감/.test(text);
    const todayMarker = /오늘\s*마감/i.test(text);
    if (relative || tomorrow || todayMarker) {
      const base = seoulDay(collectedAt);
      if (!base) return { date: null, status: 'unknown', reason: '상대 마감일의 수집 시각 없음' };
      const delta = relative ? Number(relative[1]) : tomorrow ? 1 : 0;
      if (!Number.isSafeInteger(delta) || delta > 3650) return { date: null, status: 'unknown', reason: '상대 마감일 범위 확인 필요' };
      date = new Date(Date.parse(`${base}T00:00:00Z`) + delta * DAY).toISOString().slice(0, 10);
    }
  }
  if (!date) return { date: null, status: 'unknown', reason: '연도/날짜 확인 필요, 다음 해로 추정하지 않음' };
  const days = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY;
  const expired = exactMs !== null ? exactMs < Date.parse(now) : days < 0;
  return { date, status: expired ? 'closed' : days <= 3 ? 'closing_soon' : 'open', reason: '한국 날짜 기준, 실제 모집 상태는 원문 확인 필요' };
}
export function normalizePostings(rows, { now = new Date().toISOString() } = {}) {
  if (!Array.isArray(rows)) throw new Error('job-searcher JSON 배열이 필요합니다.');
  const jobs = [], review = [], seen = new Set();
  let skippedClosed = 0, skippedDuplicate = 0;
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`잘못된 공고: ${index}`);
    if (typeof row.title !== 'string' || !row.title.trim() || typeof row.url !== 'string') throw new Error(`제목/주소 누락: ${index}`);
    const url = new URL(row.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(`지원하지 않는 공고 주소: ${index}`);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key)) url.searchParams.delete(key);
    const normalizedUrl = url.toString();
    if (seen.has(normalizedUrl)) { skippedDuplicate++; continue; }
    seen.add(normalizedUrl);
    const deadline = deadlineInfo(row.deadline, row.collected_at, now);
    review.push({ source: row.source ?? null, url: normalizedUrl, deadlineRaw: row.deadline ?? null, upstreamStatus: row.status ?? null, ...deadline });
    if (deadline.status === 'closed') { skippedClosed++; continue; }
    const text = value => typeof value === 'string' ? value.trim() : '';
    const job = {
      title: row.title.trim(), url: normalizedUrl, company: text(row.company),
      location: text(row.location), source: text(row.source) || 'job-searcher',
      note: `마감상태(${deadline.status}, 한국 날짜 기준)` + (row.deadline ? ` / 원문: ${text(row.deadline)}` : '') + (row.salary ? ` / 급여 원문: ${text(row.salary)}` : ''),
    };
    const description = [text(row.employment_type), text(row.snippet)].filter(Boolean).join(' · ');
    if (description) job.description = description;
    // Date-only/zone-less posted dates stay unknown, not machine-zone guesses.
    if (typeof row.posted_at === 'string' && /(Z|[+-]\d{2}:?\d{2})$/.test(row.posted_at) && Number.isFinite(Date.parse(row.posted_at))) job.postedAt = Date.parse(row.posted_at);
    if (deadline.date) job.validThrough = deadline.date;
    jobs.push(job);
  }
  return { jobs, review, skippedClosed, skippedDuplicate };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node bridge.mjs postings.json');
  console.log(JSON.stringify(normalizePostings(JSON.parse(fs.readFileSync(input, 'utf8'))), null, 2));
}
