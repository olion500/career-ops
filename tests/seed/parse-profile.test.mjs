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
