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
