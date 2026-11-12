#!/usr/bin/env node
/**
 * scan-boards.mjs — Korean job-board API scanner (Level 0 of scan mode)
 *
 * Fetches positions from Wanted, Jumpit, Zighang (JSON APIs) and Inthiswork (SSR HTML).
 * Filters by title_filter from portals.yml, dedupes against scan-history.tsv +
 * applications.md + pipeline.md, and appends new offers to data/pipeline.md.
 *
 * Run: node scan-boards.mjs [--dry-run] [--limit=N]
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('.', import.meta.url).pathname;
const PORTALS = join(ROOT, 'portals.yml');
const PIPELINE = join(ROOT, 'data/pipeline.md');
const HISTORY = join(ROOT, 'data/scan-history.tsv');
const APPS = join(ROOT, 'data/applications.md');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '50', 10);

const TODAY = new Date().toISOString().slice(0, 10);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36';

// ---------- helpers ----------
async function fetchJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': UA } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}
async function fetchText(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
}

// Minimal title_filter parser — only reads positive/negative arrays from portals.yml
function loadTitleFilter() {
  const text = readFileSync(PORTALS, 'utf8');
  const out = { positive: [], negative: [] };
  let section = null; // 'positive' | 'negative' | null
  for (const line of text.split('\n')) {
    if (/^title_filter:/.test(line)) { section = 'header'; continue; }
    if (section === null) continue;
    if (/^\S/.test(line)) { section = null; continue; } // left title_filter block
    const key = line.match(/^\s{2}(\w+):/);
    if (key) { section = key[1]; continue; }
    const item = line.match(/^\s+-\s*"?([^"]+?)"?\s*$/);
    if (item && (section === 'positive' || section === 'negative')) {
      out[section].push(item[1]);
    }
  }
  return out;
}

function titlePass(title, filter) {
  const t = title.toLowerCase();
  const pos = filter.positive.some(k => t.includes(k.toLowerCase()));
  if (!pos) return false;
  const neg = filter.negative.some(k => t.includes(k.toLowerCase()));
  return !neg;
}

function loadDedupSets() {
  const seenUrls = new Set();
  const seenCompanyRole = new Set();

  if (existsSync(HISTORY)) {
    const lines = readFileSync(HISTORY, 'utf8').split('\n').slice(1);
    for (const line of lines) {
      const url = line.split('\t')[0];
      if (url) seenUrls.add(url);
    }
  }

  if (existsSync(PIPELINE)) {
    const text = readFileSync(PIPELINE, 'utf8');
    for (const m of text.matchAll(/^- \[[ x]\] (\S+) \| ([^|]+) \| (.+)$/gm)) {
      seenUrls.add(m[1].trim());
      seenCompanyRole.add(`${m[2].trim()}::${m[3].trim().toLowerCase()}`);
    }
  }

  if (existsSync(APPS)) {
    const text = readFileSync(APPS, 'utf8');
    for (const line of text.split('\n')) {
      // | # | date | company | role | score | status | ...
      const cells = line.split('|').map(s => s.trim());
      if (cells.length >= 5 && cells[3] && cells[4]) {
        seenCompanyRole.add(`${cells[3]}::${cells[4].toLowerCase()}`);
      }
    }
  }

  return { seenUrls, seenCompanyRole };
}

// ---------- board fetchers ----------

async function fetchWanted(limit) {
  // 정렬: 최신순(latest_order) - 신규 발견 목적
  const url = `https://www.wanted.co.kr/api/chaos/search/v1/position?query=backend&country=kr&years=-1&locations=all&sort=job.latest_order&limit=${limit}&offset=0`;
  const data = await fetchJson(url);
  return (data.data || []).map(p => ({
    title: p.position,
    company: p.company?.name || 'Unknown',
    url: `https://www.wanted.co.kr/wd/${p.id}`,
    portal: 'board:wanted',
  }));
}

async function fetchJumpit(limit) {
  // jobCategory=1 → 서버/백엔드 개발자
  const url = `https://jumpit-api.saramin.co.kr/api/positions?jobCategory=1&sort=latest&highlight=false`;
  const data = await fetchJson(url);
  const positions = data.result?.positions || [];
  return positions.slice(0, limit).map(p => ({
    title: p.title,
    company: p.companyName,
    url: `https://jumpit.saramin.co.kr/position/${p.id}`,
    portal: 'board:jumpit',
  }));
}

async function fetchZighang(limit) {
  // Zighang API has no backend-only filter and caps page size at 100, so we
  // paginate (up to 5 pages = 500 items) and filter client-side by depthTwos.
  // ZIGHANG_SCORE is the only reliable sort.
  const PAGE_SIZE = 100;
  const MAX_PAGES = 5;
  const all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `https://api.zighang.com/api/recruitments/v3?page=${page}&size=${PAGE_SIZE}&includeCareerOpen=true&sortCondition=ZIGHANG_SCORE&orderCondition=DESC`;
    let data;
    try { data = await fetchJson(url); } catch { break; }
    const content = data.data?.content || [];
    if (content.length === 0) break;
    all.push(...content);
    if (content.length < PAGE_SIZE) break;
  }
  return all
    .filter(p => (p.depthTwos || []).some(d => /백엔드|서버|인프라|클라우드|devops|sre/i.test(d)))
    .slice(0, limit)
    .map(p => ({
      title: p.title,
      company: p.company?.name || 'Unknown',
      url: `https://zighang.com/recruitment/${p.id}`,
      portal: 'board:zighang',
    }));
}

async function fetchInthiswork(limit) {
  // Inthiswork is server-rendered HTML. Each job card has:
  //   title="{company}｜{role}" data-id="{id}"
  // and the detail URL is https://inthiswork.com/archives/{id}
  const html = await fetchText('https://inthiswork.com/it');
  const re = /title="([^"]+?)｜([^"]+?)"\s+data-id="(\d+)"/g;
  const found = [];
  const seen = new Set();
  for (const m of html.matchAll(re)) {
    const company = m[1].trim();
    const title = m[2].trim();
    const id = m[3];
    const url = `https://inthiswork.com/archives/${id}`;
    if (seen.has(url)) continue;
    seen.add(url);
    found.push({ title, company, url, portal: 'board:inthiswork' });
  }
  return found.slice(0, limit);
}

// ---------- main ----------
async function main() {
  const filter = loadTitleFilter();
  const dedup = loadDedupSets();

  console.log(`Board Scan — ${TODAY}${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('━'.repeat(40));

  const fetchers = [
    ['wanted', fetchWanted],
    ['jumpit', fetchJumpit],
    ['zighang', fetchZighang],
    ['inthiswork', fetchInthiswork],
  ];

  const allOffers = [];
  for (const [name, fn] of fetchers) {
    try {
      const offers = await fn(LIMIT);
      console.log(`  ${name.padEnd(12)} → ${offers.length} offers`);
      allOffers.push(...offers);
    } catch (e) {
      console.log(`  ${name.padEnd(12)} → ERROR: ${e.message}`);
    }
  }

  const stats = { total: allOffers.length, skipped_title: 0, skipped_dup: 0, added: 0 };
  const newRows = [];
  const historyRows = [];

  for (const o of allOffers) {
    const title = (o.title || '').trim();
    const company = (o.company || '').trim();
    const url = (o.url || '').trim();
    if (!title || !url) continue;

    if (!titlePass(title, filter)) {
      stats.skipped_title++;
      historyRows.push(`${url}\t${TODAY}\t${o.portal}\t${title}\t${company}\tskipped_title`);
      continue;
    }

    const cr = `${company}::${title.toLowerCase()}`;
    if (dedup.seenUrls.has(url) || dedup.seenCompanyRole.has(cr)) {
      stats.skipped_dup++;
      historyRows.push(`${url}\t${TODAY}\t${o.portal}\t${title}\t${company}\tskipped_dup`);
      continue;
    }

    dedup.seenUrls.add(url);
    dedup.seenCompanyRole.add(cr);
    stats.added++;
    newRows.push(`- [ ] ${url} | ${company} | ${title}`);
    historyRows.push(`${url}\t${TODAY}\t${o.portal}\t${title}\t${company}\tadded`);
  }

  console.log('');
  console.log(`Total found:     ${stats.total}`);
  console.log(`Skipped (title): ${stats.skipped_title}`);
  console.log(`Skipped (dup):   ${stats.skipped_dup}`);
  console.log(`Added:           ${stats.added}`);
  console.log('');

  if (stats.added > 0) {
    console.log('New offers:');
    for (const row of newRows) console.log(`  ${row}`);
    console.log('');
  }

  if (DRY_RUN) {
    console.log('(dry-run, no files modified)');
    return;
  }

  if (newRows.length > 0) {
    const text = readFileSync(PIPELINE, 'utf8');
    const updated = text.replace(/^## Pendientes\n/m, `## Pendientes\n${newRows.join('\n')}\n`);
    writeFileSync(PIPELINE, updated);
  }

  if (historyRows.length > 0) {
    if (!existsSync(HISTORY)) {
      writeFileSync(HISTORY, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n');
    }
    appendFileSync(HISTORY, historyRows.join('\n') + '\n');
  }

  console.log('→ Run /career-ops pipeline to evaluate the new offers.');
}

main().catch(e => { console.error(e); process.exit(1); });
