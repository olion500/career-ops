# Career-ops Korean Setup — Design

**Date:** 2026-04-07
**Status:** Approved (sections 1-4)
**Goal:** Bootstrap career-ops from existing Obsidian career docs and adapt for Korean job market.

---

## Context

User has rich Korean career documentation in Obsidian:
- `/Users/2302-pc04/space/docs/02_Areas/Career/PROFILE.md` — master profile (오상헌, Backend Engineer, 4년 경력, Cupix)
- `/Users/2302-pc04/space/docs/02_Areas/Career/applications/` — 4 historic applications (딜라이트룸, 나라스페이스테크놀로지, naver-webtoon, nextground)
- `/Users/2302-pc04/space/docs/02_Areas/Career/templates/cv/` — 4 CV variants (Korean, Global, FAANG, WSO)
- `/Users/2302-pc04/space/docs/02_Areas/Career/templates/resume/` — 6 essay templates (지원동기, 기술역량, 도전적프로젝트, 강점, 협업, 포트폴리오)
- `/Users/2302-pc04/space/docs/02_Areas/기업/` — 35 researched company files with structured frontmatter (company, field, location, remote, stack, job, url, rating, status, open) plus sections 회사/제품/평판/직무/평가

career-ops is in fresh state (no onboarding done). The 4 onboarding files are missing: `cv.md`, `config/profile.yml`, `modes/_profile.md`, `portals.yml`.

## Brainstorming Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Data location | **B (분리)**: career-ops lives in own dir, Obsidian dirs untouched |
| 2 | Mode language | **B**: English mode files unchanged, Korean output via `_profile.md` rules |
| 3 | Job sources | **C**: companies + boards |
| 4 | 기업/ relationship | **A modified**: one-time read at seed, no sync, no further coupling |
| 5 | CV format | **A**: Korean dual (이력서.md + 포트폴리오.md), English fallback for global companies |
| 6 | PDF generation | **B**: Markdown only at first, PDF deferred |
| Boards | Korean job boards | 원티드 + 점핏 + 지킹 |

## Architecture

```
nexeder/career-ops/                       ← career-ops 코드 + 데이터
├── cv.md                                 ← from PROFILE.md
├── config/profile.yml                    ← Korean defaults (KRW 만원)
├── modes/_profile.md                     ← user narrative + Korean output rules
├── modes/_shared.md                      ← English (system, untouched)
├── portals.yml                           ← 35 companies + 3 boards
├── data/
│   ├── applications.md                   ← Korean status, 4 historic seed
│   ├── companies/                        ← 35 company context files (copies)
│   │   ├── _slugs.yml                    ← Korean ↔ slug mapping
│   │   ├── delight-room.md
│   │   └── ...
│   └── pipeline.md
├── reports/                              ← Korean evaluation reports
├── output/                               ← generated 이력서/포트폴리오 per company
└── jds/                                  ← saved JDs

/Users/2302-pc04/space/docs/02_Areas/    ← user Obsidian (NEVER touched after seed)
├── Career/                               ← seed source
└── 기업/                                 ← seed source
```

**Principles:**
- career-ops reads/writes only inside its own directory after seed
- `Career/` and `기업/` are read **once** during one-time bootstrap, never again
- No sync command. If user adds new company in Obsidian, they tell career-ops manually (or add directly inside career-ops)
- User data (cv.md, profile.yml, _profile.md, applications.md, reports/) is never overwritten by system updates

## One-Time Seed (`scripts/seed-from-obsidian.mjs`)

Run once. Idempotent: refuses to run if outputs exist (requires `--force` to overwrite).

### Inputs
- `/Users/2302-pc04/space/docs/02_Areas/Career/PROFILE.md`
- `/Users/2302-pc04/space/docs/02_Areas/Career/applications/{딜라이트룸,나라스페이스테크놀로지,naver-webtoon,nextground}/README.md`
- `/Users/2302-pc04/space/docs/02_Areas/기업/*.md` (35 files; exclude `.loom`, `.base`)

### Outputs

| Output | Source | Notes |
|--------|--------|-------|
| `cv.md` | `PROFILE.md` | Strip frontmatter, keep Korean as-is, master CV |
| `config/profile.yml` | `PROFILE.md` frontmatter + 선호조건 section | name/email/location/target roles/comp (KRW 만원)/dealbreakers |
| `modes/_profile.md` | `PROFILE.md` 강점/약점/선호조건 + Korean output rules block | user narrative |
| `portals.yml` | `기업/*.md` frontmatter | 35 companies + 원티드/점핏/지킹 |
| `data/applications.md` | `Career/applications/*/README.md` | 4 historic entries, status inferred |
| `data/companies/{slug}.md` | `기업/{회사}.md` | Verbatim copy, used as evaluation context |
| `data/companies/_slugs.yml` | computed | Korean ↔ slug mapping table |
| `templates/states.yml` | edit existing | Korean canonical statuses |

### Conversion Rules

**1. Company slug (Korean → ASCII):**
- Use a hand-curated mapping table embedded in seed script for the 35 known companies
- Examples: 딜라이트룸 → `delight-room`, 네이버웹툰 → `naver-webtoon`, 나라스페이스테크놀로지 → `naraspace`, 넥스트그라운드 → `nextground`, 큐픽스 → `cupix`, 가우스랩스 → `gauss-labs`
- Rule for unknown future companies: romanization first, fall back to ASCII transliteration; user can override in `_slugs.yml`
- Slug uniqueness enforced; collision = error

**2. Status mapping (`기업/` Korean → career-ops canonical):**

| Korean | Canonical | Action |
|--------|-----------|--------|
| 미지원 | (none) | Skip — not in tracker |
| 평가완료 / 검토중 | 평가완료 | Add to tracker |
| 지원 / 지원완료 | 지원 | Add to tracker |
| 면접 | 면접 | Add to tracker |
| 합격 / 오퍼 | 오퍼 | Add to tracker |
| 불합 / 탈락 | 불합격 | Add to tracker |
| 포기 / 보류 | 보류 | Add to tracker |

**3. `portals.yml` structure:**
```yaml
companies:
  - name: 딜라이트룸
    slug: delight-room
    url: https://team.alar.my/job_posting/fYEkfMEa
    tags: [Golang, Node.js, Python, Kubernetes, PostgreSQL, AWS, GCP]
  # ... 34 more

boards:
  - name: 원티드
    url: https://www.wanted.co.kr/search?query=backend
    type: aggregator
  - name: 점핏
    url: https://jumpit.saramin.co.kr
    type: aggregator
  - name: 지킹
    url: https://zighang.com/recruitment
    type: aggregator

title_filter:
  positive: [Backend, Server, Platform, DevOps, Cloud, Infra, SRE, Kubernetes]
  negative: [Frontend, iOS, Android, Game, Data Scientist, ML Engineer]
```

**4. Tracker seeding:**
- 4 historic applications from `Career/applications/*/README.md`
- Score: parse from README if present, else `-`
- Status: parse from README header (지원일 → 지원, 평가만 → 평가완료)
- Notes: 1-line summary from README first paragraph

**5. Idempotency:**
- Seed script checks if any output file exists. If yes → abort with message
- `--force` flag required to overwrite
- Atomic: writes to `.tmp` files first, then rename in batch

### Pre-flight Preview

Before writing files, script outputs:
```
Will create:
  cv.md (~14KB from PROFILE.md)
  config/profile.yml
  modes/_profile.md
  portals.yml (35 companies + 3 boards)
  data/applications.md (4 historic entries)
  data/companies/ (35 files)
  data/companies/_slugs.yml

Will NOT touch:
  /Users/2302-pc04/space/docs/02_Areas/Career/
  /Users/2302-pc04/space/docs/02_Areas/기업/

Slug mapping (35):
  딜라이트룸 → delight-room
  ...

Continue? [y/N]
```

## Mode Customization (`modes/_profile.md`)

System mode files (`_shared.md`, `oferta.md`, `apply.md`, `scan.md`, etc.) are **not modified** — they stay English so system updates merge cleanly. All Korean adaptation lives in `_profile.md` which is a user file (never overwritten by updates).

### Korean Output Rules Block

```markdown
## 출력 언어 (Korean Market)

- 모든 평가 리포트, 지원서, CV, 트래커 노트는 **한국어**로 작성
- 회사명/직무명은 원문 그대로
- 영문 기술 용어는 그대로 (Kubernetes, OAuth, etc.)
- 예외: JD가 영문이고 글로벌 회사면 영문 리포트 OK (사용자 명시 요청 시)

## 통화/날짜/수치
- 연봉: KRW 만원 단위 (예: 7,500만원)
- USD: 글로벌 회사 한정
- 날짜: YYYY-MM-DD
- 시간대: KST

## 한국 시장 특성
- 신원조회/평판조회: 후기 단계 일반적
- 연봉 협상: 1차 카운터 표준, 베이스 vs 인센티브 분리
- 위치 우선순위: 판교 > 강남 > 서울 기타
- 재택: 사용자 선호 → hybrid/remote는 강한 plus
- 도메인 거부: 광고, 게임

## 평가 톤
- 기술 갭은 솔직하게 인정 (Golang, Java/Spring, MySQL)
- 빠른 학습 이력으로 보완
- 정량 수치 기반 (PROFILE 성과 하이라이트)
```

### User Narrative Block

Lifted from `PROFILE.md` 강점/약점/선호조건/한 줄 소개. Includes the dual-track positioning: backend + infra + AI automation.

## Output Formats

### Evaluation Report (Korean, in `reports/`)

Filename: `{NNN}-{slug}-{YYYY-MM-DD}.md`

Sections:
- Header: 회사, 직무, 평가일, 점수 X.X/5, URL, PDF (❌ for now), 검증 status
- 매칭 table: 기술/도메인/위치/재택/안정성/성장 — each 1-5 with rationale
- 강점 매칭: which PROFILE projects map to which JD requirements
- 갭: honest gaps + mitigation framing
- 추천 액션: 지원/SKIP/보류 with reasoning
- 지원 자료 권장: which 이력서 + 포트폴리오 projects to use
- 회사 컨텍스트: link to `data/companies/{slug}.md`

### Application Materials (Korean dual, in `output/{slug}/`)

- `이력서.md` — 경력기술서 (PROFILE projects filtered by JD relevance)
- `포트폴리오.md` — 4 projects in detail with 배경/담당업무/성과
- Plain markdown, no frontmatter
- English fallback (`resume.md` + `portfolio.md`) for global companies — triggered by `_profile.md` rules

### Tracker (`data/applications.md`)

```markdown
# Applications Tracker

| # | 날짜 | 회사 | 직무 | 점수 | 상태 | PDF | 리포트 | 메모 |
|---|------|------|------|------|------|-----|--------|------|
| 1 | 2026-02-28 | 딜라이트룸 | Backend Engineer | 4.2/5 | 평가완료 | ❌ | [001](reports/001-delight-room-2026-02-28.md) | K8s 매칭 강, Go 갭 |
```

Statuses (canonical): `평가완료`, `지원`, `응답`, `면접`, `오퍼`, `불합격`, `보류`, `SKIP`

`templates/states.yml` updated to Korean canonical list. `normalize-statuses.mjs`, `merge-tracker.mjs`, `dedup-tracker.mjs` continue to work since they read from `states.yml`.

## Setup Flow (User Experience)

```
1. User: "이 프로젝트를 Career/, 기업/ 기반으로 셋업해줘"
2. Claude: runs preview → shows files to be created, slug mapping
3. User: confirms
4. Claude: runs seed-from-obsidian.mjs
5. Claude: validates outputs (cv.md present, profile.yml valid YAML,
   portals.yml has 35 companies, no slug collisions, tracker has 4 entries)
6. Claude: confirms setup complete, lists next actions
```

## Out of Scope

- PDF generation (deferred per Q6 B; revisit when user needs PDF output)
- Sync mechanism between Obsidian and career-ops (explicitly rejected)
- Two-way write to `기업/` files (rejected)
- Translating system mode files to Korean (rejected; use `_profile.md` instead)
- Migrating existing 4 application content into career-ops `output/` directory (only metadata goes into tracker)
- Auto-importing `templates/resume/` essay templates (user can pull these manually when writing applications)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Slug collision for unknown future Korean companies | Hand-curated table for known 35; user override via `_slugs.yml` |
| Status text in `기업/` doesn't match mapping table | Unknown statuses logged with warning; default to `평가완료`; user can fix |
| Frontmatter missing in some `기업/` files | Skip company with warning; user manually adds to portals.yml later |
| `Career/applications/*/README.md` format varies | Best-effort parse; failures logged; user fixes manually after seed |
| Job board scrapers (zighang, etc.) need JS rendering | Use Playwright (already a dependency); first scan run validates selectors |
| User wants to change slug mapping post-seed | Edit `data/companies/_slugs.yml` and rename files manually (one-time pain) |

## Success Criteria

After seed runs:
- [ ] `cv.md` exists and contains Korean PROFILE content
- [ ] `config/profile.yml` parses as valid YAML and has all required fields
- [ ] `modes/_profile.md` exists with Korean output rules + user narrative
- [ ] `portals.yml` has 35 companies + 3 boards, all with valid URLs
- [ ] `data/applications.md` has 4 historic entries with Korean statuses
- [ ] `data/companies/` has 35 .md files matching slugs
- [ ] `data/companies/_slugs.yml` covers all 35 companies
- [ ] `templates/states.yml` has Korean canonical statuses
- [ ] `verify-pipeline.mjs` passes
- [ ] First test evaluation (e.g., "딜라이트룸 평가해줘") produces a Korean report referencing `data/companies/delight-room.md`
