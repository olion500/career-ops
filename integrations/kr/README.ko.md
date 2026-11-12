# 한국 공고 저토큰 연결

기존 포크 이력을 보존하면서 upstream `25800070fcac3bbac6611680a189678ab45f4afc` (package 1.40.0)과 통합한 연결부다. 기존 공개 CV·기업 자료·story bank는 그대로 유지한다. 새 개인정보·인증정보·수집 로그는 이 변경에 포함하지 않는다.

## 작동 방식

- 수집과 AI 분류를 분리한다. 이 코드 자체는 모델을 호출하지 않는다.
- URL 정리, 한국 날짜 기준 마감 계산, 제목 필터, 중복·기지원 공고 제외를 코드로 처리한다.
- 본문·제목·지역·마감 또는 개인화 기준이 바뀐 후보만 다시 검토한다.
- 기본 분류 배치는 최대 20개, 본문 발췌는 1,200자다. 발췌만으로 전체 지원 조건을 판단하지 않는다. 정식 평가 전 `fullTextFile`과 허용된 원문을 확인한다.
- 분류 결과를 저장한 뒤 배치 ID로 ACK한다. ACK 전에는 작업이 사라지지 않는다. 후보가 없으면 AI를 호출하지 않는다.
- `npm run scan`은 upstream scanner다. 한국 증분 경로는 아래 명령으로 별도 실행한다.

## 새 clone에서 준비

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --ignore-scripts
node integrations/kr/configure.mjs
```

`configure.mjs`는 기존 `modes/_custom.md`를 지우지 않고 절차를 추가한다. 한국어 상태 별칭 및 포크 확장 경로 보호도 복구한다. 개인 자료는 Git에 추가하지 않는다. 최초 설정 후에도 시드 도구를 자동 실행하지 않는다.

## 로컬 JSON 가져오기

```bash
# 기본은 미리 보기. 네트워크·모델 호출·데이터 쓰기 없음.
node integrations/kr/import.mjs /path/to/jobs.json --dry-run

# 확인 후 로컬 캐시·pipeline·history에 기록
node integrations/kr/import.mjs /path/to/jobs.json --commit --max-jobs=20

# 분류 배치 전체를 검토하고 결과를 저장한 뒤에만 실행
node integrations/kr/import.mjs --ack=실제_64자리_batchId
```

입력은 `title`, `url`, 선택적인 `company`, `location`, `description` 또는 `snippet`, `deadline`, `collected_at` 등을 가진 JSON 배열이다. `--root=/absolute/data-root`로 데이터 루트를 지정할 수 있다. `scan-boards.mjs`는 같은 로컬 JSON 명령의 호환 진입점이며, 인자 없이는 사용법만 출력한다. 예전 4개 게시판 네트워크 수집기의 호환 실행판은 아니다. 원래 코드는 `legacy-scan-boards.mjs.txt`에 감사용으로 보존했다.

생성 데이터는 데이터 루트의 `data/kr/` 아래에 남는다. `raw/`와 `archive/`에는 전체 입력과 정규화 본문, `batches/`에는 배치, `state.json`에는 캐시·ACK 상태, `ai-input.json`에는 최신 분류 입력을 보존한다. 자동 정리·보존 기간 정책은 구현하지 않았다. 다른 career-ops 필터와 정식 평가는 기존 절차에서 별도 확인한다.

## 기존 로컬 자료

GitHub에 없는 최신 이력서·희망 조건·지원 이력은 아직 반영되지 않았다. 기존 폴더를 덮어쓰지 말고, 수집·평가 프로그램을 멈춘 상태에서 새 폴더로 복사한다.

```bash
# 먼저 복사 목록과 해시 확인. 원본은 변경하지 않음.
node integrations/kr/migrate-user.mjs /path/to/old-career-ops /path/to/NEW-data-root
# 검토 후, 아직 존재하지 않는 새 대상에만 복사
node integrations/kr/migrate-user.mjs /path/to/old-career-ops /path/to/NEW-data-root --commit
```

대상 manifest와 지원 이력을 대조한다. 이 도구는 정해진 user-layer 경로만 복사하므로 별도 커스텀 파일이나 중첩된 인증자료는 직접 검토해야 한다. 루트 `.env`는 복사 대상이 아니다. 심볼릭 링크와 기존 대상은 거부한다. `seed-from-obsidian.mjs --force`를 이관 대신 실행하지 않는다.

## 실제 수집은 비활성

`source.example.json`은 `enabled: false`, 접근 검토 미승인 상태다. 사람인 공식 API와 회사별 Greeting 모듈만 연결되어 있으며, 현재 소스별 접근 검토·계정 조건·허용량·명시적 활성화가 필요하다. robots.txt만으로 이용 허가를 판단하지 않는다. 키는 환경변수로만 넣고 채팅·GitHub·공유 JSON에 넣지 않는다. 원티드·점핏·직행·인디스워크 자동 수집은 이 경로에서 꺼져 있고, 차단을 브라우저나 비공개 API로 우회하지 않는다.

upstream 저장소 운영용 cron 트리거는 이 포크에선 제거했다. 별도 요청 없이 반복 수집·유료 호출·지원 제출을 실행하지 않는다.

## 검증

```bash
node --test integrations/kr/tests/*.test.mjs tests/seed/*.test.mjs tests/tracker-utils.test.mjs
node scripts/check-syntax.mjs
node validate-system-paths-coverage.mjs
```

기존 포크의 `tests/seed/`를 재사용하며 개인 정보가 든 테스트를 새 디렉터리에 복제하지 않는다. 실제 포털 수집, 유료 모델 호출, 웹 UI 전체 동작 및 개인화 평가는 이 검사에 포함되지 않는다.

합성 입력 벤치마크는 `benchmark.mjs`와 `count-tokens.py`로 재현할 수 있다. 앞선 합성 fixture의 원문 대비 입력 감소율은 실제 기존 사용 대비 비용 절감률이 아니다. 기존 수집기 자체도 모델을 호출하지 않았으므로 실제 비용 원인은 사용 로그로 따로 확인해야 한다.
