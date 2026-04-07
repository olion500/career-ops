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
