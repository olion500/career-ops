# 한 줄 소개

Backend Engineer. 스타트업에서 API 설계, 인프라 구축, 개발 문화 개선까지 폭넓게 수행. 새로운 기술을 빠르게 습득하여 프로덕션에 적용하는 데 강점.

---

# 경력 타임라인

| 기간 | 회사 | 직책 | 비고 |
|------|------|------|------|
| 2023.02 - 현재 | Cupix | Backend Developer | B2B 3D 디지털트윈 플랫폼 |
| 2022.06 - 2022.11 | Hwahae (화해) | Full Stack Developer | 뷰티 플랫폼 B2B 서비스. Cupix 이직 |
| 2020 - 2022 | 군 복무 | | |
| 2016.07 - 2018.04 | Rozbelle | Co-Founder & Developer | BLE 안전 귀갓길 스타트업 |
| 2014.03 - 2019.03 | 충북대학교 | | 컴퓨터공학 (소프트웨어) 학사 |

---

# 기술스택

## 주력 (3년+)

- **Language:** Ruby on Rails, Node.js, TypeScript
- **Cloud:** AWS (EC2, S3, Lambda, Cognito, ECS, DynamoDB), GCP (GKE, Cloud Storage)
- **Infra:** Kubernetes, Docker, Terraform, Kustomize
- **인증:** OAuth 2.0, SAML, AWS Cognito

## 경험 (1년+)

- **Language:** Python, FastAPI
- **Database:** PostgreSQL (CRUD 수준), Redis (캐싱/세션), Elasticsearch
- **Frontend:** React (기본)
- **DevOps:** GitHub Actions, Jenkins, CI/CD Pipeline
- **AI:** LLM Agent 구축 (Claude, GPT), MLOps

## 사용 경험

- DynamoDB (Single Table Design + GSI)
- MinIO (S3 호환 오브젝트 스토리지)
- k6 (부하 테스트)
- Laravel, Kotlin (과거)

## 학습 중

- Java, Spring Framework
- Rust, Go
- Kafka

## 경험 없음

- Java/Spring (백엔드 실무)
- .NET, C#
- MySQL (PostgreSQL만 사용)
- JPA/Hibernate/Querydsl

---

# 프로젝트 상세

## Cupix | Backend Developer

**2023.02 - 현재 (3년)** | B2B 3D 디지털트윈 플랫폼
**백엔드팀:** 5-10명
**스택:** Ruby on Rails (API server), Node.js (processing agents)

---

### 프로젝트 1: AI Agent 기반 Root Cause Analysis 시스템

- **기간:** 2025.10 ~ 2025.12 (3개월)
- **인원:** 1명 (본인 단독 기획 + 개발)
- **기술:** Python, LLM (Claude, GPT), 로그 분석, 코드 분석

**배경**
회사 내 이슈 조사 및 해결 프로세스가 비효율적인 것을 발견. 에러 원인이 프론트엔드/백엔드/ML 파이프라인 어디서든 발생 가능하고, 로그가 분산되어 있어 원인 추적에 시간이 많이 소요됨. 장애 대응이 특정 시니어 개발자에게 집중되는 문제.

**담당 업무**
- 직접 요구사항을 정의하고 프로젝트를 기획
- LLM 기반 AI Agent 설계: 로그, 소스코드, 스펙문서를 통합 분석하여 에러 원인 자동 탐지
- 다중 데이터소스 통합 분석 파이프라인 구축
- 프롬프트 엔지니어링, 컨텍스트 관리, hallucination 대응
- 분석 결과를 구조화된 리포트로 출력
- 분석 결과를 기반으로 코드 수정 후 PR 생성

**주요 성과**
- 이슈 조사+해결 시간: 주간 평균 **8.7시간 → 1시간** (약 89% 감소)
- 주니어 개발자도 독립적으로 장애 대응 가능한 환경 구축
- LLM을 프로덕션 운영 환경에 실용적으로 적용한 사례

---

### 프로젝트 2: OAuth 2.0 인증 시스템 구축 및 전체 사용자 마이그레이션

- **기간:** 2023.10 ~ 2023.12 (3개월)
- **인원:** 1명 (본인 단독 — 회사 전체 인증 설계 + 풀스택 개발)
- **기술:** OAuth 2.0, SAML, AWS Cognito, Lambda, React

**배경**
Cupix 자체 인증 시스템이 SSO/SAML을 지원하지 않아 엔터프라이즈 고객 확대에 한계. 수천 명의 기존 사용자를 유지하면서 새로운 인증 체계로 전환해야 하는 상황.

**담당 업무**
- 회사 전체 OAuth 2.0 인증 방식 설계
- AWS Cognito 기반 인증 서버 풀스택 개발 (백엔드 + React 프론트엔드)
- Zero-downtime 점진적 마이그레이션 구현:
  - 1단계: 신규 가입자부터 OAuth 2.0 적용
  - 2단계: 기존 사용자 마이그레이션
  - 3단계: 엔터프라이즈 고객별 SAML IdP 연동 (Okta, Azure AD 등)
  - 4단계: 레거시 인증 코드 제거
- 보안 강화: MFA 도입, 세션 관리
- 인증 아키텍처 문서화

**주요 성과**
- 전체 사용자 **100% 마이그레이션 완료**, 서비스 중단 **0건**
- 엔터프라이즈 고객 SSO 요구사항 충족
- 다양한 인증 방식 통합 지원 (이메일/비밀번호, SAML SSO, 토큰 기반 API 인증)

---

### 프로젝트 3: Saudi Arabia 리전 확장 (MinIO/Kubernetes)

- **기간:** 2024.06 ~ 2024.09 (4개월)
- **인원:** 본인 주도 (요구사항 수집 → 기술 검토 → 도입 → 구축)
- **기술:** GCP (GKE), Kubernetes, MinIO, Terraform, Kustomize

**배경**
Saudi Arabia 고객의 데이터 주권 규정(사우디 내 데이터는 반드시 사우디에 저장) 충족 필요. AWS S3가 사우디 리전을 미지원하여 대체 솔루션 필요.

**담당 업무**
- S3 대체 기술 검토 (GCS, Azure Blob, Ceph, MinIO 등) → MinIO 선정
- MinIO technical support 계약하여 빠른 기술 지원 체계 확보
- 흩어진 S3 SDK 의존성을 통합 Storage Service로 리팩토링 (S3/MinIO 추상화)
  - 관련 코드 전체에 테스트 코드 작성하며 진행
- GKE 클러스터 구축 + MinIO 분산 모드 구성
- Kustomize 기반 배포 구성 (Helm 대신 사내 IaC 정책 준수)
- 모니터링 대시보드 구축
- 팀 내부 세미나 진행 (K8s 기본, MinIO 운영, 모니터링)

**주요 성과**
- 데이터 주권 요구사항 충족하는 독립 리전 구축 완료
- 팀 전체의 Kubernetes/MinIO 역량 향상 → 운영 분담 가능
- 이후 다른 리전 확장의 기반 아키텍처로 활용
- MinIO 공식 문서도 이후 Kustomize 사용을 장려하는 방향으로 변경 (선택 검증)

---

### 프로젝트 4: Developer Experience 개선

- **기간:** 2024.01 ~ 현재 (2년+ 지속)
- **인원:** 본인 주도, 팀 전체 참여
- **기술:** Docker Compose, RBS (Ruby 3.0), RSpec, 사내 문서

**배경**
입사 시 겪은 어려움: 문서화되지 않은 설정, 복잡한 로컬 환경 구축, 흩어진 정보. 테스트 문화 부재. 동적 타입 시스템(Ruby)의 IDE 자동완성 미작동.

**담당 업무**
- Docker Compose 기반 로컬 개발 환경 표준화
- 온보딩 문서 작성 + 트러블슈팅 가이드
- Ruby 3.0 RBS 타입 시스템 팀 제안 및 도입 (점진적 핵심 모듈부터)
- RSpec 기반 TDD 문화 도입 및 전파
- 팀 내 기술 세미나 도입 (Kubernetes, 모니터링, IaC 등)
- Monorepo 전환: 분산된 복수 저장소를 단일 monorepo로 통합 마이그레이션 (2025.06 ~ 2025.12)

**주요 성과**
- 신규 입사자 온보딩 시간 **2주 → 1일** 단축
- Test Coverage **0% → 50%** 달성
- 코드 안정성 향상, 배포 자신감 확보
- Monorepo 전환: 총 배포 시간 **3h 10m → 1h 31m (52% 단축)**, ~29,000줄 (40%) 중복 코드 제거

---

### 프로젝트 5: Data Labeling 백오피스 툴 개발

- **기간:** 2023.03 ~ 2023.06 (4개월)
- **인원:** 본인 (백엔드) + ML 팀 협업 + 운영팀 협업
- **기술:** Ruby on Rails, DynamoDB, AWS Lambda, SES

**배경**
3D 디지털트윈 플랫폼의 자동화 프로세싱 핵심인 Data Labeling 작업을 위한 백오피스 툴. 작업자와 개발팀 사이에 직접 소통 채널이 없어 개선 요청이 전달되지 않는 문제.

**담당 업무**
- Data Labeling 백오피스 백엔드 개발
- 작업자 직접 소통 채널 구축 (Slack + 피드백 폼)
- DynamoDB 기반 Serverless 알림 서비스 구축:
  - 데이터 잘못 유입 시 작업자에게 메일/알림 자동 발송
  - **Single Table Design + GSI 패턴** 적용
  - 복합 정렬 키(Composite Sort Key)로 시간순 정렬
  - 희소 인덱스(Sparse Index)로 비용 최적화
- 여러 팀 간 조율 (ML 팀 모델 변경, 프론트 UI 개선, 운영팀 프로세스 조정)

**주요 성과**
- 수작업 프로세스 자동화
- 작업자 피드백 → 빠른 개선 사이클 확립
- 크로스팀 협업 체계 구축

---

### 프로젝트 6: MLOps 최적화

- **기간:** 2024.03 ~ 2024.06 (4개월)
- **인원:** 2명 (ML 담당자 1명 + 본인: delivery 및 성능 최적화)
- **기술:** Python, ML Pipeline

**담당 업무**
- ML 파이프라인의 Data Labeling workflow 개선
- 모델 delivery 프로세스 최적화
- 성능 개선

---

### 프로젝트 7: Elasticsearch Zero-Downtime Reindex

- **기간:** Cupix 재직 중 (정확한 시기 미상)
- **인원:** 본인
- **기술:** Elasticsearch, Alias 전략

**배경**
회사에서 DB 모델을 Elasticsearch에 넣어 검색 서비스를 운영. 매핑 변경 시 인덱스 재생성이 필요하나 서비스 중단 불가.

**담당 업무**
- Alias 기반 Zero-Downtime Reindex 구현:
  - 1단계: 기존 인덱스 문서 수 확인
  - 2단계: 업데이트된 매핑으로 새 인덱스 생성
  - 3단계: `_reindex` API로 데이터 이전 (slices=auto)
  - 4단계: 문서 수 일치 검증
  - 5단계: 원자적 alias 재할당 → 기존 인덱스 삭제

**주요 성과**
- 매핑 변경 시 서비스 중단 없이 인덱스 업데이트 가능

---

## Hwahae (화해) | Full Stack Developer

**2022.06 - 2022.11 (6개월)** | 뷰티 플랫폼 B2B 서비스
**팀:** 5-10명
**퇴사 사유:** Cupix로 이직 (더 좋은 기회)

---

### 프로젝트 8: API Gateway 개발 (전사 MSA 전환)

- **기간:** 2022.06 ~ 2022.11 (6개월)
- **인원:** 팀 내 담당
- **기술:** Node.js, TypeScript, OAuth 2.0, Redis, k6

**배경**
화해 B2B 서비스의 전사 MSA 전환. 모놀리식 → 마이크로서비스 분리 시 통합 진입점 필요.

**담당 업무**
- API Gateway 설계 및 구현: 라우팅, 인증 (OAuth 2.0), 캐싱, 스로틀링
- Redis 기반 Request Cache로 반복 요청 응답 속도 개선
- Rate Limiting / Throttling으로 백엔드 서비스 보호
- k6 기반 Stress Test, Spike Test 환경 구축
- SLA 기준 수립 (응답 시간, 처리량)

**주요 성과**
- Test Coverage **100%** 달성
- Stress Test로 병목 구간 사전 식별 및 해결
- 트래픽 대응력 검증 환경 확보

---

## Rozbelle | Co-Founder & Developer

**2016.07 - 2018.04 (1년 10개월)** | BLE 기반 안전 귀갓길 솔루션 스타트업
**인원:** 공동창업자 3명 (본인: 소프트웨어 개발 전담, 나머지: 하드웨어, 비즈니스)

---

### 프로젝트 9: 안전 귀갓길 솔루션 (BLE 디바이스 + 앱 + 서버)

- **기간:** 2016.07 ~ 2018.04
- **인원:** 3명 (본인: SW 전담)
- **기술:** Kotlin, Firebase, Laravel, BLE 4.0

**담당 업무**
- 제품 기획 → 개발 → 마케팅 → 펀딩 전 과정 주도
- BLE 4.0 broadcasting device 연동 개발
- Android 앱 개발 (Kotlin, Firebase)
- 서버 구축 (Laravel)
- 와디즈 크라우드펀딩 캠페인 운영

**주요 성과**
- 와디즈 크라우드펀딩 **6,000명+ 참여**, 목표 금액 달성
- Android 앱 출시
- 제품 개발 → 마케팅 → 펀딩 전 과정 경험

---

# 사이드 프로젝트

### Backtest DSS — 주식 매매 전략 백테스팅 & 의사결정 지원 시스템

- **기술:** Python, Streamlit, NumPy/Pandas, Docker
- **내용:**
  - 주간 RSI 기반 모드 전환(보수/공격) 매매 전략 백테스트 엔진 설계 및 구현
  - Yahoo Finance API 연동으로 실시간 종목 데이터 수집 및 시뮬레이션 자동화
  - Streamlit 대시보드로 수익률 곡선, 거래 이력, 전략 비교 시각화
  - 백테스트 결과를 실제 투자에 적용하여 전략 유효성 검증

---

# 성과 하이라이트

| 성과 | 수치 | 프로젝트 |
|------|------|----------|
| 이슈 조사/해결 시간 | 주간 8.7시간 → 1시간 (89% 감소) | AI RCA |
| OAuth 마이그레이션 | 전체 사용자 100%, 서비스 중단 0건 | OAuth |
| 온보딩 시간 단축 | 2주 → 1일 | DevEX |
| Test Coverage | 0% → 50% (Cupix), 100% (화해) | DevEX, API GW |
| 크라우드펀딩 | 6,000명+ 참여 | Rozbelle |
| Monorepo 전환 | 배포 시간 52% 단축, 중복 코드 40% 제거 | DevEX |
| ES Reindex | Zero-downtime 달성 | ES Reindex |

---

# 강점

- **빠른 기술 습득**: Rails(입사 2주 내 습득), K8s/MinIO(팀 최초 도입 주도), Terraform(1일 학습 후 실무 적용)
- **인증/보안 시스템**: OAuth 2.0, SAML, Cognito, 무중단 마이그레이션
- **DevOps/인프라**: AWS, GCP, K8s, Terraform, IaC
- **AI Agent 활용**: LLM 기반 자동화 시스템 기획부터 구축까지
- **개발 문화 개선**: TDD 도입, 온보딩 프로세스, 팀 세미나
- **창업 경험**: 제품 기획 → 개발 → 마케팅 → 펀딩 전 과정

---

# 약점

- **프론트엔드**: React 기본 수준 (인증 UI 개발 경험은 있으나 전문 아님)
- **Spring/JVM**: 백엔드 실무 경험 없음
- **RDBMS 최적화**: PostgreSQL CRUD 수준, 쿼리 최적화/인덱스 튜닝 경험 부족
- **MySQL**: 사용 경험 없음 (PostgreSQL만)
- **ML/AI 모델**: 모델 학습 경험 없음 (MLOps, AI Agent 활용은 경험)

---

# 선호 조건

| 항목 | 선호 | 허용 | 거부 |
|------|------|------|------|
| 위치 | 판교, 강남 | 서울 전역 | 지방 |
| 재택 | 재택 선호 | - | - |
| 도메인 | SaaS, 인프라, DevOps | 커머스, 핀테크 | 광고, 게임 |
| 규모 | 50-200명 | 스타트업~중견 | - |
| 경력요구 | 3-5년 | 2-7년 | 시니어(10년+) |

---

# 활용 가이드

이 문서는 **마스터 프로필**입니다. 회사별 지원서 작성 시:

1. 해당 회사 JD의 요구사항을 확인
2. 이 문서에서 매칭되는 프로젝트를 선별
3. 프로젝트별 담당 업무/성과에서 관련 내용 추출
4. 회사 맥락에 맞춰 Summary와 Skills 섹션 재구성
5. 약점 섹션에서 갭을 확인하고 대응 전략 수립

**프로젝트 선별 기준:**
- 지원 직무 관련도 높은 프로젝트 우선
- 성과가 정량적으로 명확한 프로젝트 우선
- 최신 프로젝트 우선 (단, 관련도가 우선)

---

_Last updated: 2026-01-31_
