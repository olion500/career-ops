# 트릴리온랩스


# 회사

한국어 특화 LLM 파운데이션 모델을 자체 개발하는 AI 스타트업. 2024년 설립, Pre-seed $5.8M 유치. 직원 13~19명.
네이버 하이퍼클로바X 핵심 개발진 출신 신재민 대표가 창업. 오픈소스 파인튜닝이 아닌 from-scratch 방식으로 LLM 구축.

# 제품

## 핵심 제품
- **Trillion-7B**: 한국어 특화 다국어 LLM (약 1.5억원 저비용 학습)
- **Tri-21B**: 수학/코딩/추론 강화 모델 (Llama, Qwen 능가)
- **Tri-70B**: 국내 스타트업 최초 700억 파라미터 모델, 체크포인트 오픈소스 공개
- **rBridge**: 데이터 평가 기법 (비용 100x 절감, 효율 733x 향상)

## 제품 현황
- 글로벌 AI 톱30 진입 (Tri-21B 기준)
- HuggingFace에 모델 공개 (trillionlabs)
- GitHub 활발 (gWorld, tri.oo.ai 등 자체 프로젝트 + ML 커널 포크)
- SaaS 플랫폼 (API, Console) 구축 중

# 평판

## 직원 평가
| 출처 | 평점 | 리뷰수 | 비고 |
|------|------|--------|------|
| 잡플래닛 | - | 0 | 설립 2년, 리뷰 없음 |
| 블라인드 | - | 0 | 리뷰 없음 |
| 원티드 | - | - | 평균연봉 5,852만원 (상위 6~10%) |

## 최근 이슈
- 2024.09 Pre-seed $5.8M 투자 유치 (카카오벤처스, Strong Ventures 등)
- 2025.03 Trillion-7B 공개
- 2025.07 Tri-21B 공개 (글로벌 모델 능가)
- 2025.08 Tri-70B 공개 (국내 스타트업 최초)
- 2025.10 AWS 생성형 AI 액셀러레이터 선정 (한국 LLM 유일)
- 과기부 'AI 특화 파운데이션 모델 사업' 바이오의약 분야 선정

## 기술력
- GitHub: [github.com/trillion-labs](https://github.com/trillion-labs) (Python, CUDA, Go)
- NVIDIA 공식 케이스 스터디 선정
- CoreWeave H100 320GPU 클러스터 운용
- 기술블로그: 없음 (팀 인터뷰 형식 글은 있음)

# 직무

## 팀 소개
Platform Foundation팀은 AI 연구 결과물을 고객이 쉽게 활용할 수 있도록 SaaS 기반을 만드는 팀. API, Console 등 Platform 기반 컴포넌트 개발 및 운영.

## 업무
- SaaS Platform Backend/Frontend 개발 (AI 연구 결과 → 고객 제공)
- Research Platform 개발 (e.g. Automated Reinforcement Learning 컴포넌트)
- 모니터링/배포 시스템 구축 및 운영

## 기술스택
- **Backend:** Go, ConnectRPC
- **Frontend:** TypeScript, React
- **DB:** PostgreSQL
- **Infra:** Kubernetes (우대)

## 자격요건
- Go, TypeScript, Python 중 하나 이상 전문성
- 소프트웨어 제품 개발 전반에 대한 깊은 이해
- 협업 도구 (Slack, Linear) 사용 익숙, 자기 주도적

## 우대사항
- Kubernetes 환경 서비스 운영 경험
- 테스트 코드 작성 익숙
- B2B / SaaS 제품 개발 경험
- 신규 서비스 기획~런칭 경험
- 글로벌 서비스 개발 경험
- AI 활용 서비스 개발 경험
- 오픈소스 기여 경험

## 채용 전형
Application Review → Phone Screening (online) → Technical Interview (onsite) → CEO Interview (onsite)

## 지원
talent@trillionlabs.co / 제목: "Software Engineer, Platform Foundation - [이름]"

# 평가

## 강점
- 기술력 검증됨 (1년 만에 7B→70B 모델 3종 완성)
- 우대사항 대부분 충족 (K8s, 테스트, B2B SaaS, 신규 서비스 런칭)
- 소규모 팀에서 임팩트 큰 역할 가능
- 투자사 라인업 우수 (카카오벤처스, Strong Ventures)

## 약점
- Go 언어 실무 경험 없음 (학습 중)
- 설립 2년 초기 스타트업 (안정성 리스크)
- 잡플래닛/블라인드 리뷰 없음 (문화 파악 불가)
- 매출 미공개 (SaaS 아직 구축 중)

## 매칭

| 항목 | 요구 | 나 | 판정 |
|------|------|-----|------|
| 경력 | 미명시 | 4년 | ✅ |
| 스택 | Go, TS, Python 중 1+ | TS 주력, Python 경험, Go 학습 중 | ✅ |
| K8s | 우대 | 주력 (3년+) | ✅ |
| 테스트 | 우대 | TDD 도입 주도 (0→50%) | ✅ |
| B2B SaaS | 우대 | Cupix B2B 3년 | ✅ |
| 위치 | 강남구 삼성동 | 허용 | ⚠️ |
| 재택 | 미명시 | 선호 | ⚠️ |
| 도메인 | AI SaaS | 허용 (SaaS 선호) | ✅ |

**매칭도**: 높음 - 우대사항 거의 전부 충족. Go 실무 경험만 갭.

## 결론

**추천**: TypeScript/K8s/B2B SaaS/테스트 경험이 우대사항과 정확히 맞음. Go는 학습 중이나 TS/Python 전문성으로 자격요건 충족. AI SaaS 초기 빌딩 단계라 임팩트 클 것.

# 메모

- Go 언어 학습 진행 상황 어필 포인트
- 평균연봉 5,852만원은 AI 스타트업 치고 낮은 편 - 스톡옵션 여부 확인
- SaaS 플랫폼이 아직 구축 단계 → 초기 멤버로서 아키텍처 설계부터 참여 가능
- ConnectRPC (gRPC 기반) 사전 학습 필요
- "한국의 OpenAI" 포지셔닝 - 성장 가능성 높으나 경쟁 치열
