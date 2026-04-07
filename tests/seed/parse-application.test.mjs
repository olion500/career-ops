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
