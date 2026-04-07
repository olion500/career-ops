#!/usr/bin/env node
/**
 * seed-from-obsidian.mjs — One-time bootstrap of career-ops from Obsidian docs.
 *
 * Reads from:
 *   /Users/2302-pc04/space/docs/02_Areas/Career/PROFILE.md
 *   /Users/2302-pc04/space/docs/02_Areas/Career/applications/<company>/README.md
 *   /Users/2302-pc04/space/docs/02_Areas/기업/*.md
 *
 * Writes to (career-ops root):
 *   cv.md
 *   config/profile.yml
 *   modes/_profile.md
 *   portals.yml
 *   data/applications.md
 *   data/companies/<slug>.md   (one per 기업/ entry)
 *   data/companies/_slugs.yml
 *
 * Usage:
 *   node scripts/seed-from-obsidian.mjs           # preview only
 *   node scripts/seed-from-obsidian.mjs --force   # actually write
 *
 * This is a ONE-TIME script. After successful seed it should not run again.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { parseCompany } from './seed/parse-company.mjs';
import { parseProfile } from './seed/parse-profile.mjs';
import { parseApplication } from './seed/parse-application.mjs';
import { renderProfileYml } from './seed/render-profile-yml.mjs';
import { renderModeProfile } from './seed/render-mode-profile.mjs';
import { renderPortalsYml } from './seed/render-portals.mjs';
import { SLUG_TABLE } from './seed/slug-table.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const OBSIDIAN_PROFILE = '/Users/2302-pc04/space/docs/02_Areas/Career/PROFILE.md';
const OBSIDIAN_APPLICATIONS = '/Users/2302-pc04/space/docs/02_Areas/Career/applications';
const OBSIDIAN_COMPANIES = '/Users/2302-pc04/space/docs/02_Areas/기업';

// Map ASCII application directory names to Korean (some dirs are ASCII, must
// look up Korean name to find slug in SLUG_TABLE).
const APP_DIR_TO_KOREAN = {
  '딜라이트룸': '딜라이트룸',
  '나라스페이스테크놀로지': '나라스페이스테크놀로지',
  'naver-webtoon': '네이버웹툰',
  'nextground': '넥스트그라운드',
};

const OUTPUT_FILES = [
  'cv.md',
  'config/profile.yml',
  'modes/_profile.md',
  'portals.yml',
  'data/applications.md',
  'data/companies/_slugs.yml',
];

function main() {
  const force = process.argv.includes('--force');

  console.log('━━━ career-ops seed (from Obsidian) ━━━\n');

  // Verify inputs
  assertExists(OBSIDIAN_PROFILE, 'PROFILE.md not found');
  assertExists(OBSIDIAN_APPLICATIONS, 'applications/ not found');
  assertExists(OBSIDIAN_COMPANIES, '기업/ not found');

  // 1. Parse PROFILE
  console.log('Parsing PROFILE.md...');
  const profileText = readFileSync(OBSIDIAN_PROFILE, 'utf-8');
  const profile = parseProfile(profileText);
  console.log(`  → ${profile.name} (${profile.title})`);

  // 2. Parse companies
  console.log('\nParsing 기업/*.md...');
  const companyFiles = readdirSync(OBSIDIAN_COMPANIES)
    .filter(f => f.endsWith('.md'))
    .sort();
  console.log(`  → found ${companyFiles.length} markdown files`);

  const companies = [];
  for (const file of companyFiles) {
    const text = readFileSync(join(OBSIDIAN_COMPANIES, file), 'utf-8');
    try {
      const company = parseCompany(text);
      companies.push(company);
      console.log(`  ✓ ${company.name} → ${company.slug}`);
    } catch (e) {
      console.error(`  ✗ ${file}: ${e.message}`);
      throw e;
    }
  }

  // 3. Parse applications
  console.log('\nParsing applications/...');
  const appDirs = readdirSync(OBSIDIAN_APPLICATIONS)
    .filter(d => existsSync(join(OBSIDIAN_APPLICATIONS, d, 'README.md')));
  const trackerRows = [];
  for (const dir of appDirs) {
    const koreanName = APP_DIR_TO_KOREAN[dir];
    if (!koreanName) {
      console.error(`  ✗ ${dir}: no Korean name mapping in APP_DIR_TO_KOREAN`);
      throw new Error(`Add "${dir}" to APP_DIR_TO_KOREAN in seed-from-obsidian.mjs`);
    }
    const text = readFileSync(join(OBSIDIAN_APPLICATIONS, dir, 'README.md'), 'utf-8');
    const row = parseApplication(text, koreanName);
    trackerRows.push(row);
    console.log(`  ✓ ${row.company} / ${row.role} (${row.status})`);
  }

  // 4. Build outputs
  console.log('\nRendering outputs...');
  const outputs = {
    'cv.md': profile.rawBody.trim() + '\n',
    'config/profile.yml': renderProfileYml(profile),
    'modes/_profile.md': renderModeProfile(profile),
    'portals.yml': renderPortalsYml(companies),
    'data/applications.md': renderApplicationsMd(trackerRows),
    'data/companies/_slugs.yml': renderSlugsYml(),
  };
  // One file per company
  for (const c of companies) {
    outputs[`data/companies/${c.slug}.md`] = `# ${c.name}\n\n${c.body}`.trim() + '\n';
  }

  // 5. Preview
  console.log('\n━━━ Preview ━━━');
  console.log('Will create the following files in', ROOT + ':');
  for (const path of Object.keys(outputs).sort()) {
    const exists = existsSync(join(ROOT, path));
    const marker = exists ? ' (EXISTS — will be overwritten)' : '';
    console.log(`  ${path}${marker}`);
  }
  console.log('\nWill NOT touch:');
  console.log('  /Users/2302-pc04/space/docs/02_Areas/Career/');
  console.log('  /Users/2302-pc04/space/docs/02_Areas/기업/');

  // 6. Idempotency guard
  const existing = OUTPUT_FILES.filter(p => existsSync(join(ROOT, p)));
  if (existing.length > 0 && !force) {
    console.error('\n✗ Aborting: the following files already exist:');
    for (const p of existing) console.error(`    ${p}`);
    console.error('\nRe-run with --force to overwrite.');
    process.exit(1);
  }

  if (!force) {
    console.log('\n[preview only — re-run with --force to write]');
    process.exit(0);
  }

  // 7. Write
  console.log('\nWriting files...');
  for (const [path, content] of Object.entries(outputs)) {
    const fullPath = join(ROOT, path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
    console.log(`  ✓ ${path}`);
  }

  console.log('\n✓ Seed complete.');
  console.log('\nNext steps:');
  console.log('  1. Review cv.md, config/profile.yml, modes/_profile.md');
  console.log('  2. Run: node verify-pipeline.mjs');
  console.log('  3. Try: ask Claude "딜라이트룸 평가해줘"');
}

function assertExists(path, message) {
  if (!existsSync(path)) {
    console.error(`✗ ${message}: ${path}`);
    process.exit(1);
  }
}

function renderApplicationsMd(rows) {
  const header = `# Applications Tracker

| # | 날짜 | 회사 | 직무 | 점수 | 상태 | PDF | 리포트 | 메모 |
|---|------|------|------|------|------|-----|--------|------|`;
  const body = rows
    .map((r, i) => `| ${i + 1} | ${r.date || '-'} | ${r.company} | ${r.role} | - | ${r.status} | ❌ | - | ${r.url ? '시드 (Obsidian)' : '시드'} |`)
    .join('\n');
  return `${header}\n${body}\n`;
}

function renderSlugsYml() {
  const lines = Object.entries(SLUG_TABLE)
    .map(([korean, slug]) => `  "${korean}": ${slug}`);
  return `# Korean company name → ASCII slug mapping
# Generated by scripts/seed-from-obsidian.mjs from scripts/seed/slug-table.mjs.
# To add a new company, edit scripts/seed/slug-table.mjs and re-run seed,
# OR add the entry directly here and to portals.yml manually.

slugs:
${lines.join('\n')}
`;
}

main();
