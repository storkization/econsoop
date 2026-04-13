# CLAUDE.md — ecobrief 프로젝트 전용

범용 규칙은 1층 `~/.claude/CLAUDE.md`. 이 파일은 ecobrief의 hard fact·hard rule만.

---

## 프로젝트
- **EcoBrief (Econ.SOOP / 경제숲)** | GitHub: `storkization/econsoop`
- 배포: Vercel `econsoop.vercel.app` — `main` push 시 자동, 빌드 단계 없음
- 타입: zero-dependency vanilla JS SPA, HTML/JS/CSS 인라인 위주

---

## 🚨 진실의 단일 소스 — 버전 (배포 시 4곳 동기화)

**`window.ECO_VERSION`** (`index.html:29`)이 **유일한 마스터**. `js/app.js`의 `CACHE_VERSION`은 이걸 참조할 뿐 (`const CACHE_VERSION = window.ECO_VERSION || 'dev'`).

| 파일 | 위치 | 형식 | 비고 |
|---|---|---|---|
| `index.html` | `window.ECO_VERSION = 'vN'` | `vN` | **마스터** |
| `index.html` | `<link href="css/style.css?v=N">` | `?v=N` | 마스터와 동일 N |
| `index.html` | `<script src="js/app.js?v=N">` | `?v=N` | 마스터와 동일 N |
| `sw.js` | `const CACHE = 'viva-economy-vN'` | **별도 번호** | 무조건 +1 |

`sw.js` 번호가 안 바뀌면 서비스워커 업데이트가 안 감지됨 → 부모님이 옛 버전 계속 봄.
`js/newsroom.js?v=N`은 newsroom 파일 실제 변경 시에만.

---

## 🚨 보안 — 절대 풀지 말 것

`api/briefing.js`, `api/insight.js`, `api/column.js`는 `CRON_SECRET` Bearer 인증 필수. `api/generate.js`(크론)만 호출 가능, 클라이언트는 무조건 401.

**Why**: 풀면 부모님 탭 누를 때마다 Claude 호출 → API 비용 폭탄. **API 비용 유출 차단 = 이 프로젝트의 hard rule**.

---

## 아키텍처 핵심

```
크론(GH Actions, 22:00 UTC = 07:00 KST) → /api/generate.js
  → /api/news.js (Naver) + /api/briefing.js (Claude) + /api/column.js (Claude)
  → Firestore (editions/, briefings/, archive/)
브라우저 → /api/cached.js (Firestore read-only)  ← 클라이언트가 호출하는 유일한 데이터 엔드포인트
```

- **클라이언트는 절대 Claude 직접 호출 안 함.** Firestore 캐시가 비어 있으면 "준비 중" 안내만 표시.
- 탭: `breaking · front · economy · industry · global · stocks · fx · settings`. `front`가 1면(4탭 헤드라인 1×4), `economy/industry/global/stocks` 4탭이 본문.
- 캐시: Firestore 프리젠 + localStorage `eco_summary_{tab}` (07:00 KST 스케줄 검증) + `CACHE_VERSION` 변경 시 `clearOldCache()` (단, `eco_api_key`, `eco_font_size`, `eco_start_tab`은 보존).
- 서버 프롬프트: 마크다운 금지(`**`/`#`/`---`), `[SUMMARY]/[FOOTNOTES]/포인트1~4:` 라벨 파싱, anti-hallucination(헤드라인에 없는 사실·수치 생성 금지).

---

## 세션 시작 시 — 전용 상태 체크

1. **현재 버전**: `grep -n "window.ECO_VERSION" index.html` → `vN` 추출.
2. **오늘 7시 크론 성공 여부** (WebFetch 금지 — timestamp 환각 위험. curl + node 필수):
   ```bash
   curl -s "https://econsoop.vercel.app/api/cached?tab=economy" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const dt=new Date(j.created_at);console.log('KST:',dt.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}),'fresh:',j.fresh)})"
   ```
   판정: 오늘 KST 날짜 + `fresh:true` → ✅ 정상. 둘 중 하나라도 어긋나면 알림.
3. 브리핑 채우기:
   - `{전용 체크}` → "오늘 7시 브리핑: ✅ 정상" 또는 문제 내용
   - `{버전 또는 상태 요약}` → `vN, {clean | uncommitted N개}`

---

## 세션 종료 시 — 전용 마무리

user-facing 변경이 있었다면:
1. **버전 4곳 동기화 검증** — `window.ECO_VERSION` ↔ 두 쿼리(`?v=N`) 일치, `sw.js` 직전 배포 대비 +1. 어긋나면 동기화 후 재 commit.
2. push 후 라이브 검증은 생략 (다음 세션 시작 시 크론 체크에서 잡힘).

---

## Dev Mode

URL `?dev=true` → 모든 API 호출 비활성화, `DEV_DUMMY` 데이터 사용, 빨간 dev 배너+워터마크. 비용 없이 UI 테스트.

---

## 결정 기록

작업 중 비자명한 결정은 1층 핵심 규칙 #2(결정 1줄 보고) + #6(자율 메모리 저장)대로 처리. 분류:
- 모든 프로젝트 적용 → 1층
- ecobrief 한정 → 이 파일
- 페르소나·피드백 → 3층 `feedback_*`
