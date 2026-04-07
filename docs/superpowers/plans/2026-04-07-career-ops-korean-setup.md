# Career-ops Korean Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-time seed script that bootstraps career-ops from the user's existing Obsidian Korean career docs (`/Users/2302-pc04/space/docs/02_Areas/Career/` and `/Users/2302-pc04/space/docs/02_Areas/기업/`), producing all onboarding files and adapting career-ops for the Korean job market.

**Architecture:** A single Node.js script `scripts/seed-from-obsidian.mjs` orchestrates pure parser modules in `scripts/seed/` (each tested independently with `node --test`). Reads from Obsidian source dirs, writes to career-ops dirs. Runs once with confirmation; outputs Markdown + YAML files. No runtime dependencies — uses only Node built-ins.

**Tech Stack:** Node.js (ESM `.mjs`), `node:test`, `node:assert/strict`, `node:fs`, hand-rolled YAML frontmatter parser (the existing project has no YAML library and `portals.yml` is read by Claude not JS).

**Spec:** `docs/superpowers/specs/2026-04-07-career-ops-korean-setup-design.md`

---

## File Structure

```
scripts/
├── seed-from-obsidian.mjs              ← orchestrator CLI (Task 9)
└── seed/
    ├── frontmatter.mjs                 ← Task 2: minimal YAML frontmatter parser
    ├── slug-table.mjs                  ← Task 1: hand-curated 33 Korean→slug mappings
    ├── status-mapping.mjs              ← Task 3: Korean status canonicalization
    ├── parse-company.mjs               ← Task 4: 기업/{회사}.md → company record
    ├── parse-profile.mjs               ← Task 5: PROFILE.md → cv.md, profile.yml fields, narrative
    ├── parse-application.mjs           ← Task 6: applications/{회사}/README.md → tracker row
    ├── render-portals.mjs              ← Task 7: company records + boards → portals.yml string
    ├── render-profile-yml.mjs          ← Task 5: profile fields → profile.yml string
    └── render-mode-profile.mjs         ← Task 5: narrative → modes/_profile.md string

tests/
└── seed/
    ├── frontmatter.test.mjs
    ├── slug-table.test.mjs
    ├── status-mapping.test.mjs
    ├── parse-company.test.mjs
    ├── parse-profile.test.mjs
    └── parse-application.test.mjs

templates/
└── states.yml                          ← Task 8: rewrite to Korean canonical statuses
```

**File ownership:**
- Each `parse-*.mjs` is a pure function: `(text) => parsedRecord`. No I/O.
- Each `render-*.mjs` is pure: `(record) => string`. No I/O.
- Only `seed-from-obsidian.mjs` does file I/O and orchestration.
- Tests use fixture strings (no Obsidian file dependencies).

---

## Task 1: Slug Table

**Files:**
- Create: `scripts/seed/slug-table.mjs`
- Test: `tests/seed/slug-table.test.mjs`

- [ ] **Step 1: Create the slug table module**

Create `scripts/seed/slug-table.mjs`:

```javascript
// Hand-curated mapping of Korean company names (as found in 기업/*.md filenames
// and frontmatter `company:` field) to ASCII slugs used by career-ops.
//
// Source: ls /Users/2302-pc04/space/docs/02_Areas/기업/*.md (2026-04-07, 33 files).
// If a 기업/ file has no entry here, the seed script aborts with a clear error
// asking the user to add a mapping.

export const SLUG_TABLE = {
  '레브잇_올웨이즈': 'levit-always',
  '엔엑스엔랩스': 'nxn-labs',
  '라이너': 'liner',
  '오프리메드': 'offrimed',
  '큐픽스': 'cupix',
  '스트리미': 'streami',
  '스노우': 'snow',
  '트릴리온랩스': 'trillion-labs',
  '보이저엑스': 'voyagerx',
  '넥스트그라운드': 'nextground',
  '아하앤컴퍼니': 'aha-company',
  '두들린': 'doodlin',
  '래브라도랩스': 'labrador-labs',
  '노타': 'nota',
  '이그나이트': 'ignite',
  '크림': 'kream',
  '노리코리아': 'nori-korea',
  '네이버웹툰': 'naver-webtoon',
  '가우스랩스': 'gauss-labs',
  '리벨리온': 'rebellions',
  '호패': 'hopae',
  '데이블': 'dable',
  '라포랩스': 'rapport-labs',
  '코드잇': 'codeit',
  '딜라이트룸': 'delight-room',
  '스켈터랩스': 'skelter-labs',
  '올거나이즈': 'allganize',
  '나라스페이스테크놀로지': 'naraspace',
  '인프런': 'inflearn',
  '업스테이지': 'upstage',
  'AB180': 'ab180',
  'AFI': 'afi',
  'LinqAlpha': 'linq-alpha',
};

export function slugFor(koreanName) {
  const slug = SLUG_TABLE[koreanName];
  if (!slug) {
    throw new Error(
      `No slug mapping for company "${koreanName}". ` +
      `Add an entry to scripts/seed/slug-table.mjs SLUG_TABLE.`
    );
  }
  return slug;
}

export function allSlugs() {
  return Object.values(SLUG_TABLE);
}
```

- [ ] **Step 2: Write the test**

Create `tests/seed/slug-table.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLUG_TABLE, slugFor, allSlugs } from '../../scripts/seed/slug-table.mjs';

test('slug table covers all 33 known companies', () => {
  assert.equal(Object.keys(SLUG_TABLE).length, 33);
});

test('all slugs are unique (no collisions)', () => {
  const slugs = allSlugs();
  const unique = new Set(slugs);
  assert.equal(unique.size, slugs.length, `Duplicate slug detected in ${slugs.join(', ')}`);
});

test('all slugs are kebab-case ASCII', () => {
  for (const slug of allSlugs()) {
    assert.match(slug, /^[a-z0-9-]+$/, `Slug "${slug}" is not lowercase kebab-case ASCII`);
  }
});

test('slugFor returns mapped slug', () => {
  assert.equal(slugFor('딜라이트룸'), 'delight-room');
  assert.equal(slugFor('네이버웹툰'), 'naver-webtoon');
  assert.equal(slugFor('AB180'), 'ab180');
});

test('slugFor throws helpful error for unknown company', () => {
  assert.throws(
    () => slugFor('Unknown회사'),
    /No slug mapping for company "Unknown회사"/
  );
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/2302-pc04/nexeder/career-ops
node --test tests/seed/slug-table.test.mjs
```

Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed/slug-table.mjs tests/seed/slug-table.test.mjs
git commit -m "Add slug table for 33 Korean companies"
```

---

## Task 2: Frontmatter Parser

**Files:**
- Create: `scripts/seed/frontmatter.mjs`
- Test: `tests/seed/frontmatter.test.mjs`

The 기업/*.md files use YAML frontmatter delimited by `---`. We need a minimal parser supporting: scalar `key: value`, quoted strings, list `[a, b, c]`, and booleans. No nested objects needed.

- [ ] **Step 1: Write the failing test**

Create `tests/seed/frontmatter.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from '../../scripts/seed/frontmatter.mjs';

test('parses simple key-value pairs', () => {
  const input = `---
company: 딜라이트룸
field: 슬립테크/웰니스
location: 강남 (신논현역)
---
# Body
content here`;
  const { data, body } = parseFrontmatter(input);
  assert.equal(data.company, '딜라이트룸');
  assert.equal(data.field, '슬립테크/웰니스');
  assert.equal(data.location, '강남 (신논현역)');
  assert.equal(body.trim(), '# Body\ncontent here');
});

test('parses inline list syntax', () => {
  const input = `---
stack: [Golang, Node.js, Python, Kubernetes]
---
body`;
  const { data } = parseFrontmatter(input);
  assert.deepEqual(data.stack, ['Golang', 'Node.js', 'Python', 'Kubernetes']);
});

test('parses booleans', () => {
  const input = `---
open: true
closed: false
---
body`;
  const { data } = parseFrontmatter(input);
  assert.equal(data.open, true);
  assert.equal(data.closed, false);
});

test('parses double-quoted strings (preserving inner content)', () => {
  const input = `---
rating: "잡플 4.8 / 블라 4.7"
---
body`;
  const { data } = parseFrontmatter(input);
  assert.equal(data.rating, '잡플 4.8 / 블라 4.7');
});

test('returns empty data when no frontmatter', () => {
  const input = `# Just a heading\n\nNo frontmatter here.`;
  const { data, body } = parseFrontmatter(input);
  assert.deepEqual(data, {});
  assert.equal(body, input);
});

test('handles dates as strings', () => {
  const input = `---
updated: 2026-02-28
---
body`;
  const { data } = parseFrontmatter(input);
  assert.equal(data.updated, '2026-02-28');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test tests/seed/frontmatter.test.mjs
```

Expected: FAIL with "Cannot find module '../../scripts/seed/frontmatter.mjs'".

- [ ] **Step 3: Implement the parser**

Create `scripts/seed/frontmatter.mjs`:

```javascript
// Minimal YAML frontmatter parser for Obsidian markdown files.
// Supports: scalar key:value, quoted strings, inline lists [a, b], booleans.
// Does NOT support: nested objects, multiline strings, anchors.

export function parseFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { data: {}, body: text };
  }
  // Find closing ---
  const lines = text.split('\n');
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return { data: {}, body: text };

  const fmLines = lines.slice(1, endIdx);
  const body = lines.slice(endIdx + 1).join('\n');
  const data = {};

  for (const line of fmLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();
    data[key] = parseValue(rawValue);
  }

  return { data, body };
}

function parseValue(raw) {
  if (raw === '') return '';
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Quoted string
  if ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  // Inline list [a, b, c]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
  }
  // Bare scalar (string)
  return raw;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test tests/seed/frontmatter.test.mjs
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed/frontmatter.mjs tests/seed/frontmatter.test.mjs
git commit -m "Add minimal YAML frontmatter parser for seed script"
```

---

## Task 3: Status Mapping

**Files:**
- Create: `scripts/seed/status-mapping.mjs`
- Test: `tests/seed/status-mapping.test.mjs`

Maps Korean status text from `기업/` frontmatter to career-ops canonical Korean statuses. Used both for company-to-tracker decisions and for the new `templates/states.yml`.

- [ ] **Step 1: Write the failing test**

Create `tests/seed/status-mapping.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_STATUSES,
  mapStatus,
  shouldTrack,
} from '../../scripts/seed/status-mapping.mjs';

test('exposes 8 canonical Korean statuses', () => {
  assert.deepEqual(CANONICAL_STATUSES, [
    '평가완료',
    '지원',
    '응답',
    '면접',
    '오퍼',
    '불합격',
    '보류',
    'SKIP',
  ]);
});

test('mapStatus normalizes synonyms to canonical', () => {
  assert.equal(mapStatus('평가완료'), '평가완료');
  assert.equal(mapStatus('검토중'), '평가완료');
  assert.equal(mapStatus('지원'), '지원');
  assert.equal(mapStatus('지원완료'), '지원');
  assert.equal(mapStatus('면접'), '면접');
  assert.equal(mapStatus('합격'), '오퍼');
  assert.equal(mapStatus('오퍼'), '오퍼');
  assert.equal(mapStatus('불합'), '불합격');
  assert.equal(mapStatus('탈락'), '불합격');
  assert.equal(mapStatus('포기'), '보류');
  assert.equal(mapStatus('보류'), '보류');
});

test('mapStatus returns null for unknown statuses', () => {
  assert.equal(mapStatus('미지원'), null);
  assert.equal(mapStatus(''), null);
  assert.equal(mapStatus(undefined), null);
  assert.equal(mapStatus('아무거나'), null);
});

test('shouldTrack returns false for 미지원 / unknown', () => {
  assert.equal(shouldTrack('미지원'), false);
  assert.equal(shouldTrack(''), false);
  assert.equal(shouldTrack(undefined), false);
});

test('shouldTrack returns true for any tracked status', () => {
  assert.equal(shouldTrack('평가완료'), true);
  assert.equal(shouldTrack('지원'), true);
  assert.equal(shouldTrack('합격'), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test tests/seed/status-mapping.test.mjs
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement the module**

Create `scripts/seed/status-mapping.mjs`:

```javascript
// Korean status canonicalization for the seed script.
// Maps free-form Korean status text from 기업/*.md frontmatter to the
// 8 canonical Korean statuses used by career-ops applications.md tracker.

export const CANONICAL_STATUSES = [
  '평가완료',
  '지원',
  '응답',
  '면접',
  '오퍼',
  '불합격',
  '보류',
  'SKIP',
];

const ALIASES = {
  // 평가완료
  '평가완료': '평가완료',
  '검토중': '평가완료',
  '평가': '평가완료',
  // 지원
  '지원': '지원',
  '지원완료': '지원',
  '제출': '지원',
  // 응답
  '응답': '응답',
  // 면접
  '면접': '면접',
  '인터뷰': '면접',
  // 오퍼
  '오퍼': '오퍼',
  '합격': '오퍼',
  // 불합격
  '불합격': '불합격',
  '불합': '불합격',
  '탈락': '불합격',
  // 보류
  '보류': '보류',
  '포기': '보류',
  // SKIP
  'SKIP': 'SKIP',
  '스킵': 'SKIP',
};

export function mapStatus(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return ALIASES[trimmed] || null;
}

export function shouldTrack(raw) {
  return mapStatus(raw) !== null;
}
```

- [ ] **Step 4: Run tests**

```bash
node --test tests/seed/status-mapping.test.mjs
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed/status-mapping.mjs tests/seed/status-mapping.test.mjs
git commit -m "Add Korean status canonicalization mapping"
```

---

## Task 4: Parse Company

**Files:**
- Create: `scripts/seed/parse-company.mjs`
- Test: `tests/seed/parse-company.test.mjs`

Reads a single 기업/{회사}.md text and produces a structured company record. Uses `parseFrontmatter` and `slugFor`. Pure function — no I/O.

- [ ] **Step 1: Write the failing test**

Create `tests/seed/parse-company.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCompany } from '../../scripts/seed/parse-company.mjs';

const SAMPLE = `---
company: 딜라이트룸
field: 슬립테크/웰니스
location: 강남 (신논현역)
remote: 미기재 (유연근무 9-11시)
stack: [Golang, Node.js, Python, Kubernetes, PostgreSQL, AWS, GCP]
job: Backend Engineer
url: https://team.alar.my/job_posting/fYEkfMEa
rating: "잡플 4.8 / 블라 4.7"
status: 미지원
open: true
updated: 2026-02-28
---

# 회사
글로벌 1위 알람앱 Alarmy 운영사.
`;

test('parses a complete company file', () => {
  const record = parseCompany(SAMPLE);
  assert.equal(record.name, '딜라이트룸');
  assert.equal(record.slug, 'delight-room');
  assert.equal(record.field, '슬립테크/웰니스');
  assert.equal(record.location, '강남 (신논현역)');
  assert.equal(record.url, 'https://team.alar.my/job_posting/fYEkfMEa');
  assert.equal(record.job, 'Backend Engineer');
  assert.deepEqual(record.stack, ['Golang', 'Node.js', 'Python', 'Kubernetes', 'PostgreSQL', 'AWS', 'GCP']);
  assert.equal(record.rawStatus, '미지원');
  assert.equal(record.open, true);
  assert.equal(record.body.trim().startsWith('# 회사'), true);
});

test('throws when company field missing', () => {
  const input = `---
field: foo
---
body`;
  assert.throws(() => parseCompany(input), /missing required "company" field/);
});

test('throws when slug not in slug-table', () => {
  const input = `---
company: 모르는회사
url: https://example.com
---
body`;
  assert.throws(() => parseCompany(input), /No slug mapping/);
});

test('handles missing optional fields gracefully', () => {
  const input = `---
company: 큐픽스
url: https://example.com
---
body`;
  const record = parseCompany(input);
  assert.equal(record.slug, 'cupix');
  assert.equal(record.field, '');
  assert.deepEqual(record.stack, []);
  assert.equal(record.rawStatus, '');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test tests/seed/parse-company.test.mjs
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement parse-company**

Create `scripts/seed/parse-company.mjs`:

```javascript
import { parseFrontmatter } from './frontmatter.mjs';
import { slugFor } from './slug-table.mjs';

export function parseCompany(text) {
  const { data, body } = parseFrontmatter(text);
  if (!data.company) {
    throw new Error('Company file missing required "company" field in frontmatter');
  }
  return {
    name: data.company,
    slug: slugFor(data.company),
    field: data.field || '',
    location: data.location || '',
    remote: data.remote || '',
    stack: Array.isArray(data.stack) ? data.stack : [],
    job: data.job || '',
    url: data.url || '',
    rating: data.rating || '',
    rawStatus: data.status || '',
    open: data.open === true,
    updated: data.updated || '',
    body,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
node --test tests/seed/parse-company.test.mjs
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed/parse-company.mjs tests/seed/parse-company.test.mjs
git commit -m "Add company file parser"
```

---

## Task 5: Parse Profile + Render Profile YAML + Render Mode Profile

**Files:**
- Create: `scripts/seed/parse-profile.mjs`
- Create: `scripts/seed/render-profile-yml.mjs`
- Create: `scripts/seed/render-mode-profile.mjs`
- Test: `tests/seed/parse-profile.test.mjs`

`PROFILE.md` is the master profile (see `/Users/2302-pc04/space/docs/02_Areas/Career/PROFILE.md`). It has frontmatter (`name`, `title`, `email`, `linkedin`, `github`, `location`, `education`) and sections (`# 한 줄 소개`, `# 강점`, `# 약점`, `# 선호 조건`).

`parse-profile` extracts these. The two render functions emit `config/profile.yml` and `modes/_profile.md` strings.

- [ ] **Step 1: Write the failing test**

Create `tests/seed/parse-profile.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProfile } from '../../scripts/seed/parse-profile.mjs';
import { renderProfileYml } from '../../scripts/seed/render-profile-yml.mjs';
import { renderModeProfile } from '../../scripts/seed/render-mode-profile.mjs';

const SAMPLE = `---
name: 오상헌 (Dominik Oh)
title: Backend Developer
experience: 4년
current: Cupix
location: 용인
email: ymj02349@gmail.com
linkedin: https://www.linkedin.com/in/sanghun-oh-27311a230/
github: https://github.com/olion500
updated: 2026-01-31
---

# 한 줄 소개

Backend Engineer. 스타트업에서 API 설계, 인프라 구축, 개발 문화 개선까지 폭넓게 수행.

---

# 강점

- **빠른 기술 습득**: Rails(2주), K8s/MinIO(팀 최초), Terraform(1일)
- **인증/보안 시스템**: OAuth 2.0, SAML, Cognito

---

# 약점

- **프론트엔드**: React 기본 수준
- **Spring/JVM**: 백엔드 실무 경험 없음

---

# 선호 조건

| 항목 | 선호 | 허용 | 거부 |
|------|------|------|------|
| 위치 | 판교, 강남 | 서울 전역 | 지방 |
| 도메인 | SaaS, 인프라 | 커머스 | 광고, 게임 |
`;

test('parses profile frontmatter and sections', () => {
  const p = parseProfile(SAMPLE);
  assert.equal(p.name, '오상헌 (Dominik Oh)');
  assert.equal(p.title, 'Backend Developer');
  assert.equal(p.email, 'ymj02349@gmail.com');
  assert.equal(p.linkedin, 'https://www.linkedin.com/in/sanghun-oh-27311a230/');
  assert.equal(p.github, 'https://github.com/olion500');
  assert.equal(p.location, '용인');
  assert.match(p.headline, /Backend Engineer/);
  assert.match(p.strengths, /빠른 기술 습득/);
  assert.match(p.weaknesses, /프론트엔드/);
  assert.match(p.preferences, /판교, 강남/);
});

test('renderProfileYml produces valid YAML structure', () => {
  const p = parseProfile(SAMPLE);
  const yml = renderProfileYml(p);
  assert.match(yml, /candidate:/);
  assert.match(yml, /full_name: "오상헌/);
  assert.match(yml, /email: "ymj02349@gmail.com"/);
  assert.match(yml, /linkedin: "https:\/\/www\.linkedin\.com\/in\/sanghun-oh-27311a230\/"/);
  assert.match(yml, /github: "https:\/\/github\.com\/olion500"/);
  assert.match(yml, /currency: "KRW"/);
  assert.match(yml, /timezone: "KST"/);
});

test('renderModeProfile includes Korean output rules and narrative', () => {
  const p = parseProfile(SAMPLE);
  const md = renderModeProfile(p);
  assert.match(md, /## 출력 언어 \(Korean Market\)/);
  assert.match(md, /KRW 만원/);
  assert.match(md, /판교 > 강남/);
  assert.match(md, /## 강점/);
  assert.match(md, /빠른 기술 습득/);
  assert.match(md, /## 약점/);
  assert.match(md, /## 선호 조건/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test tests/seed/parse-profile.test.mjs
```

Expected: FAIL (modules not found).

- [ ] **Step 3: Implement parse-profile**

Create `scripts/seed/parse-profile.mjs`:

```javascript
import { parseFrontmatter } from './frontmatter.mjs';

// Extract content of a "# Heading" section up to the next h1 or EOF.
function extractSection(body, headingText) {
  const re = new RegExp(`(^|\\n)# ${escapeRegex(headingText)}\\s*\\n([\\s\\S]*?)(?=\\n# |$)`);
  const m = body.match(re);
  return m ? m[2].trim() : '';
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseProfile(text) {
  const { data, body } = parseFrontmatter(text);
  return {
    name: data.name || '',
    title: data.title || '',
    experience: data.experience || '',
    current: data.current || '',
    location: data.location || '',
    email: data.email || '',
    linkedin: data.linkedin || '',
    github: data.github || '',
    updated: data.updated || '',
    headline: extractSection(body, '한 줄 소개'),
    strengths: extractSection(body, '강점'),
    weaknesses: extractSection(body, '약점'),
    preferences: extractSection(body, '선호 조건'),
    rawBody: body,
  };
}
```

- [ ] **Step 4: Implement render-profile-yml**

Create `scripts/seed/render-profile-yml.mjs`:

```javascript
// Renders a parsed profile into config/profile.yml content.
// Format: minimal YAML, double-quoted strings to avoid escaping issues.

export function renderProfileYml(profile) {
  return `# Career-Ops Profile Configuration (한국 시장)
# Generated by scripts/seed-from-obsidian.mjs.
# This is YOUR file — never auto-updated. Edit freely.

candidate:
  full_name: "${profile.name}"
  email: "${profile.email}"
  location: "${profile.location}"
  linkedin: "${profile.linkedin}"
  github: "${profile.github}"

target_roles:
  primary:
    - "Backend Engineer"
    - "Platform Engineer"
    - "DevOps Engineer"
  archetypes:
    - name: "Backend Engineer"
      level: "Mid-Senior (4년)"
      fit: "primary"
    - name: "Platform / Infrastructure Engineer"
      level: "Mid-Senior"
      fit: "primary"
    - name: "DevOps / SRE"
      level: "Mid-Senior"
      fit: "secondary"

narrative:
  headline: "${profile.headline.split('\\n')[0].replace(/"/g, '\\"')}"
  superpowers:
    - "빠른 기술 습득 (Rails 2주, K8s 팀 최초 도입)"
    - "인증/보안 시스템 (OAuth, SAML, Cognito)"
    - "DevOps/인프라 (AWS, GCP, K8s, Terraform)"
    - "AI Agent 활용 (LLM 기반 자동화 시스템 기획~구축)"

compensation:
  target_range: "7,000-9,000만원"
  currency: "KRW"
  minimum: "6,500만원"
  location_flexibility: "재택/하이브리드 선호, 판교/강남 출근 가능"

location:
  country: "South Korea"
  city: "${profile.location}"
  timezone: "KST"
  visa_status: "내국인"

# Updated by user as needed.
`;
}
```

- [ ] **Step 5: Implement render-mode-profile**

Create `scripts/seed/render-mode-profile.mjs`:

```javascript
// Renders a parsed profile into modes/_profile.md content.
// Includes Korean output rules block + user narrative from PROFILE sections.

export function renderModeProfile(profile) {
  return `# User Profile Context — career-ops (한국 시장)

<!-- Generated by scripts/seed-from-obsidian.mjs from PROFILE.md.
     This file is YOURS. It will NEVER be auto-updated by system updates.
     Edit freely. -->

## 출력 언어 (Korean Market)

- 모든 평가 리포트, 지원서, CV, 트래커 노트는 **한국어**로 작성
- 회사명/직무명은 원문 그대로 (예: "딜라이트룸 / Backend Engineer")
- 영문 기술 용어는 그대로 (Kubernetes, OAuth 등)
- 예외: JD가 영문이고 글로벌 회사면 영문 리포트 OK (사용자 명시 요청 시)

## 통화/날짜/수치

- 연봉: KRW 만원 단위 (예: 7,500만원, 8,000-9,500만원)
- USD 표기는 글로벌 회사 한정
- 날짜: YYYY-MM-DD
- 시간대: KST

## 한국 시장 특성

- 신원조회/평판조회: 후기 단계 일반적. 면접 진행 후 언급 OK
- 연봉 협상: 첫 제안 후 1차 카운터 표준. 베이스 vs 인센티브 분리
- 위치 우선순위: 판교 > 강남 > 서울 기타 > 그 외
- 재택: 사용자가 재택 선호 → hybrid/remote는 강한 plus
- 도메인 거부: 광고/게임

## 평가 톤

- 기술 갭은 솔직하게 인정 (Golang, Java/Spring, MySQL 등)
- 빠른 학습 이력으로 보완 (Rails 2주, K8s/MinIO 팀 최초, Terraform 1일)
- 정량 수치 기반 (PROFILE 성과 하이라이트)

---

## 한 줄 소개

${profile.headline}

## 강점

${profile.strengths}

## 약점

${profile.weaknesses}

## 선호 조건

${profile.preferences}

---

_Source: PROFILE.md (last updated ${profile.updated})_
`;
}
```

- [ ] **Step 6: Run tests**

```bash
node --test tests/seed/parse-profile.test.mjs
```

Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add scripts/seed/parse-profile.mjs scripts/seed/render-profile-yml.mjs scripts/seed/render-mode-profile.mjs tests/seed/parse-profile.test.mjs
git commit -m "Add profile parser and renderers for cv/profile.yml/_profile.md"
```

---

## Task 6: Parse Application

**Files:**
- Create: `scripts/seed/parse-application.mjs`
- Test: `tests/seed/parse-application.test.mjs`

Parses a `Career/applications/{회사}/README.md` file into a tracker row. Extracts company, role, application date, source URL. Status inferred: if `**지원일:**` present → `지원`, else → `평가완료`.

- [ ] **Step 1: Write the failing test**

Create `tests/seed/parse-application.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseApplication } from '../../scripts/seed/parse-application.mjs';

const SAMPLE = `# 딜라이트룸 지원

**직무:** Backend Engineer (4~10년)
**지원일:** 2026-02-28
**출처:** [딜라이트룸 채용](https://team.alar.my/job_posting/fYEkfMEa), [리멤버](https://career.rememberapp.co.kr/job/posting/135623)
**제출형식:** PDF (이력서 + 포트폴리오)

---

## 제출 서류
1. 이력서
2. 포트폴리오
`;

test('parses a complete application README', () => {
  const r = parseApplication(SAMPLE, '딜라이트룸');
  assert.equal(r.company, '딜라이트룸');
  assert.equal(r.slug, 'delight-room');
  assert.equal(r.role, 'Backend Engineer (4~10년)');
  assert.equal(r.date, '2026-02-28');
  assert.equal(r.url, 'https://team.alar.my/job_posting/fYEkfMEa');
  assert.equal(r.status, '지원');
});

test('infers 평가완료 status when 지원일 missing', () => {
  const input = `# 회사 평가

**직무:** Backend Engineer
**출처:** [채용](https://example.com)
`;
  const r = parseApplication(input, '큐픽스');
  assert.equal(r.status, '평가완료');
  assert.equal(r.date, ''); // empty when no date
});

test('handles missing optional fields', () => {
  const input = `# 회사

**직무:** Engineer
`;
  const r = parseApplication(input, '큐픽스');
  assert.equal(r.role, 'Engineer');
  assert.equal(r.url, '');
  assert.equal(r.status, '평가완료');
});

test('throws when company name has no slug mapping', () => {
  assert.throws(
    () => parseApplication('# x', '모르는회사'),
    /No slug mapping/
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test tests/seed/parse-application.test.mjs
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement parse-application**

Create `scripts/seed/parse-application.mjs`:

```javascript
import { slugFor } from './slug-table.mjs';

// Parses a Career/applications/{회사}/README.md file into a tracker row.
// Company name is passed in (from the directory name, since some dir names
// are ASCII like "naver-webtoon" and don't match the README's first heading).

export function parseApplication(text, companyKoreanName) {
  const role = matchField(text, '직무');
  const date = matchField(text, '지원일');
  const sourceLine = matchField(text, '출처');
  const url = extractFirstUrl(sourceLine);
  const status = date ? '지원' : '평가완료';

  return {
    company: companyKoreanName,
    slug: slugFor(companyKoreanName),
    role: role || '',
    date: date || '',
    url: url || '',
    status,
  };
}

function matchField(text, label) {
  // Matches "**label:** value" up to end of line
  const re = new RegExp(`\\*\\*${escapeRegex(label)}:\\*\\*\\s*(.+)`);
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function extractFirstUrl(text) {
  // Matches markdown link [...](url) or bare http(s)://...
  const mdLink = text.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/);
  if (mdLink) return mdLink[1];
  const bare = text.match(/https?:\/\/\S+/);
  return bare ? bare[0] : '';
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**Note:** The `naver-webtoon` and `nextground` directory names are ASCII. The seed orchestrator (Task 9) will map `naver-webtoon` → `네이버웹툰` and `nextground` → `넥스트그라운드` before calling `parseApplication`. Verify by adding both Korean names to slug-table (Task 1 already includes them).

- [ ] **Step 4: Run tests**

```bash
node --test tests/seed/parse-application.test.mjs
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed/parse-application.mjs tests/seed/parse-application.test.mjs
git commit -m "Add application README parser for tracker seeding"
```

---

## Task 7: Render Portals YAML

**Files:**
- Create: `scripts/seed/render-portals.mjs`
- Test: extend `tests/seed/parse-company.test.mjs` (no separate test file needed; small renderer)

- [ ] **Step 1: Add test to parse-company.test.mjs**

Append to `tests/seed/parse-company.test.mjs`:

```javascript
import { renderPortalsYml } from '../../scripts/seed/render-portals.mjs';

test('renderPortalsYml emits companies and boards sections', () => {
  const companies = [
    { name: '딜라이트룸', slug: 'delight-room', url: 'https://example.com/dr', stack: ['Golang', 'K8s'] },
    { name: '큐픽스', slug: 'cupix', url: 'https://example.com/cx', stack: ['Ruby', 'Rails'] },
  ];
  const yml = renderPortalsYml(companies);
  // Companies block
  assert.match(yml, /tracked_companies:/);
  assert.match(yml, /name: 딜라이트룸/);
  assert.match(yml, /slug: delight-room/);
  assert.match(yml, /careers_url: "https:\/\/example\.com\/dr"/);
  assert.match(yml, /tags: \[Golang, K8s\]/);
  // Boards block — must include all 4
  assert.match(yml, /name: 원티드/);
  assert.match(yml, /name: 점핏/);
  assert.match(yml, /name: 지킹/);
  assert.match(yml, /name: 인디스워크/);
  // Title filter — Korean backend keywords
  assert.match(yml, /title_filter:/);
  assert.match(yml, /"Backend"/);
  assert.match(yml, /"Kubernetes"/);
});

test('renderPortalsYml escapes companies with empty stack gracefully', () => {
  const companies = [{ name: '큐픽스', slug: 'cupix', url: 'https://x.com', stack: [] }];
  const yml = renderPortalsYml(companies);
  assert.match(yml, /tags: \[\]/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test tests/seed/parse-company.test.mjs
```

Expected: FAIL (renderPortalsYml not found).

- [ ] **Step 3: Implement render-portals**

Create `scripts/seed/render-portals.mjs`:

```javascript
// Renders an array of company records into portals.yml content.
// Includes the tracked_companies block, the 4 Korean job boards,
// and a title_filter tuned to backend/infra/cloud keywords.

export function renderPortalsYml(companies) {
  const companiesBlock = companies
    .map(c => `  - name: ${c.name}
    slug: ${c.slug}
    careers_url: "${c.url}"
    tags: [${c.stack.join(', ')}]`)
    .join('\n');

  return `# Portal Scanner Configuration (한국 시장)
# Generated by scripts/seed-from-obsidian.mjs.
# Edit freely — never auto-updated.

# -- Title filter --
title_filter:
  positive:
    - "Backend"
    - "Server"
    - "Platform"
    - "Infra"
    - "Infrastructure"
    - "DevOps"
    - "SRE"
    - "Cloud"
    - "Kubernetes"
    - "백엔드"
    - "서버"
    - "플랫폼"
    - "인프라"
    - "클라우드"
  negative:
    - "Frontend"
    - "iOS"
    - "Android"
    - "Game"
    - "게임"
    - "Junior"
    - "Intern"
    - "인턴"
    - "Data Scientist"
    - "ML Engineer"
  seniority_boost:
    - "Senior"
    - "Lead"
    - "Staff"
    - "시니어"

# -- Tracked companies (seeded from /Users/2302-pc04/space/docs/02_Areas/기업/) --
tracked_companies:
${companiesBlock}

# -- Korean job boards --
boards:
  - name: 원티드
    url: https://www.wanted.co.kr/search?query=backend
    type: aggregator
    enabled: true
  - name: 점핏
    url: https://jumpit.saramin.co.kr
    type: aggregator
    enabled: true
  - name: 지킹
    url: https://zighang.com/recruitment
    type: aggregator
    enabled: true
  - name: 인디스워크
    url: https://inthiswork.com/it
    type: aggregator
    enabled: true

# Note: Korean job boards are JS-rendered. Use Playwright (already a dependency)
# in scan mode. First run may need selector adjustments per board.
`;
}
```

- [ ] **Step 4: Run tests**

```bash
node --test tests/seed/parse-company.test.mjs
```

Expected: 6 tests pass (4 from Task 4 + 2 new).

- [ ] **Step 5: Commit**

```bash
git add scripts/seed/render-portals.mjs tests/seed/parse-company.test.mjs
git commit -m "Add portals.yml renderer with 4 Korean job boards"
```

---

## Task 8: Korean Canonical States in templates/states.yml

**Files:**
- Modify: `templates/states.yml`

This file is the source of truth for `normalize-statuses.mjs`, `merge-tracker.mjs`, `dedup-tracker.mjs`. Switching to Korean canonical states is required for the rest of the system to work after seeding.

- [ ] **Step 1: Read current file (sanity check)**

```bash
cat /Users/2302-pc04/nexeder/career-ops/templates/states.yml
```

Confirm it has the 8 English states (evaluated, applied, responded, interview, offer, rejected, discarded, skip).

- [ ] **Step 2: Rewrite to Korean canonical**

Replace the entire contents of `templates/states.yml` with:

```yaml
# Career-Ops — Canonical States (한국 시장)
# Source of truth for career-ops (writer) and dashboard (reader).
# Both systems MUST use these exact labels.
#
# Rule: The status field in applications.md must contain EXACTLY
# one of these labels (case-insensitive). No markdown bold (**),
# no dates, no extra text. Dates go in the date column.

states:
  - id: evaluated
    label: 평가완료
    aliases: [evaluated, evaluada, 평가, 검토중]
    description: 평가 완료, 지원 결정 대기
    dashboard_group: evaluated

  - id: applied
    label: 지원
    aliases: [applied, aplicado, 지원완료, 제출]
    description: 지원서 제출됨
    dashboard_group: applied

  - id: responded
    label: 응답
    aliases: [responded, respondido]
    description: 회사로부터 응답 받음 (면접 전 단계)
    dashboard_group: responded

  - id: interview
    label: 면접
    aliases: [interview, entrevista, 인터뷰]
    description: 면접 진행 중
    dashboard_group: interview

  - id: offer
    label: 오퍼
    aliases: [offer, oferta, 합격]
    description: 오퍼 받음
    dashboard_group: offer

  - id: rejected
    label: 불합격
    aliases: [rejected, rechazado, 불합, 탈락]
    description: 회사에서 거절
    dashboard_group: rejected

  - id: discarded
    label: 보류
    aliases: [discarded, descartado, 포기, cerrada, cancelada]
    description: 후보자가 보류 또는 공고 마감
    dashboard_group: discarded

  - id: skip
    label: SKIP
    aliases: [skip, no_aplicar, 스킵, monitor]
    description: 적합하지 않음, 지원하지 않음
    dashboard_group: skip
```

- [ ] **Step 3: Verify the existing pipeline scripts still parse it**

```bash
node verify-pipeline.mjs 2>&1 || true
```

Expected: may emit warnings about missing files (cv.md etc.), but should not crash on YAML parse. If YAML errors appear, fix the file format.

- [ ] **Step 4: Commit**

```bash
git add templates/states.yml
git commit -m "Switch canonical states to Korean labels"
```

---

## Task 9: Seed Orchestrator

**Files:**
- Create: `scripts/seed-from-obsidian.mjs`

The CLI entry point. Reads from Obsidian dirs, calls parsers, writes outputs. Has preview mode (default) and `--force` flag to actually write. Idempotent guard: refuses to run if any output file already exists unless `--force` is set.

- [ ] **Step 1: Create the orchestrator**

Create `scripts/seed-from-obsidian.mjs`:

```javascript
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
import { mapStatus, shouldTrack } from './seed/status-mapping.mjs';

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
```

- [ ] **Step 2: Verify the script runs in preview mode**

```bash
cd /Users/2302-pc04/nexeder/career-ops
node scripts/seed-from-obsidian.mjs
```

Expected output:
- `Parsing PROFILE.md...` → name printed
- `Parsing 기업/*.md...` → 33 companies listed with slugs
- `Parsing applications/...` → 4 applications listed
- `━━━ Preview ━━━` block listing files to be created
- Exits with `[preview only — re-run with --force to write]`

If it fails on a missing slug, add the missing company to `scripts/seed/slug-table.mjs` and re-run. Repeat until all 33 parse cleanly.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-from-obsidian.mjs
git commit -m "Add seed orchestrator for Korean career-ops bootstrap"
```

---

## Task 10: Run Seed and Verify Outputs

**Files:** (only running, not modifying source)

- [ ] **Step 1: Run with --force**

```bash
cd /Users/2302-pc04/nexeder/career-ops
node scripts/seed-from-obsidian.mjs --force
```

Expected: ends with `✓ Seed complete.` and a "Next steps" block.

- [ ] **Step 2: Verify file creation**

```bash
ls -la cv.md config/profile.yml modes/_profile.md portals.yml data/applications.md data/companies/_slugs.yml
ls data/companies/*.md | wc -l
```

Expected:
- All 6 top-level files exist
- `data/companies/*.md` count = 33

- [ ] **Step 3: Spot-check content**

```bash
head -20 cv.md
head -30 config/profile.yml
head -30 modes/_profile.md
head -50 portals.yml
cat data/applications.md
head -10 data/companies/delight-room.md
```

Expected:
- `cv.md` has the Korean PROFILE body (no frontmatter)
- `config/profile.yml` has `candidate.full_name: "오상헌 (Dominik Oh)"`, `currency: "KRW"`
- `modes/_profile.md` has `## 출력 언어 (Korean Market)` block
- `portals.yml` has `tracked_companies:` with 33 entries and 4 boards
- `data/applications.md` has 4 rows in Korean status
- `data/companies/delight-room.md` starts with `# 딜라이트룸`

- [ ] **Step 4: Run pipeline verification**

```bash
node verify-pipeline.mjs 2>&1 | tail -30
```

Expected: no fatal errors. Warnings about Spanish→Korean status migration are OK; the new states.yml is correct.

- [ ] **Step 5: Run all seed tests one final time**

```bash
node --test tests/seed/
```

Expected: all tests pass (slug-table 5, frontmatter 6, status-mapping 5, parse-company 6, parse-profile 3, parse-application 4 = 29 tests).

- [ ] **Step 6: Commit the seed outputs**

```bash
git add cv.md config/profile.yml modes/_profile.md portals.yml data/applications.md data/companies/
git commit -m "Bootstrap career-ops with Korean career data from Obsidian"
```

**Note:** `cv.md`, `config/profile.yml`, `modes/_profile.md`, `data/` are user-data files. Existing `.gitignore` may already exclude some — check `git status` after seed and adjust `.gitignore` only if necessary (do not ignore the seed outputs unless the user later asks).

---

## Self-Review Notes

Spec coverage:
- One-time seed script ✓ (Task 9)
- Read PROFILE → cv.md / profile.yml / _profile.md ✓ (Task 5)
- Read 기업/*.md → portals.yml + data/companies/ + _slugs.yml ✓ (Tasks 4, 7, 9)
- Read applications/ → data/applications.md ✓ (Task 6)
- Status canonicalization Korean ✓ (Task 3)
- Korean canonical states in templates/states.yml ✓ (Task 8)
- Idempotency guard (--force required to overwrite) ✓ (Task 9)
- Pre-flight preview ✓ (Task 9)
- Slug uniqueness enforcement ✓ (Task 1)
- 4 Korean job boards (원티드, 점핏, 지킹, 인디스워크) ✓ (Task 7)
- KRW 만원, KST, 판교/강남 priority in _profile.md ✓ (Task 5)
- Pure parser/renderer functions, I/O only in orchestrator ✓ (file structure)

Out of scope (per spec):
- PDF generation (deferred)
- Sync mechanism (rejected)
- Automatic English fallback CV (user-triggered only)

All steps have concrete code or commands. No TODOs or "implement later".
