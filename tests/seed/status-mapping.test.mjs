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
