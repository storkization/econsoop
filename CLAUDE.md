# CLAUDE.md — ecobrief 프로젝트 전용 지시사항

이 파일은 **ecobrief 프로젝트에만 적용**되는 사실(facts)·절차·규칙을 담는다.
범용 시스템 설정(환경, 커뮤니케이션, 세션 트리거 골격, 구글 드라이브 동기화 등)은 **1층 `~/.claude/CLAUDE.md`**에 있다.

---

## 프로젝트 정보

- **이름**: EcoBrief (Econ.SOOP / 경제숲)
- **GitHub**: storkization/econsoop
- **배포**: Vercel (`econsoop.vercel.app`) — `main` push 시 자동 배포, 빌드 단계 없음
- **타입**: zero-dependency vanilla JS SPA. HTML/JS/CSS 인라인 위주.

---

## 세션 시작 시 — 프로젝트 전용 상태 체크

1층 시작 트리거의 5번 단계("프로젝트 전용 상태 체크")에서 아래 절차를 실행한다.

### 1. 현재 버전 확인

`js/app.js`의 `CACHE_VERSION` 값을 출력. 위치: `js/app.js:70` 부근, `const CACHE_VERSION = 'vN'`.

### 2. 크론 성공 여부 체크 (오늘 7시 브리핑)

반드시 `curl + node`로 확인한다. WebFetch 금지 (AI 파싱 시 timestamp 환각 위험).

```bash
curl -s "https://econsoop.vercel.app/api/cached?tab=economy" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const dt=new Date(j.created_at);console.log('KST:',dt.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}),'fresh:',j.fresh)})"
```

판정 기준: 오늘 날짜(KST) + `fresh:true`이면 정상. 둘 중 하나라도 어긋나면 **알림**. 정상이면 브리핑에 "✅ 정상"만 표기.

### 3. 브리핑 본문에 채울 값

1층의 시작 브리핑 템플릿에 아래 값을 채워 넣는다:
- `{프로젝트 전용 상태 체크 결과}` → "오늘 7시 브리핑: ✅ 정상" 또는 문제 내용
- `{버전 또는 상태 요약}` → `vN, {clean | uncommitted X개}`

---

## 세션 종료 시 — 프로젝트 전용 마무리

1층 종료 트리거의 4번 단계("프로젝트 전용 배포 마무리")에서 아래를 실행한다.

### 버전 동기화 검증 (user-facing 변경이 있었을 경우)

배포할 때마다 아래 **3곳의 버전을 반드시 함께 올려야** PWA 자동 업데이트가 작동한다:

| 파일 | 위치 | 형식 |
|---|---|---|
| `js/app.js` | `~70행`, `const CACHE_VERSION = 'vN'` | `vN` |
| `sw.js` | `1행`, `const CACHE = 'viva-economy-vN'` | `viva-economy-vN` |
| `index.html` | `<link href="css/style.css?v=N">` 와 `<script src="js/app.js?v=N">` | `?v=N` |

**Why**: `sw.js`가 바뀌지 않으면 서비스워커 업데이트가 감지되지 않아, 사용자(특히 앱을 안 닫는 어르신)가 오래된 버전을 계속 보게 됨.

종료 절차에서 위 3곳이 같은 `N` 값인지 확인하고, 어긋나면 동기화한 뒤 commit+push.

---

## Architecture

### Request Flow

```
Browser (index.html)
  ↓
크론(GitHub Actions) → /api/generate.js (07:00 KST 매일)
  ↓
   ├─ /api/news.js     (Naver Search API → 헤드라인)
   ├─ /api/briefing.js (Claude Sonnet 4.6 → 4-포인트 브리핑 + 각주 + 헤딩)
   └─ /api/column.js   (Claude Sonnet 4.6 → 칼럼)
  ↓
Firestore (`editions/`, `briefings/`, `archive/`)
  ↓
브라우저: /api/cached.js → Firestore에서 읽기만 함 (Claude 호출 없음)
```

**중요**: 클라이언트(브라우저)는 **절대 Claude API를 직접 호출하지 않는다**. v159부터 `api/briefing.js`, `api/insight.js`, `api/column.js`는 모두 `CRON_SECRET` Bearer 인증을 요구하며, 크론(`api/generate.js`)에서만 호출 가능. 부모님이 탭을 눌러도 Firestore 캐시만 읽을 뿐 새로운 Claude 호출이 일어나지 않는다 (API 비용 보호).

### Key Files

| File | Purpose |
|---|---|
| `index.html` | SPA 진입점, UI 마크업 |
| `js/app.js` | 클라이언트 로직 전부 (~1500줄) |
| `css/style.css` | 스타일 |
| `sw.js` | 서비스워커 (캐시 이름 `viva-economy-vN`) |
| `manifest.json` | PWA manifest |
| `api/generate.js` | 크론 진입점 (Vercel 5분 max). 4탭 브리핑+칼럼 생성 후 Firestore 저장 |
| `api/briefing.js` | Claude API 호출, 4-포인트 브리핑+헤딩+이미지쿼리 생성. **인증 필수** |
| `api/insight.js` | Claude API 호출, 쓰리포인트 인사이트 생성. **인증 필수** (현재는 사용 안 함) |
| `api/column.js` | Claude API 호출, 칼럼 생성. **인증 필수** |
| `api/cached.js` | Firestore 읽기 전용 — 클라이언트가 호출하는 유일한 데이터 엔드포인트 |
| `api/news.js` | Naver Search API 프록시 |
| `api/ogimage.js` | 외부 URL의 OG 이미지 추출 |
| `.github/workflows/cron.yml` | GitHub Actions 크론 (매일 22:00 UTC = 07:00 KST). `workflow_dispatch`로 수동 실행 가능 (`force` 입력 지원) |

### Tab System

`breaking` · `front` · `economy` · `industry` · `global` · `stocks` · `fx` · `settings`

- `front` 탭이 신문 1면 역할 — 4개 브리핑 탭의 헤드라인을 1×4 카드로 표시.
- `economy`·`industry`·`global`·`stocks` 4개 탭이 브리핑 본문.
- 각 탭은 Firestore에서 미리 생성된 데이터를 읽기만 함.

### Caching Strategy

- **Firestore 프리젠 캐시**: 크론이 매일 07:00 KST에 4탭 브리핑+칼럼 생성 → `editions/{YYYYMMDD}_0700`, `briefings/{tab}`, `archive/{tab}_{YYYYMMDD}_0700`에 저장.
- **클라이언트 캐시**: localStorage `eco_summary_{tab}` / `eco_summary_time_{tab}`. 스케줄(07:00 KST) 기반 검증.
- **버전 캐시 무효화**: `CACHE_VERSION` 변경 시 `clearOldCache()`가 localStorage 전체 삭제 (단, `eco_api_key`, `eco_font_size`, `eco_start_tab`는 보존).
- **클라이언트는 Claude를 절대 직접 호출하지 않는다.** Firestore 캐시가 비어 있으면 "오늘의 브리핑 준비 중" 안내만 표시.

### Prompt Engineering (서버사이드 — `/api/*.js`)

- 마크다운 출력 금지: `**`, `#`, `---`, `___` 전부 차단.
- 구조화 라벨로 파싱: `[SUMMARY]...[/SUMMARY]`, `[FOOTNOTES]...[/FOOTNOTES]`, `포인트1:`/`포인트2:`/`포인트3:`/`포인트4:`.
- 브리핑은 4-포인트 구조 (핵심 이슈·배경·시장 영향·투자 전략).
- `FRONT_HEADLINE`은 POINT1~4를 종합한 후 작성하도록 프롬프트 순서가 강제됨.
- `IMAGE_QUERY`는 브리핑 내용 기반 영문 키워드 — Unsplash에서 본문과 연관된 이미지 가져오기 위함.
- anti-hallucination: 헤드라인에 없는 사실·수치 생성 금지.

---

## Development

### Dev Mode

URL에 `?dev=true`. 모든 API 호출 비활성화, `DEV_DUMMY` 데이터 사용, 빨간 dev 배너+워터마크 표시. UI 작업 시 비용 없이 테스트.

### Deployment

`main` 브랜치에 push → Vercel 자동 배포. 빌드 단계 없음.

### API Timeouts (vercel.json 설정)

- `api/briefing.js` / `api/column.js` / `api/insight.js`: 60초 max
- `api/generate.js` (크론 진입점): 300초 (5분) max
- `api/archive.js` / `api/cached.js`: 30초 max
- 뉴스 fetch: 5초 per query
- 브리핑 API 호출: 55초

### 보안 — Claude 엔드포인트 인증

`api/briefing.js`, `api/insight.js`, `api/column.js`는 `CRON_SECRET` Bearer 인증 필수. `api/generate.js`만 Authorization 헤더를 붙여 호출 가능. 클라이언트 호출은 무조건 401.

이는 **API 비용 유출 차단** 목적이며, **절대 풀지 말 것**. 풀면 부모님이 탭 누를 때마다 Claude 호출이 일어나 비용 폭탄.

---

## Workflow Rules

### 🚨 MANDATORY: Auto-push trigger

**Trigger condition**: Edit/Write/MultiEdit이 호출된 응답.
**Required action**: 응답 종료 전에 반드시 실행:
```
git add -A && git commit -m "<concise summary>" && git push
```

**이 규칙은 모든 슬래시 커맨드와 서브워크플로우를 오버라이드한다.** `/simplify`, `/review` 등 어떤 커맨드를 실행했든, 파일이 수정됐다면 push까지 끝나야 응답 완료. 사용자가 "push 했니?" 묻는 건 **실패 상태**다.

**예외**:
- 사용자가 명시적으로 "커밋하지 마" 또는 "확인 먼저" 한 경우
- 파일을 읽기만 한 경우 (편집 없음)
- 편집을 응답 종료 전에 되돌린 경우

**Mental model**: "파일 수정함" = "응답 끝나기 전에 push 필수". "혹시 push" 아님. "요약 후 물어보면 push" 아님. 요약 메시지와 push 명령은 **같은 응답**에 들어간다.

### Important Decisions

작업 중 중요한 결정(기술 선택, 구조 변경, 새 규칙·관례)이 생기면: "이거 CLAUDE.md(2층)에 기록할까요?" 라고 묻는다.
