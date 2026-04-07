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
