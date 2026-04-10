/* ═══════════ DEV MODE ═══════════ */
const DEV_MODE = new URLSearchParams(window.location.search).get('dev') === 'true';


const SUMMARY_QUERIES = {
  economy: ['한국은행 금리', '원달러 환율 외환', '코스피 증시 금융시장', '물가 인플레이션 소비', '수출 무역 경상수지', '가계부채 대출', '경제 오늘 주요뉴스'],
  industry:['반도체 전자', '자동차 배터리 전기차', '바이오 헬스 제약', '건설 부동산', '경영 재계 M&A'],
  global:  ['미국 연준 Fed 관세 무역', '중국 경제 위안화 무역분쟁', '일본 엔화 닛케이 일본은행', '유럽 ECB 유로존 독일', '국제유가 OPEC 중동 에너지', '국제경제 오늘 주요뉴스'],
  stocks:  ['삼성전자 SK하이닉스 주가 전망', '코스피 코스닥 증시 오늘', '미국주식 나스닥 S&P500', '증권사 투자 리포트 목표주가', '공모주 IPO 상장', '외국인 기관 수급 매수매도'],
};

const INDICES = [
  { sym:'^KS11',  name:'KOSPI',   tag:'kr' },
  { sym:'^KQ11',  name:'KOSDAQ',  tag:'kr' },
  { sym:'^IXIC',  name:'NASDAQ',  tag:'us' },
  { sym:'^GSPC',  name:'S&P 500', tag:'us' },
];

const STOCKS = [
  { sym:'005930.KS', name:'삼성전자',  icon:'💾', tag:'kr' },
  { sym:'000660.KS', name:'SK하이닉스',icon:'🔬', tag:'kr' },
  { sym:'005380.KS', name:'현대차',    icon:'🚗', tag:'kr' },
  { sym:'035420.KS', name:'NAVER',     icon:'🔍', tag:'kr' },
  { sym:'NVDA',      name:'NVIDIA',    icon:'🖥', tag:'us' },
  { sym:'AAPL',      name:'Apple',     icon:'🍎', tag:'us' },
  { sym:'MSFT',      name:'Microsoft', icon:'🪟', tag:'us' },
  { sym:'TSLA',      name:'Tesla',     icon:'⚡', tag:'us' },
];

const FX_LIST = [
  { base:'EUR', flag:'🇪🇺', label:'EUR/KRW' },
  { base:'JPY', flag:'🇯🇵', label:'JPY/KRW', per100:true },
  { base:'CNY', flag:'🇨🇳', label:'CNY/KRW' },
  { base:'GBP', flag:'🇬🇧', label:'GBP/KRW' },
];

const TAB_LABEL = { economy:'경제', industry:'산업', global:'국제', stocks:'증권' };

const TAB_COLORS = {
  economy:  { main:'#A51C30', bg1:'#FEF8F9', bg2:'#FFFCFD', shadow:'rgba(165,28,48,0.04)' },
  industry: { main:'#1D4ED8', bg1:'#F8FBFF', bg2:'#FCFEFF', shadow:'rgba(29,78,216,0.04)' },
  global:   { main:'#B45309', bg1:'#FFFDF8', bg2:'#FFFEFC', shadow:'rgba(180,83,9,0.04)'  },
  stocks:   { main:'#047857', bg1:'#F5FCF9', bg2:'#FAFFFD', shadow:'rgba(4,120,87,0.04)'  },
};

const TAB_ORDER = ['economy','industry','global','stocks'];
const POINT_LABELS = ['핵심 이슈','배경','시장 영향','투자 전략'];
const POINT_REGEXES = [
  /포인트1:\s*(.+?)(?=\s*포인트2:|$)/s,
  /포인트2:\s*(.+?)(?=\s*포인트3:|$)/s,
  /포인트3:\s*(.+?)(?=\s*포인트4:|$)/s,
  /포인트4:\s*(.+?)$/s,
];
function parseSummary(summary) {
  if (!summary) return [];
  const s = summary.replace(/\[\/?(SUMMARY|BRIEFING)\]/g,'').trim();
  return POINT_REGEXES.map((re, i) => {
    const m = s.match(re);
    return m ? { label: POINT_LABELS[i], text: m[1].trim().replace(/\*\*/g,'') } : null;
  }).filter(Boolean);
}
function formatDateKor(dateStr) {
  if (!dateStr) return '';
  return `${parseInt(dateStr.slice(0,4))}년 ${parseInt(dateStr.slice(4,6))}월 ${parseInt(dateStr.slice(6,8))}일`;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'app-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('app-toast-out'), 2700);
  setTimeout(() => t.remove(), 3000);
}

/* ═══════════ CACHE VERSION ═══════════ */
const CACHE_VERSION = 'v151';
(function clearOldCache() {
  const savedVersion = localStorage.getItem('eco_cache_version');
  if (savedVersion !== CACHE_VERSION) {
    const apiKey = localStorage.getItem('eco_api_key');
    const fontSize = localStorage.getItem('eco_font_size');
    const startTab = localStorage.getItem('eco_start_tab');
    localStorage.clear();
    if (apiKey) localStorage.setItem('eco_api_key', apiKey);
    if (fontSize) localStorage.setItem('eco_font_size', fontSize);
    if (startTab) localStorage.setItem('eco_start_tab', startTab);
    localStorage.setItem('eco_cache_version', CACHE_VERSION);
  }
})();

/* ═══════════ STATE ═══════════ */
let newsCache = {};       // key: "economy-policy" 등
let summaryCache = {};    // key: "economy" | "industry" | "global"
let marketCache = null;   // 홈 마켓 데이터 캐시
let marketCacheTime = 0;
let stocksCache = null;   // 증권 탭 데이터 캐시
let stocksCacheTime = 0;
const MARKET_TTL = 30 * 60 * 1000; // 30분
let currentTab = 'front';
let fxRates = null;

/* ═══════════ INIT ═══════════ */
document.addEventListener('DOMContentLoaded', () => {
  // 개발모드 배너
  if (DEV_MODE) {
    // ① 상단 고정 배너
    const banner = document.createElement('div');
    banner.style.cssText = `
      position:fixed;top:0;left:0;right:0;z-index:9999;
      background:#DC2626;color:#fff;text-align:center;
      font-size:11px;font-weight:700;padding:5px 8px;
      font-family:monospace;max-width:480px;margin:0 auto;
      letter-spacing:0.5px;
    `;
    banner.innerHTML = '🚧 DEV MODE &nbsp;|&nbsp; ⚠️ 더미 데이터 &nbsp;|&nbsp; AI 호출 없음';
    document.body.appendChild(banner);

    // ② 배경 워터마크 (대각선 반복 텍스트)
    const wm = document.createElement('div');
    wm.style.cssText = `
      position:fixed;inset:0;z-index:0;pointer-events:none;
      display:flex;align-items:center;justify-content:center;
      overflow:hidden;
    `;
    wm.innerHTML = `<div style="
      transform:rotate(-30deg);
      font-size:28px;font-weight:900;
      color:rgba(220,38,38,0.055);
      font-family:monospace;letter-spacing:2px;
      white-space:nowrap;line-height:3.2;
      width:200%;text-align:center;
      word-spacing:40px;
    ">${Array(60).fill('DEV MODE · DUMMY DATA').join('  ')}</div>`;
    document.body.appendChild(wm);

    // ③ 떠다니는 태그 카드들
    const tags = [
      { text: '🧪 개발 화면', sub: '최종 배포 시 제외' },
      { text: '📊 더미 데이터', sub: '실데이터 아님' },
      { text: '🎨 UI/UX 확인용', sub: '레이아웃 테스트 중' },
      { text: '⚙️ DATA CHECK', sub: '테스트 전용' },
    ];
    const positions = [
      { bottom:'120px', right:'12px' },
      { bottom:'220px', left:'12px' },
      { bottom:'340px', right:'12px' },
      { top:'80px',    left:'12px'  },
    ];
    tags.forEach((tag, i) => {
      const el = document.createElement('div');
      const pos = positions[i];
      const posStr = Object.entries(pos).map(([k,v])=>`${k}:${v}`).join(';');
      el.style.cssText = `
        position:fixed;${posStr};z-index:9990;
        background:rgba(220,38,38,0.88);color:#fff;
        border-radius:8px;padding:6px 10px;
        font-family:monospace;font-size:10px;font-weight:700;
        line-height:1.5;letter-spacing:0.3px;
        box-shadow:0 2px 8px rgba(0,0,0,0.2);
        pointer-events:none;
      `;
      el.innerHTML = `${tag.text}<br><span style="font-weight:400;opacity:0.85;">${tag.sub}</span>`;
      document.body.appendChild(el);
    });
  }
  const d = new Date();
  const days = ['일','월','화','수','목','금','토'];
  const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('headerDate').innerHTML =
    `<span style="color:#C9963B;font-weight:700;font-size:11px;">${days[d.getDay()]}요일</span> · <span style="font-size:11px;">${months[d.getMonth()]} ${d.getDate()}일, ${d.getFullYear()}</span>`;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 앱 시작 = 저장된 시작 탭 로드
  const startTab = localStorage.getItem('eco_start_tab') || 'front';
  switchTab(startTab);

  // 설정 초기화
  initSettings();
  // 헤더 축소 — 스크롤 내리면 header-sub 숨김
  const contentEl = document.querySelector('.content');
  const headerEl  = document.querySelector('.header');
  if (contentEl && headerEl) {
    contentEl.addEventListener('scroll', () => {
      headerEl.classList.toggle('shrunk', contentEl.scrollTop > 30);
    }, { passive: true });
  }

  // 탭 가로 스크롤 — 휠 + 드래그 (윈도우/데스크톱 지원)
  const tabsEl = document.querySelector('.tabs');
  if (tabsEl) {
    // 휠 → 가로
    tabsEl.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        tabsEl.scrollLeft += e.deltaY * 2;
      }
    }, { passive: false });
    // 마우스 드래그 → 가로
    let isDragging = false, startX = 0, scrollStart = 0;
    tabsEl.addEventListener('mousedown', (e) => {
      isDragging = true; startX = e.pageX; scrollStart = tabsEl.scrollLeft;
      tabsEl.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      tabsEl.scrollLeft = scrollStart - (e.pageX - startX);
    });
    document.addEventListener('mouseup', () => {
      isDragging = false; tabsEl.style.cursor = '';
    });
  }
});

function pad(n) { return String(n).padStart(2,'0'); }
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function ago(d){
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '방금 전';
  const m = Math.floor((Date.now() - date) / 60000);
  if(m<1) return '방금 전';
  if(m<60) return m+'분 전';
  const h = Math.floor(m/60);
  if(h<24) return h+'시간 전';
  return Math.floor(h/24)+'일 전';
}

/* ═══════════ BATCH FETCH (429 방지) ═══════════ */
async function fetchInBatches(items, fn, batchSize = 3, delay = 250) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return results;
}

/* ═══════════ TAB SWITCHING ═══════════ */
function switchTab(id) {
  currentTab = id;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab===id));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id==='tab-'+id));
  updateDrawerActive(id);

  // 탭 전환 시 스크롤 초기화 + 헤더 shrunk 해제
  const contentEl = document.querySelector('.content');
  const headerEl  = document.querySelector('.header');
  if (contentEl) contentEl.scrollTop = 0;
  if (headerEl)  headerEl.classList.remove('shrunk');

  const isNewsTab = ['economy','industry','global','stocks'].includes(id);
  if (isNewsTab && !summaryCache[id]) genTabSummary(id);
  if (isNewsTab && DEV_MODE) renderTabSummary(id, DEV_DUMMY);
  if (id==='market') loadStocks();
  if (id==='fx' && !fxRates) loadFX();
  if (id==='breaking') loadBreaking();
  if (id==='front') {
    renderLandingBriefs();
    loadFrontMarket();
    ['economy','industry','global','stocks'].forEach(t => { if (!summaryCache[t]) genTabSummary(t); });
  }
  if (id==='newsroom') renderNewsroom();
  if (id==='about') renderAbout();
  if (id==='column') {
    if (!isPremiumUnlocked()) { renderPremiumGate('column'); return; }
    loadColumnTab();
  }
  if (id==='archive') {
    if (!isPremiumUnlocked()) { renderPremiumGate('archive'); return; }
    loadArchive();
  }
}


/* ═══════════ 종합 생성 ═══════════ */
const LOADING_MSGS = [
  '오늘의 핵심 이슈를 짚어보고 있어요...',
  '시장 흐름을 분석하고 있습니다...',
  '글로벌 경제 신호를 읽고 있어요...',
  '전문가 관점으로 뉴스를 해석 중입니다...',
  '오늘 꼭 알아야 할 이슈를 추리는 중입니다...',
  '뉴스의 행간을 읽고 있습니다...',
  'AI가 오늘의 경제 맥락을 분석하는 중이에요...',
  'Shawn의 시각으로 오늘 시장을 읽고 있어요...',
  'VIVA! 살아있는 브리핑을 준비하는 중입니다...',
  '오늘의 브리핑이 곧 심장을 뛰게 할 거예요...',
];

// 경제 퀴즈 (50문항)
let _loadingInterval = null;
let _briefingController = null;
let _aiStepIndex = 0;    // AI 단계 진행 인덱스 (0~5)
let _aiStepTimers = [];   // AI 단계 자동 전진 타이머들

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function setLoadingMsg(tab, phase) {
  const card = document.getElementById(`${tab}-summary-card`);
  if (!card) return;
  if (_loadingInterval) { clearInterval(_loadingInterval); _loadingInterval = null; }
  _aiStepTimers.forEach(t => clearTimeout(t));
  _aiStepTimers = [];

  // 퀴즈는 뉴스 수집 시작 시 고정

  // phase='news' → step 0, phase='ai' → step 1부터 자동 전진, phase='fast' → 1초씩 5단계
  if (phase === 'news') {
    _aiStepIndex = 0;
  } else if (phase === 'ai') {
    _aiStepIndex = 1;
    // 타이머로 자동 전진 (실제 AI 처리와 무관한 체감 진행)
    _aiStepTimers.push(setTimeout(() => { _aiStepIndex = 2; renderLoading(); }, 4000));
    _aiStepTimers.push(setTimeout(() => { _aiStepIndex = 3; renderLoading(); }, 10000));
    _aiStepTimers.push(setTimeout(() => { _aiStepIndex = 4; renderLoading(); }, 18000));
  } else if (phase === 'fast') {
    _aiStepIndex = 0;
    // 캐시 히트 시: 1초마다 한 단계씩 (총 5초)
    [1, 2, 3, 4, 5].forEach(step => {
      _aiStepTimers.push(setTimeout(() => { _aiStepIndex = step; renderLoading(); }, step * 1000));
    });
  }

  const msgs = shuffled(LOADING_MSGS);
  let msgIdx = 0;

  const ALL_STEPS = [
    { label:'뉴스 수집 중',   icon:'📡', desc:'오늘의 헤드라인을 모으고 있어요' },
    { label:'핵심 분석 중',   icon:'🔍', desc:'AI가 핵심 이슈를 읽고 있어요' },
    { label:'맥락 파악 중',   icon:'🧠', desc:'경제 흐름을 짚어내는 중이에요' },
    { label:'인사이트 정리',  icon:'⚡', desc:'숨겨진 맥락을 찾고 있어요' },
    { label:'브리핑 집필 중', icon:'✍️', desc:'살아있는 브리핑을 쓰고 있어요' },
    { label:'발행 준비 완료', icon:'💗', desc:'오늘의 브리핑이 뛰고 있습니다' },
  ];
  const VIVA_COLOR = TAB_COLORS.economy.main;
  const VIVA_LETTERS = ['V','I','V','A','!'];
  const VIVA_BOUNCE_DELAYS = VIVA_LETTERS.map((_, i) => (i * 0.13).toFixed(2));
  const VIVA_PULSE_DELAYS  = VIVA_LETTERS.map((_, i) => (i * 0.09).toFixed(2));

  function renderLoading() {
    const ci = _aiStepIndex;
    const totalSteps = ALL_STEPS.length;
    const isComplete = ci >= totalSteps;

    const litCount = Math.min(ci, VIVA_LETTERS.length);
    const bounceSpeed = ci <= 1 ? '1.3s' : ci <= 3 ? '0.9s' : '0.65s';

    const vivaViz = `
      <div style="margin:20px 0 22px;text-align:center;letter-spacing:6px;line-height:1;">
        ${VIVA_LETTERS.map((letter, i) => {
          const isLit = i < litCount;
          const anim = isComplete
            ? `vivaPulse 1.8s ${VIVA_PULSE_DELAYS[i]}s ease-in-out infinite`
            : isLit
              ? `vivaBounce ${bounceSpeed} ${VIVA_BOUNCE_DELAYS[i]}s ease-in-out infinite`
              : 'none';
          const color = isLit ? VIVA_COLOR : '#DCDFE4';
          const size = isComplete ? '40px' : isLit ? '38px' : '34px';
          const shadow = isLit && !isComplete ? `0 2px 12px rgba(165,28,48,0.25)` : 'none';
          return `<span style="display:inline-block;font-family:var(--font-mono);font-size:${size};font-weight:900;color:${color};text-shadow:${shadow};transition:color 0.5s ease;animation:${anim};">${letter}</span>`;
        }).join('')}
      </div>`;

    const stepLabels = ALL_STEPS.map((s, idx) => {
      const done = idx < ci;
      const active = idx === ci;
      const color = (done || active) ? VIVA_COLOR : '#C4C9CF';
      const weight = (done || active) ? '700' : '400';
      const opacity = done ? '1' : active ? '1' : '0.35';
      const icon = done ? '✓' : active ? s.icon : '·';
      return `<div style="display:flex;align-items:center;gap:8px;opacity:${opacity};transition:opacity 0.4s;">
        <span style="font-size:${active?'13':'11'}px;min-width:16px;text-align:center;color:${color};">${icon}</span>
        <span style="font-size:12px;font-weight:${weight};color:${color};font-family:var(--font-sans);">${s.label}</span>
        ${active ? `<span style="font-size:11px;color:var(--text);">— ${s.desc}</span>` : ''}
      </div>`;
    }).join('');


    card.innerHTML = `
      <div style="padding:24px 20px;background:#FFFFFF;border-radius:16px;box-shadow:0 2px 16px rgba(90,10,20,0.06);">
        <div style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:${isComplete?VIVA_COLOR:'var(--text-dim)'};letter-spacing:2.5px;margin-bottom:0;text-align:center;">
          ${isComplete ? 'ECONOMY IS ALIVE' : `LOADING · ${ci} / ${ALL_STEPS.length}`}
        </div>
        ${vivaViz}
        <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:16px;">
          ${stepLabels}
        </div>
        <div style="text-align:center;padding-top:12px;border-top:1px solid var(--border);">
          <div class="dots" style="margin-bottom:8px;"><span></span><span></span><span></span></div>
          <div style="color:var(--text);font-size:12px;font-weight:500;">${msgs[msgIdx % msgs.length]}</div>
          <div style="font-size:10px;color:var(--text);font-family:var(--font-mono);margin-top:6px;">뉴스 양에 따라 10~30초 정도 걸릴 수 있어요</div>
        </div>
        <div style="text-align:center;margin-top:14px;">
          <button onclick="cancelBriefing('${tab}')"
            style="background:transparent;border:1.5px solid var(--border);border-radius:8px;
                   padding:7px 18px;font-size:11px;font-weight:600;color:var(--text);
                   font-family:var(--font-sans);cursor:pointer;">
            ✕ 브리핑 건너뛰기
          </button>
        </div>
      </div>`;
    msgIdx++;
  }

  renderLoading();
  _loadingInterval = setInterval(renderLoading, 4000);
}


function stopLoadingMsg() {
  if (_loadingInterval) { clearInterval(_loadingInterval); _loadingInterval = null; }
  _aiStepTimers.forEach(t => clearTimeout(t));
  _aiStepTimers = [];
}

function cancelBriefing(tab) {
  stopLoadingMsg();
  if (_briefingController) { _briefingController.abort(); _briefingController = null; }
  _aiStepIndex = 0;
  summaryCache[tab] = null;
  const card = document.getElementById(`${tab}-summary-card`);
  if (card) card.innerHTML = `
    <div class="status-card">
      <div class="status-card-icon">⏭</div>
      <div class="status-card-title">브리핑 건너뜀</div>
      <div class="status-card-desc">서브칩에서 뉴스를 직접 볼 수 있어요.</div>
      <button class="retry-btn" onclick="genTabSummary('${tab}')">🔄 다시 생성</button>
    </div>`;
}

const DEV_DUMMY = {
  summary: `포인트1: 원달러 환율이 1,500원을 돌파하며 17년 만에 최고치를 기록했다. 중동 분쟁으로 인한 국제유가 급등과 달러 강세가 맞물린 결과로, 수입 물가 상승 압박이 즉각적으로 커지고 있다.

포인트2: ECB는 6회 연속 기준금리를 동결하며 인플레이션 전망을 상향 조정했다. 주요국이 고금리를 유지하는 상황에서 한국은행도 독자적인 금리 인하에 제동이 걸릴 수밖에 없는 구조적 배경이다.

포인트3: 코스피는 2.73% 급락하며 2,400선 아래로 내려앉았고 외국인 순매도가 이어졌다. 고유가·고환율이 동시에 진행되면 기업 원가 상승→실적 악화→주가 하락의 연쇄 충격이 전 섹터로 번질 수 있다.

포인트4: 한국은행 다음 금통위에서 금리 동결이 유력하나, 환율 1,500원·유가 110달러가 지속된다면 7월 인상 카드가 현실화될 수 있다. 채권 듀레이션 축소 및 에너지 섹터 비중 점검이 지금 당장의 핵심 과제다.`,
  oneliner: '',
  footnotes: `포인트1: ※ 달러 강세 — 글로벌 시장에서 달러 수요가 높아져 달러 가치가 오르는 현상. 원화 가치는 반대로 하락
포인트2: ※ ECB(유럽중앙은행) — 유로존 20개국의 통화정책을 담당하는 중앙은행
포인트3: ※ 순매도 — 특정 기간 동안 매도 금액이 매수 금액보다 많은 상태
포인트4: ※ 듀레이션 — 채권의 현금흐름 평균 회수 기간. 금리 오르면 듀레이션 길수록 손실 커짐`,
  headline: '🚨 환율 1,500원 돌파…17년 만의 충격!',
  subheading: '중동發 유가 폭등이 원화 가치를 직격했다',
  heading2: '🕰️ 3년 전부터 예고된 시한폭탄',
  subheading2: '주요국 금리 동결이 한국의 발목을 잡고 있다',
  heading3: '📉 주식·부동산 동시 충격 오나?',
  subheading3: '고유가·고환율 이중 충격이 전 자산군으로 번진다',
  heading4: '🎯 지금 당장 확인해야 할 딱 한 가지',
  subheading4: '7월 금통위 전에 듀레이션부터 점검하라',
  columnHook: '💣 환율 1,500원인데 집 사도 된다고? 전문가들이 말 못 하는 속사정',
  columnSubhook: '오늘 뉴스 뒤에 숨겨진 2·3차 파급효과, 브리핑에선 못 다한 얘기',
  topImageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
  sectionImages: [
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80',
  ],
  topNews: [
    { title: '[DEV] 원달러 환율 1,500원 돌파…17년 만의 최고치', source: '한국경제', date: new Date(), link: '#' },
    { title: '[DEV] 국제유가 110달러 돌파…중동 분쟁 격화', source: '매일경제', date: new Date(), link: '#' },
    { title: '[DEV] ECB 6회 연속 금리 동결…인플레이션 전망 상향', source: '연합뉴스', date: new Date(), link: '#' },
    { title: '[DEV] 코스피 2.73% 급락…외국인 순매도 폭탄', source: '서울경제', date: new Date(), link: '#' },
    { title: '[DEV] 한국은행 기준금리 2.50% 동결…7연속', source: '조선일보', date: new Date(), link: '#' },
  ],
  column: `환율 1,500원 돌파, 유가 급등까지… 한국 경제 이중 충격 시작됐어요 🚨
이란 전쟁 여파로 원달러 환율이 금융위기 이후 처음으로 1,500원을 넘어섰어요. 여기에 국제유가 급등까지 겹치면서 "고유가·고환율 이중 충격"이라는 말이 시장 곳곳에서 들려오고 있죠.
---
### 환율이 왜 갑자기 1,500원을 넘어선 거예요?
이번 환율 급등의 핵심은 에너지 수급 불안과 달러 수요 폭발이 동시에 터진 것이에요. 이란 전쟁이 장기화 국면으로 접어들면서 원유 공급이 흔들릴 수 있다는 불안감이 커졌고, 이게 국제유가를 끌어올렸죠. 유가가 오르면 에너지를 수입하는 데 달러가 더 많이 필요해지고, 자연스럽게 원화 가치는 뚝 떨어지는 거예요. 📉
### ECB가 금리를 동결하면 한국은행은 왜 발이 묶이는 거예요?
미국 연준·ECB·한국은행이 일제히 금리를 동결했어요. 한국은행이 금리를 내리고 싶어도, 주요국이 높은 금리를 유지하는 상황에서 한국만 먼저 내리면 투자자들이 달러 자산으로 이동하게 되고, 환율은 더 오르게 되죠. 💡
### 지금 투자자가 주목해야 할 지표는 딱 하나예요
다음 달 한국은행 금통위 결정이 핵심이에요. 환율 1,500원·유가 110달러가 지속된다면 7월 금리 인상 카드가 현실화될 수 있고, 이 경우 채권·부동산 시장에 큰 파장이 예상돼요. 🔍
---
by. Shawn Kim`,
  comments: [
    { nick: '청소의왕', text: '환율 1,500원이면 라면값 또 오르겠네... 이제 진짜 편의점도 못 가겠다', likes: 31,
      replies: [{ nick: 'Rodus23', text: '마트 영수증 볼 때마다 현타옴' }, { nick: '꼬북이', text: '달러 미리 살걸 ㅠㅠ' }] },
    { nick: 'k_investor', text: '금리 동결이라는데 내 이자는 왜 안 내려가냐고 ㅋㅋ', likes: 18,
      replies: [{ nick: '파란하늘82', text: '은행이 내릴 생각이 없는 거죠 뭐' }] },
    { nick: 'thesomeaudio', text: '코스피 2400 깨지면 진짜 어떻게 되는 거예요? 그냥 계속 존버하면 되나', likes: 14,
      replies: [{ nick: '수익왕', text: '저도 그게 제일 궁금함' }, { nick: 'minJi_fin', text: '저는 그냥 적금 박았어요 ㅠ' }] },
    { nick: '경제요정', text: '유가 110달러면 이번 여름 여행 경비 진짜 걱정되네요', likes: 9,
      replies: [] },
  ]
};

/* ═══════════ 스케줄 캐시 헬퍼 ═══════════ */
function getLastScheduleTime() {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hm = kst.getHours() * 100 + kst.getMinutes();
  const schedules = [700];
  let lastHm = null;
  for (const s of schedules) {
    if (hm >= s) lastHm = s;
  }
  if (lastHm === null) {
    const prev = new Date(kst);
    prev.setDate(prev.getDate() - 1);
    prev.setHours(7, 0, 0, 0);
    return prev.getTime() - (now - kst);
  }
  const last = new Date(kst);
  last.setHours(Math.floor(lastHm / 100), lastHm % 100, 0, 0);
  const offset = kst.getTime() - now.getTime();
  return last.getTime() - offset;
}

async function genTabSummary(tab) {
  // 개발모드: AI 호출 없이 더미 데이터로 렌더링
  if (DEV_MODE) {
    summaryCache[tab] = DEV_DUMMY;
    renderTabSummary(tab, DEV_DUMMY);
    updateFrontPreview(tab, DEV_DUMMY.summary);
    return;
  }

  const cacheKey = `eco_summary_${tab}`;
  const cacheTimeKey = `eco_summary_time_${tab}`;
  const cached = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);

  // 스케줄 기반 캐시 체크 (07:00 / 17:00 KST)
  if (cached && cachedTime) {
    const lastSchedule = getLastScheduleTime();
    if (Number(cachedTime) >= lastSchedule) {
      const parsed = JSON.parse(cached);
      if (parsed.summary) {
        summaryCache[tab] = parsed;
        setLoadingMsg(tab, 'fast');
        setTimeout(() => {
          renderTabSummary(tab, summaryCache[tab]);
          updateFrontPreview(tab, parsed.summary);
        }, 5500);
        return;
      }
    }
  }

  const label = TAB_LABEL[tab];

  // Firestore 프리젠 캐시 체크 (크론이 07:00/17:00 KST에 미리 생성)
  try {
    const cfRes = await fetch(`/api/cached?tab=${tab}`);
    if (cfRes.ok) {
      const cf = await cfRes.json();
      if (cf.fresh && cf.summary) {
        console.log(`[CACHED] ${tab} 프리젠 데이터 사용 (created_at: ${new Date(cf.created_at).toLocaleTimeString()})`);
        const result = { summary: cf.summary, oneliner: '', footnotes: cf.footnotes || '', headline: cf.headline || '', subheading: cf.subheading || '', heading2: cf.heading2 || '', subheading2: cf.subheading2 || '', heading3: cf.heading3 || '', subheading3: cf.subheading3 || '', heading4: cf.heading4 || '', subheading4: cf.subheading4 || '', columnHook: cf.columnHook || '', topImageUrl: cf.topImageUrl || '', sectionImages: cf.sectionImages || [], comments: cf.comments || [], topNews: [] };
        summaryCache[tab] = result;
        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(cacheTimeKey, cf.created_at.toString());
        // 로딩 애니메이션 5초 후 렌더링 → 렌더 완료 후 뉴스 백그라운드 로딩
        setLoadingMsg(tab, 'fast');
        setTimeout(async () => {
          renderTabSummary(tab, result);
          updateFrontPreview(tab, result.summary);
          // 뉴스 목록 백그라운드 로딩 (렌더 완료 후 시작, 배치 병렬)
          const bgFetch = async (q) => {
            try {
              const r = await fetch(`/api/news?query=${encodeURIComponent(q)}&display=7`);
              const j = await r.json();
              return j.items || [];
            } catch(e) { return []; }
          };
          const allItems = (await fetchInBatches(SUMMARY_QUERIES[tab], bgFetch, 3, 250)).flat();
          const seen2 = new Set();
          const skipKw2 = ['구직','채용','취업','자립준비','희망디딤돌','주요기사'];
          const unique2 = allItems
            .filter(it => !skipKw2.some(kw => it.title.includes(kw)))
            .filter(it => { const k = it.title.slice(0,15); if(seen2.has(k)) return false; seen2.add(k); return true; })
            .slice(0, 15);
          if (unique2.length) {
            result.topNews = unique2;
            newsCache[`${tab}-summary`] = unique2;
            summaryCache[tab] = result;
            localStorage.setItem(cacheKey, JSON.stringify(result));
            renderTabSummary(tab, result);
          }
        }, 5500);
        return;
      }
    }
  } catch(e) {
    console.log('[CACHED] Firestore 미사용, 직접 생성:', e.message);
  }

  // 뉴스 수집 — 병렬 fetch (순차 시 최대 56초 → 병렬로 5초 이내)
  setLoadingMsg(tab, 'news');
  const queries = SUMMARY_QUERIES[tab];

  const fetchNews = async (q) => {
    try {
      const r = await fetch(`/api/news?query=${encodeURIComponent(q)}&display=7&type=general`,
        { signal: (function(){ const c = new AbortController(); setTimeout(()=>c.abort(), 5000); return c.signal; })() });
      const j = await r.json();
      return j.items || [];
    } catch(e) {
      console.warn("[NEWS FETCH ERROR]", q, e.message);
      return [];
    }
  };

  const results = await fetchInBatches(queries, fetchNews, 3, 250);
  const allItems = results.flat();

  const skipKw = ['구직','채용','취업','자립준비','희망디딤돌','주요기사','1부','2부'];
  const seen = new Set();
  const unique = allItems
    .filter(it => !skipKw.some(kw => it.title.includes(kw)))
    .filter(it => { const k=it.title.slice(0,15); if(seen.has(k)) return false; seen.add(k); return true; })
    .sort((a,b)=>new Date(b.date)-new Date(a.date))
    .slice(0, 18);

  console.log("[DEBUG] allItems:", allItems.length, "/ unique:", unique.length);
  newsCache[`${tab}-summary`] = unique;

  // AI 호출
  if (!unique.length) {
    stopLoadingMsg();
    const card = document.getElementById(`${tab}-summary-card`);
    if (card) card.innerHTML = `
      <div class="status-card">
        <div class="status-card-icon">📡</div>
        <div class="status-card-title">뉴스를 불러오지 못했어요</div>
        <div class="status-card-desc">네트워크 상태를 확인하고 다시 시도해주세요.</div>
        <button class="retry-btn" onclick="summaryCache['${tab}']=null;genTabSummary('${tab}')">🔄 다시 시도</button>
      </div>`;
    return;
  }

  try {
    setLoadingMsg(tab, 'ai');
    // 뉴스 섹션 로딩 대기화면
    const newsElLoading = document.getElementById(`${tab}-summary-news`);
    if (newsElLoading) newsElLoading.innerHTML = '';
    const headlines = unique.slice(0, 18).map(n =>
      n.description ? `${n.title}\n   → ${n.description.slice(0, 100)}` : n.title
    );
    console.log('[BRIEFING] 1차 호출 시작 (SUMMARY+FOOTNOTES), headlines:', headlines.length);
    _briefingController = new AbortController();
    const briefingTimer = setTimeout(() => { if (_briefingController) _briefingController.abort(); }, 55000);
    const res = await fetch('/api/briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headlines, tab, label }),
      signal: _briefingController.signal,
    });
    clearTimeout(briefingTimer);
    _briefingController = null;
    console.log('[BRIEFING] 1차 응답 상태:', res.status);
    const j = await res.json();
    console.log('[BRIEFING] 1차 응답 키:', Object.keys(j), 'summary 길이:', (j.summary||'').length);
    if (!res.ok) {
      throw new Error(j.error || `API 오류 ${res.status}`);
    }
    if (!j.summary || j.summary.trim().length === 0) {
      throw new Error('AI 응답에서 SUMMARY 파싱 실패 — 다시 시도해주세요');
    }

    // 1차 결과: SUMMARY + FOOTNOTES → 즉시 렌더
    const result = {
      summary: j.summary || '',
      oneliner: '',
      footnotes: j.footnotes || '',
      headline: j.headline || '', subheading: j.subheading || '',
      heading2: j.heading2 || '', subheading2: j.subheading2 || '',
      heading3: j.heading3 || '', subheading3: j.subheading3 || '',
      heading4: j.heading4 || '', subheading4: j.subheading4 || '',
      columnHook: j.columnHook || '',
      comments: [],
      topNews: unique.slice(0, 15),
    };
    summaryCache[tab] = result;
    localStorage.setItem(cacheKey, JSON.stringify(result));
    localStorage.setItem(cacheTimeKey, Date.now());
    _aiStepIndex = 6;
    _aiStepTimers.forEach(t => clearTimeout(t));
    _aiStepTimers = [];
    if (_loadingInterval) { clearInterval(_loadingInterval); _loadingInterval = null; }
    setLoadingMsg(tab, 'done');
    await new Promise(r => setTimeout(r, 1000));
    stopLoadingMsg();
    renderTabSummary(tab, result);
    updateFrontPreview(tab, result.summary);


  } catch(err) {
    console.error('[BRIEFING ERROR]', err.message, err);
    stopLoadingMsg();
    const card = document.getElementById(`${tab}-summary-card`);
    if (card) card.innerHTML = `
      <div class="status-card">
        <div class="status-card-icon">🔧</div>
        <div class="status-card-title">서비스 점검 중입니다</div>
        <div class="status-card-desc">잠시 후 다시 확인해 주세요.</div>
        <button class="retry-btn" onclick="summaryCache['${tab}']=null;genTabSummary('${tab}')">🔄 다시 시도</button>
      </div>`;
  }
}

/* ═══════════ 2차: ONELINER 백그라운드 호출 ═══════════ */
async function fetchInsight(tab, summary, footnotes, label, topNewsItems) {
  const cacheKey = `eco_summary_${tab}`;
  const cacheTimeKey = `eco_summary_time_${tab}`;

  try {
    console.log('[INSIGHT] 2차 호출 시작 (ONELINER)');
    const res = await fetch('/api/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, footnotes, label, headlines: topNewsItems.map(n => n.title) }),
      signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 55000); return c.signal; })()
    });
    const j = await res.json();
    console.log('[INSIGHT] 2차 응답:', res.status, 'oneliner 길이:', (j.oneliner||'').length);

    if (res.ok && j.oneliner) {
      // summaryCache 업데이트
      if (summaryCache[tab]) {
        summaryCache[tab].oneliner = j.oneliner;
      }
      // localStorage 저장 (summary + oneliner 합쳐서)
      localStorage.setItem(cacheKey, JSON.stringify(summaryCache[tab]));
      localStorage.setItem(cacheTimeKey, Date.now());
      // 인사이트 렌더 (renderTabSummary 내부의 insight 렌더 로직 재활용)
      renderInsightSection(tab, j.oneliner);
    } else {
      console.warn('[INSIGHT] ONELINER 없음 또는 에러', res.status, JSON.stringify(j));
      showInsightRetry(tab, topNewsItems, summary, footnotes, label);
    }
  } catch(err) {
    console.warn('[INSIGHT ERROR]', err.message);
    showInsightRetry(tab, topNewsItems, summary, footnotes, label);
  }
}

function showInsightRetry(tab, topNewsItems, summary, footnotes, label) {
  const insightEl = document.getElementById(`${tab}-insight`);
  if (insightEl) {
    insightEl.innerHTML = `
      <div class="insight-section-label">💡 쓰리포인트 요약 by Shawn</div>
      <div style="background:#F7FBF8;border-radius:14px;padding:20px;text-align:center;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">인사이트를 불러오지 못했어요</div>
        <button class="retry-btn" onclick="retryInsight('${tab}')" style="font-size:12px;padding:8px 20px;">🔄 다시 시도</button>
      </div>`;
  }
  // 캐시는 저장
  const cacheKey = `eco_summary_${tab}`;
  const cacheTimeKey = `eco_summary_time_${tab}`;
  localStorage.setItem(cacheKey, JSON.stringify(summaryCache[tab]));
  localStorage.setItem(cacheTimeKey, Date.now());
}

function retryInsight(tab) {
  const cached = summaryCache[tab];
  if (!cached) return;
  const insightEl = document.getElementById(`${tab}-insight`);
  if (insightEl) {
    insightEl.innerHTML = `
      <div class="insight-section-label">💡 쓰리포인트 요약 by Shawn</div>
      <div style="background:#F7FBF8;border-radius:14px;padding:20px;text-align:center;">
        <div class="dots" style="margin-bottom:10px;"><span></span><span></span><span></span></div>
        <div style="font-size:12px;color:var(--text-muted);">인사이트 분석 중...</div>
      </div>`;
  }
  const label = TAB_LABEL[tab];
  fetchInsight(tab, cached.summary, cached.footnotes || '', label, cached.topNews || []);
}

function renderTabSummary(tab, result) {
  // 로딩 타이머 전부 정리 (renderLoading이 기사를 덮어쓰는 레이스 컨디션 방지)
  _aiStepTimers.forEach(t => clearTimeout(t));
  _aiStepTimers = [];
  if (_loadingInterval) { clearInterval(_loadingInterval); _loadingInterval = null; }

  const card = document.getElementById(`${tab}-summary-card`);
  if (card && result.summary) {
    // 디버그: 실제 summary 포맷 확인
    console.log('[SUMMARY RAW]', JSON.stringify(result.summary));

    // 줄1:/줄2:/줄3: 패턴 (한줄/멀티라인 모두 대응)
    const summaryClean = (result.summary || '')
      .replace(/\*\*/g, '')
      .replace(/^#+\s*/gm, '')
      .replace(/^---+\s*/gm, '')
      .replace(/\[\/?(SUMMARY|ONELINER|FOOTNOTES|BRIEFING)\]/g, '')
      .trim();
    // 포인트1/2/3/4 파싱
    const m1 = summaryClean.match(/포인트1:\s*(.+?)(?=\s*포인트2:|$)/s);
    const m2 = summaryClean.match(/포인트2:\s*(.+?)(?=\s*포인트3:|$)/s);
    const m3 = summaryClean.match(/포인트3:\s*(.+?)(?=\s*포인트4:|$)/s);
    const m4 = summaryClean.match(/포인트4:\s*(.+?)(?=\s*\[|$)/s);
    const lines = [m1, m2, m3, m4].map(m => m ? m[1].trim() : null).filter(Boolean);

    // 각주 파싱
    const footnotesRaw = (result.footnotes || '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '');
    const fnMap = { 1: [], 2: [], 3: [], 4: [] };
    let lastFnLine = null;
    footnotesRaw.split('\n').forEach(l => {
      const m = l.match(/포인트([1234]):\s*(.*)/);
      if (m) { lastFnLine = Number(m[1]); if (m[2].trim()) fnMap[lastFnLine].push(m[2].trim()); }
      else if (lastFnLine && l.trim().startsWith('※')) fnMap[lastFnLine].push(l.trim());
    });

    // 날짜/시간
    const t = localStorage.getItem(`eco_summary_time_${tab}`);
    const d = t ? new Date(Number(t)) : new Date();
    const schedules = [700];
    const scheduleLabels = {700:'07:00'};
    const kst = new Date(d.toLocaleString('en-US',{timeZone:'Asia/Seoul'}));
    const hm = kst.getHours()*100+kst.getMinutes();
    let slotHm = null;
    for (const s of schedules) { if (hm >= s) slotHm = s; }
    const slotLabel = slotHm ? scheduleLabels[slotHm] : null;
    const dateStr = `${d.getMonth()+1}월 ${d.getDate()}일 · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} 기준`;
    const tc = TAB_COLORS[tab] || TAB_COLORS.economy;
    const slotBadge = slotLabel
      ? `<span style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:#fff;background:${tc.main};padding:2px 7px;border-radius:10px;letter-spacing:0.5px;">${slotLabel} 브리핑</span>`
      : '';

    // 4포인트 그라데이션 카드 — 탭별 색상 통일
    const CARDS = [
      { label:'핵심 이슈', color:tc.main, bg:`linear-gradient(135deg,${tc.bg1} 0%,${tc.bg2} 100%)`, shadow:tc.shadow },
      { label:'배경',      color:tc.main, bg:`linear-gradient(135deg,${tc.bg1} 0%,${tc.bg2} 100%)`, shadow:tc.shadow },
      { label:'시장 영향', color:tc.main, bg:`linear-gradient(135deg,${tc.bg1} 0%,${tc.bg2} 100%)`, shadow:tc.shadow },
      { label:'투자 전략', color:tc.main, bg:`linear-gradient(135deg,${tc.bg1} 0%,${tc.bg2} 100%)`, shadow:tc.shadow },
    ];

    // 각주 용어 밑줄 헬퍼
    function underlineTerms(text, fns, color) {
      if (!fns.length) return text;
      let out = text;
      fns.forEach(fn => {
        const raw = fn.split('—')[0].replace(/^※\s*/, '').trim();
        if (!raw) return;
        const core = raw.split(/[(\[（【]/)[0].trim();
        if (!core || core.length < 2) return;
        const escaped = core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out.replace(new RegExp(escaped, 'g'),
          `<span style="text-decoration:underline;text-decoration-color:${color};text-underline-offset:3px;font-weight:600;">${core}</span>`);
      });
      return out;
    }

    // 섹션 간 이미지 랜덤 배치 (0~2번 갭 중 최대 2개)
    const _sImgs = (result.sectionImages || []).filter(Boolean).slice(0, 2);
    const _gaps = [0, 1, 2].sort(() => Math.random() - 0.5);
    const _imgSlots = {};
    _sImgs.forEach((url, i) => { _imgSlots[_gaps[i]] = url; });

    card.innerHTML = `
      ${result.topImageUrl ? `<div style="margin:-16px -16px 16px;height:150px;border-radius:12px 12px 0 0;overflow:hidden;position:relative;">
        <img src="${result.topImageUrl}" style="width:100%;height:100%;object-fit:cover;"
          onerror="this.parentElement.style.display='none'"
          onload="if(this.naturalWidth<300||this.naturalHeight<150)this.parentElement.style.display='none'"/>
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.45) 100%);"></div>
      </div>` : ''}
      <div style="margin-bottom:14px;">
        <div style="font-family:var(--font-sans);font-size:13px;font-weight:700;color:var(--text-muted);letter-spacing:0.3px;">오늘의 한 입 뉴스</div>
      </div>
      ${lines.map((line, i) => {
        const cfg = CARDS[i] || CARDS[0];
        const fns = fnMap[i+1] || [];
        // 포인트N: 레이블 제거 + 마크다운 잔재 제거
        const cleaned = line.replace(/^포인트\d+:\s*/,'').replace(/\*\*/g,'').replace(/#+\s/g,'').trim();
        const bodyHtml = underlineTerms(cleaned, fns, cfg.color);
        const fnHtml = fns.length ? fns.map(fn => {
          const parts = fn.split('—');
          if (parts.length >= 2) {
            const term = parts[0].replace(/^※\s*/,'').trim();
            const desc = parts.slice(1).join('—').trim();
            return `<div style="margin-top:10px;padding:8px 12px;background:rgba(255,255,255,0.7);border-radius:10px;font-size:11px;color:#555;line-height:1.6;"><span style="font-weight:700;color:${cfg.color};">※ ${term}</span> — ${desc}</div>`;
          }
          return '';
        }).join('') : '';
        const headings = [
          { h: result.headline,  s: result.subheading  },
          { h: result.heading2,  s: result.subheading2 },
          { h: result.heading3,  s: result.subheading3 },
          { h: result.heading4,  s: result.subheading4 },
        ];
        const hd = headings[i] || {};
        const headlinePart = hd.h ? `
          <div style="font-size:20px;font-weight:900;color:#000000;line-height:1.3;margin-bottom:6px;font-family:var(--font-sans);letter-spacing:-0.4px;">${hd.h}</div>
          ${hd.s ? `<div style="font-size:15px;font-weight:800;color:${cfg.color};line-height:1.5;margin-bottom:14px;font-family:var(--font-sans);letter-spacing:-0.2px;">${hd.s}</div>` : ''}
        ` : '';
        const gapImg = _imgSlots[i];
        const gapHtml = (gapImg && i < lines.length - 1) ? `
          <div style="margin:4px 0 10px;border-radius:16px;overflow:hidden;height:160px;position:relative;">
            <img src="${gapImg}" style="width:100%;height:100%;object-fit:cover;"
              onerror="this.parentElement.style.display='none'"
              onload="if(this.naturalWidth<300||this.naturalHeight<100)this.parentElement.style.display='none'"/>
          </div>` : '';
        return `<div style="background:${cfg.bg};border-radius:20px;padding:18px 18px 16px;margin-bottom:10px;box-shadow:0 4px 20px ${cfg.shadow};">
          <div style="display:inline-flex;align-items:center;gap:5px;background:${cfg.color};color:#fff;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;margin-bottom:12px;letter-spacing:-0.1px;">${cfg.label}</div>
          ${headlinePart}
          <div style="font-size:16px;line-height:2.1;color:#000000;font-family:var(--font-sans);">${bodyHtml}</div>
          ${fnHtml}
        </div>${gapHtml}`;
      }).join('')}
    `;
  }

  // 프리미엄 칼럼 배너 (칼럼 탭으로 연결)
  const columnEl = document.getElementById(`${tab}-column`);
  if (columnEl) {
    const hook = result.columnHook || `오늘의 ${TAB_LABEL[tab]} 심층 분석`;
    const subhook = result.columnSubhook || '브리핑에서 말 못한 진짜 이유, 여기 있습니다';
    columnEl.innerHTML = `
      <div style="margin:4px 0 14px;background:linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#1A365D 100%);
               border-radius:14px;padding:18px 18px 16px;box-shadow:0 4px 20px rgba(15,23,42,0.22);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);font-family:var(--font-mono);letter-spacing:0.5px;">📰 오늘의 ${TAB_LABEL[tab]} 칼럼</span>
          <span style="font-size:10px;font-weight:700;color:#FCD34D;background:rgba(252,211,77,0.12);padding:3px 9px;border-radius:20px;letter-spacing:0.5px;white-space:nowrap;">💎 PREMIUM</span>
        </div>
        <div style="font-size:17px;font-weight:900;color:#FFFFFF;line-height:1.4;letter-spacing:-0.4px;margin-bottom:8px;">${hook}</div>
        <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);line-height:1.5;margin-bottom:16px;">${subhook}</div>
        <button onclick="openColumnTab('${tab}')"
          style="width:100%;padding:12px;background:#D4A84B;border:none;border-radius:10px;
                 font-size:13px;font-weight:800;color:#0F172A;letter-spacing:-0.2px;cursor:pointer;">
          칼럼 읽기 →
        </button>
      </div>`;
  }
  // 댓글 렌더
  const commentsEl = document.getElementById(`${tab}-comments`);
  if (commentsEl && result.comments?.length) {
    const AVATAR_COLORS = ['#1A7A45','#1D4ED8','#B45309','#6B21A8','#DC2626','#0891B2','#7C3AED','#059669'];
    commentsEl.innerHTML = `
      <div class="cmt-section">
        <div class="cmt-header">독자 반응</div>
        ${result.comments.map((c, i) => {
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const initial = c.nick.slice(0,1).toUpperCase();
          const likeKey = `eco_like_${tab}_${i}`;
          const liked = localStorage.getItem(likeKey) === '1';
          const likeCount = (c.likes || 0) + (liked ? 1 : 0);
          const repliesHtml = (c.replies || []).map((r, ri) => {
            const rc = AVATAR_COLORS[(i + ri + 3) % AVATAR_COLORS.length];
            return `<div class="cmt-reply">
              <div class="cmt-avatar cmt-avatar-sm" style="background:${rc};">${r.nick.slice(0,1).toUpperCase()}</div>
              <div class="cmt-reply-body">
                <span class="cmt-nick">${r.nick}</span>
                <span class="cmt-text">${r.text}</span>
              </div>
            </div>`;
          }).join('');
          return `<div class="cmt-item">
            <div class="cmt-avatar" style="background:${color};">${initial}</div>
            <div class="cmt-body">
              <div class="cmt-row">
                <span class="cmt-nick">${c.nick}</span>
                <button class="cmt-like${liked ? ' liked' : ''}" onclick="toggleCmtLike(this,'${tab}',${i},${c.likes || 0})">${liked ? '♥' : '♡'} ${likeCount}</button>
              </div>
              <div class="cmt-text">${c.text}</div>
              ${repliesHtml ? `<div class="cmt-replies">${repliesHtml}</div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  const newsEl = document.getElementById(`${tab}-summary-news`);
  if (newsEl) newsEl.innerHTML = '';
}

/* ═══════════ 댓글 좋아요 토글 ═══════════ */
function toggleCmtLike(btn, tab, idx, baseLikes) {
  const key = `eco_like_${tab}_${idx}`;
  const liked = localStorage.getItem(key) === '1';
  if (liked) {
    localStorage.removeItem(key);
    btn.classList.remove('liked');
    btn.textContent = `♡ ${baseLikes}`;
  } else {
    localStorage.setItem(key, '1');
    btn.classList.add('liked');
    btn.textContent = `♥ ${baseLikes + 1}`;
  }
}

/* ═══════════ INSIGHT 렌더 (독립 함수) ═══════════ */
function renderInsightSection(tab, oneliner) {
  const insightEl = document.getElementById(`${tab}-insight`);
  if (!insightEl || !oneliner) return;

  const cleanOneliner = (oneliner || '')
    .replace(/\*\*/g, '').replace(/^#+\s*/gm, '').replace(/^---+\s*/gm, '');

  function extractPoint(raw, label, nextLabel) {
    const pattern = nextLabel
      ? new RegExp(`${label}:\\s*([\\s\\S]*?)(?=${nextLabel}:|$)`)
      : new RegExp(`${label}:\\s*([\\s\\S]*?)$`);
    const m = raw.match(pattern);
    if (!m) return { text: '', footnotes: [] };
    const block = m[1].trim();
    const lines = block.split('\n');
    const textParts = [];
    const footnotes = [];
    lines.forEach(l => {
      const trimmed = l.trim();
      if (trimmed.startsWith('※각주:')) {
        footnotes.push(trimmed.replace(/^※각주:\s*/, '').trim());
      } else if (trimmed.startsWith('※') && trimmed.includes('—')) {
        footnotes.push(trimmed);
      } else {
        // 본문 중간에 ※가 붙어있는 경우 분리
        const fnIdx = l.indexOf('※');
        if (fnIdx > 0 && l.slice(fnIdx).includes('—')) {
          textParts.push(l.slice(0, fnIdx).trim());
          footnotes.push(l.slice(fnIdx).trim());
        } else {
          textParts.push(l);
        }
      }
    });
    const text = textParts.join(' ').replace(/\s+/g,' ').trim();
    return { text, footnotes };
  }

  const p1 = extractPoint(cleanOneliner, '배경\\(상황\\)Why', '시장 영향So What');
  const p2 = extractPoint(cleanOneliner, '시장 영향So What', '주목할 점Next Move');
  const p3 = extractPoint(cleanOneliner, '주목할 점Next Move', null);
  const points = [p1, p2, p3].filter(p => p.text.length > 0);

  function underlineInsight(text, fns) {
    if (!fns.length) return text;
    let result = text;
    fns.forEach(fn => {
      const raw = fn.split('—')[0].replace(/^※\s*/, '').trim();
      if (!raw) return;
      const core = raw.split(/[(\[（【]/)[0].trim();
      if (!core) return;
      const escaped = core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(
        new RegExp(escaped, 'g'),
        `<span style="text-decoration:underline;text-decoration-color:rgba(255,255,255,0.7);text-underline-offset:3px;font-weight:700;">${core}</span>`
      );
    });
    return result;
  }

  const labels = [
    { ko: '배경(상황) 🌍', en: 'Why' },
    { ko: '시장 영향 📉',  en: 'So What' },
    { ko: '주목할 점 🔍', en: 'Focus' },
  ];
  const colors = ['#1A7A45', '#8B4513', '#1A5CAD'];

  insightEl.innerHTML = `
    <div class="insight-section-label">💡 쓰리포인트 요약 by Shawn</div>
    <div class="insight-card" style="animation:panelIn 0.4s ease forwards;">
      ${points.map((p, i) => {
        const fnHtml = p.footnotes.length
          ? p.footnotes.map(fn => {
              const parts = fn.split('—');
              if (parts.length >= 2) {
                const term = parts[0].replace(/^※\s*/, '').trim();
                const desc = parts.slice(1).join('—').trim();
                return `<div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.1);border-left:2px solid rgba(255,255,255,0.3);border-radius:0 6px 6px 0;font-size:11px;color:rgba(255,255,255,0.85);line-height:1.6;">※ <span style="font-weight:700;text-decoration:underline;text-decoration-color:rgba(255,255,255,0.6);text-underline-offset:3px;">${term}</span> — ${desc}</div>`;
              }
              return `<div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.1);border-left:2px solid rgba(255,255,255,0.3);border-radius:0 6px 6px 0;font-size:11px;color:rgba(255,255,255,0.85);line-height:1.6;">${fn}</div>`;
            }).join('')
          : '';
        return `
        <div class="insight-line insight-point-anim" style="flex-direction:column;gap:8px;margin-bottom:${i < points.length - 1 ? '26px' : '0'};">
          <span style="background:${colors[i]};display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:6px;align-self:flex-start;">
            <span style="font-size:13px;font-weight:800;letter-spacing:-0.2px;color:#fff;">${labels[i].ko}</span>
            <span style="font-size:11px;opacity:0.85;font-weight:600;letter-spacing:0.3px;color:#fff;">${labels[i].en}</span>
          </span>
          <span class="insight-text" style="font-size:14px;line-height:1.85;">${underlineInsight(p.text, p.footnotes)}</span>
          ${fnHtml}
        </div>`;
      }).join('')}
    </div>`;
}

/* ═══════════ 칼럼 ═══════════ */
const columnCache = {};
let _columnForTab = 'economy';

function openColumnTab(tab) {
  _columnForTab = tab;
  drawerNav('column');
}

async function loadColumnTab() {
  const root = document.getElementById('column-tab-root');
  if (!root) return;
  const tab = _columnForTab;
  const label = TAB_LABEL[tab] || '경제';

  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 4px 14px;">
      <div>
        <div style="font-family:var(--font-serif);font-size:20px;font-weight:900;color:var(--text);letter-spacing:-0.3px;">📰 오늘의 ${label} 칼럼</div>
        <div style="font-size:10px;font-family:var(--font-mono);color:var(--text);margin-top:3px;letter-spacing:0.3px;">Daily Editorial</div>
      </div>
      <span style="font-size:11px;font-weight:700;color:#B45309;background:#FFF7ED;padding:5px 12px;border-radius:20px;letter-spacing:0.8px;white-space:nowrap;">💎 PREMIUM</span>
    </div>
    <div id="column-tab-body">
      <div class="status-card">
        <div class="dots"><span></span><span></span><span></span></div>
        <div class="status-card-desc" style="margin-top:12px;margin-bottom:0;">칼럼 작성 중...</div>
      </div>
    </div>`;

  const bodyEl = document.getElementById('column-tab-body');

  // 캐시 확인
  if (columnCache[tab]) { renderColumn(columnCache[tab], bodyEl); return; }
  const savedCol = localStorage.getItem(`eco_column_${tab}`);
  const savedColTime = localStorage.getItem(`eco_column_time_${tab}`);
  if (savedCol && savedColTime && Number(savedColTime) >= getLastScheduleTime()) {
    columnCache[tab] = savedCol;
    renderColumn(savedCol, bodyEl);
    return;
  }

  // 브리핑 없으면 안내
  const cached = summaryCache[tab];
  if (!cached?.summary) {
    bodyEl.innerHTML = `<div class="status-card"><div class="status-card-desc" style="color:var(--red);">먼저 ${label} 탭을 열어 브리핑을 생성해주세요.</div></div>`;
    return;
  }

  try {
    const res = await fetch('/api/column', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: cached.summary, oneliner: cached.oneliner, label }),
      signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 55000); return c.signal; })()
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || `오류 ${res.status}`);
    columnCache[tab] = j.column;
    localStorage.setItem(`eco_column_${tab}`, j.column);
    localStorage.setItem(`eco_column_time_${tab}`, Date.now());
    renderColumn(j.column, bodyEl);
  } catch(err) {
    bodyEl.innerHTML = `<div class="status-card">
      <div style="font-size:13px;color:var(--red);margin-bottom:12px;">⚠️ ${err.message}</div>
      <button class="retry-btn" onclick="loadColumnTab()">🔄 다시 시도</button>
    </div>`;
  }
}

function renderColumn(text, bodyEl) {
  if (!bodyEl) return;

  // 마크다운 → HTML 변환
  const lines = text.split('\n');
  let isFirst = true;
  const html = lines.map(line => {
    // 첫 번째 비어있지 않은 줄 = 헤드라인 (# 포함 여부 무관)
    if (isFirst && line.trim().length > 0) {
      isFirst = false;
      const headline = line.replace(/^#+\s*/, '').trim();
      return `<div class="column-headline">${headline}</div>`;
    }
    if (/^###\s/.test(line)) {
      return `<h3 class="column-h3">${line.replace(/^###\s/, '')}</h3>`;
    }
    if (/^#{1,2}\s/.test(line)) {
      return `<div class="column-h3">${line.replace(/^#+\s/, '')}</div>`;
    }
    if (/^---$/.test(line.trim())) {
      return `<hr class="column-divider">`;
    }
    if (line.trim() === '') return '';
    const content = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return `<p class="column-body">${content}</p>`;
  }).join('');

  bodyEl.innerHTML = `<div class="column-wrap">${html}</div>`;
}

function updateFrontPreview(tab, summary) {
  const el = document.getElementById(`front-${tab}-preview`);
  if (el && summary) {
    const firstLine = summary.split('\n').map(l=>l.replace(/^줄\d+:\s*/,'').trim()).find(l=>l.length>0) || '';
    el.innerHTML = `<span style="font-size:14px;color:var(--text);line-height:1.6;">${firstLine} →</span>`;
  }
  renderLandingBriefs();
}

function renderLandingBriefs() {
  const root = document.getElementById('landing-briefs');
  if (!root) return;

  const TABS = [
    { key: 'economy',  label: '경제', icon: '🏦', color: '#A51C30', bg: 'linear-gradient(160deg,#6B0F1A 0%,#A51C30 100%)' },
    { key: 'industry', label: '산업', icon: '🏭', color: '#1D4ED8', bg: 'linear-gradient(160deg,#1E3A8A 0%,#2563EB 100%)' },
    { key: 'global',   label: '국제', icon: '🌐', color: '#B45309', bg: 'linear-gradient(160deg,#78350F 0%,#B45309 100%)' },
    { key: 'stocks',   label: '증권', icon: '📈', color: '#047857', bg: 'linear-gradient(160deg,#064E3B 0%,#047857 100%)' },
  ];

  const cardsHtml = TABS.map(t => {
    const result = summaryCache[t.key];
    const headline = result?.headline;
    const img = result?.topImageUrl;
    const imgHtml = img
      ? `<img class="newspaper-card-img" src="${img}" alt="" loading="lazy" data-fallbackbg="${t.bg}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
         <div class="newspaper-card-img-placeholder" style="background:${t.bg};display:none;"></div>`
      : `<div class="newspaper-card-img-placeholder" style="background:${t.bg};"></div>`;
    return `<div class="newspaper-card" onclick="switchTab('${t.key}')" style="border-top:3px solid ${t.color};">
      ${imgHtml}
      <div class="newspaper-card-body">
        <div class="newspaper-card-tab" style="color:${t.color};">${t.icon} ${t.label.toUpperCase()}</div>
        <div class="newspaper-card-headline">${headline || '브리핑 불러오는 중...'}</div>
      </div>
    </div>`;
  }).join('');

  root.innerHTML = `<div class="newspaper-card-grid">${cardsHtml}</div>`;

  // 이미지 크기 검증 — 너무 작은 이미지(로고·아이콘)는 플레이스홀더로 대체
  root.querySelectorAll('.newspaper-card-img').forEach(imgEl => {
    const onSmall = () => {
      imgEl.style.display = 'none';
      imgEl.nextElementSibling.style.display = 'block';
    };
    imgEl.addEventListener('load', () => {
      if (imgEl.naturalWidth < 300 || imgEl.naturalHeight < 150) onSmall();
    });
  });
}

function openEarlybirdForm() {
  // 얼리버드 신청 — 추후 실제 폼/결제 링크로 교체
  const form = document.getElementById('earlybird-form-overlay');
  if (form) { form.style.display = 'flex'; return; }
  const overlay = document.createElement('div');
  overlay.id = 'earlybird-form-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;padding:28px 24px 40px;width:100%;max-width:480px;box-sizing:border-box;">
      <div style="width:36px;height:4px;background:#E5E7EB;border-radius:2px;margin:0 auto 20px;"></div>
      <div style="font-family:var(--font-serif);font-size:20px;font-weight:900;color:var(--text);margin-bottom:6px;">얼리버드 신청</div>
      <div style="font-size:13px;color:var(--text-dim);margin-bottom:20px;line-height:1.6;">이메일을 남겨주시면 출시 시 가장 먼저 안내드립니다.</div>
      <input id="earlybird-email" type="email" placeholder="이메일 주소를 입력해주세요"
        style="width:100%;box-sizing:border-box;padding:14px 16px;border:1.5px solid #E5E7EB;border-radius:12px;font-size:15px;font-family:var(--font-sans);outline:none;margin-bottom:12px;">
      <button onclick="submitEarlybird()" style="width:100%;padding:15px;background:linear-gradient(135deg,var(--viva-deep),var(--viva-ink));color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;font-family:var(--font-sans);cursor:pointer;letter-spacing:-0.2px;">신청 완료하기</button>
      <button onclick="document.getElementById('earlybird-form-overlay').style.display='none'" style="width:100%;padding:12px;background:none;border:none;color:var(--text-dim);font-size:13px;cursor:pointer;margin-top:4px;">닫기</button>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
  document.body.appendChild(overlay);
}

function submitEarlybird() {
  const email = document.getElementById('earlybird-email')?.value?.trim();
  if (!email || !email.includes('@')) {
    alert('올바른 이메일 주소를 입력해주세요.');
    return;
  }
  // TODO: 실제 제출 로직 (Firebase 저장 또는 외부 폼 연동)
  localStorage.setItem('eco_earlybird_email', email);
  document.getElementById('earlybird-form-overlay').style.display = 'none';
  showToast('얼리버드 신청이 완료됐습니다! 출시 시 안내드릴게요 🎉');
}

function renderAbout() {
  const root = document.getElementById('about-root');
  if (!root || root.dataset.rendered) return;
  root.dataset.rendered = '1';
  root.innerHTML = `
    <div class="about-wrap">
      <div class="about-hero">
        <div class="about-eyebrow">The Viva Company</div>
        <h1 class="about-title">경제 뉴스,<br>3분으로 끝냅니다</h1>
        <p class="about-sub">최신 경제 뉴스와 급변하는 트렌드<br>쉽고 빠르게 정리해드립니다.</p>
        <div class="about-stat-strip">
          <div class="about-stat"><span class="about-stat-num">매일</span><span class="about-stat-label">업데이트</span></div>
          <div class="about-stat-sep">·</div>
          <div class="about-stat"><span class="about-stat-num">4개</span><span class="about-stat-label">경제 분야</span></div>
          <div class="about-stat-sep">·</div>
          <div class="about-stat"><span class="about-stat-num">AI</span><span class="about-stat-label">자동 생성</span></div>
        </div>
      </div>
      <div class="about-section">
        <div class="about-section-title">이렇게 만들어져요</div>
        <div class="about-flow">
          <div class="about-flow-step">
            <div class="about-flow-num">01</div>
            <div><div class="about-flow-title">뉴스 수집</div><div class="about-flow-desc">경제·산업·국제·증권 분야 수십 개 기사를 매일 자동으로 모읍니다</div></div>
          </div>
          <div class="about-flow-step">
            <div class="about-flow-num">02</div>
            <div><div class="about-flow-title">AI 분석</div><div class="about-flow-desc">Claude AI가 핵심 이슈·배경·시장 영향·투자 전략 4포인트로 압축합니다</div></div>
          </div>
          <div class="about-flow-step">
            <div class="about-flow-num">03</div>
            <div><div class="about-flow-title">아카이브 누적</div><div class="about-flow-desc">매일 07:00 브리핑이 쌓여 경제 흐름을 길게 볼 수 있습니다</div></div>
          </div>
        </div>
      </div>
      <div class="about-section about-section-tinted">
        <div class="about-section-title">이런 분이라면</div>
        <div class="about-chips">
          <span class="about-chip">⏰ 뉴스 볼 시간이 없는 직장인</span>
          <span class="about-chip">📈 큰 흐름을 놓치는 것 같은 투자자</span>
          <span class="about-chip">🌏 글로벌 이슈가 한국에 왜 영향 주는지 궁금한 분</span>
          <span class="about-chip">👨‍👩‍👧 경제를 쉽게 이해하고 싶은 분</span>
        </div>
      </div>
      <div class="about-cta-wrap">
        <button class="about-cta" onclick="switchTab('economy')">오늘의 브리핑 읽기 →</button>
        <div class="about-copyright">© 2026 The Viva Company · Publisher Shawn Kim</div>
      </div>
    </div>`;
}

function isPremiumUnlocked() {
  return localStorage.getItem('eco_premium_key') !== null;
}

function renderPremiumGate(tabId) {
  const rootId = tabId === 'column' ? 'column-tab-root' : 'archive-root';
  const root = document.getElementById(rootId);
  if (!root) return;
  root.innerHTML = `
    <div class="premium-gate">
      <div class="premium-gate-icon">💎</div>
      <div class="premium-gate-title">PREMIUM</div>
      <div class="premium-gate-desc">칼럼과 아카이브는 프리미엄 구독자에게만 제공됩니다.</div>
      <ul class="premium-gate-features">
        <li>📰 매일 AI가 쓰는 심층 칼럼</li>
        <li>📚 날짜별 브리핑 아카이브</li>
        <li>🔍 경제 흐름 장기 트래킹</li>
      </ul>
      <button class="premium-gate-cta" onclick="switchTab('subscribe')">얼리버드 신청하기 →</button>
      <div class="premium-gate-note">* 출시 시 얼리버드 혜택 우선 제공</div>
    </div>`;
}

/* ═══════════ BREAKING NEWS ═══════════ */
async function loadBreaking() {
  const el = document.getElementById('breaking-news-list');
  if (el) el.innerHTML = '';
}


/* ═══════════ FRONT MARKET DASHBOARD ═══════════ */
function fmtChg(q) {
  if (!q) return { cls:'flat', txt:'—' };
  const cls = q.chg > 0 ? 'up' : q.chg < 0 ? 'down' : 'flat';
  const arr = q.chg > 0 ? '▲' : q.chg < 0 ? '▼' : '';
  return { cls, txt: `${arr}${Math.abs(q.pct).toFixed(2)}%` };
}

// 모든 지표 통합 목록 (3열 그리드)
const MARKET_GROUPS = [
  {
    label: '환율', icon: '💱', cols: 4,
    items: [
      { sym:'USDKRW=X', label:'달러 USD', dot:'#2563EB', kr:true },
      { sym:'EURKRW=X', label:'유로 EUR',  dot:'#059669', kr:true },
      { sym:'JPYKRW=X', label:'엔화 JPY',  dot:'#DC2626', kr:true },
    ],
  },
  {
    label: '원자재', icon: '🛢', cols: 4,
    items: [
      { sym:'GC=F', label:'금 Gold',   dot:'#D4A520', kr:false },
      { sym:'SI=F', label:'은 Silver', dot:'#9CA3AF', kr:false },
      { sym:'CL=F', label:'WTI 유가',  dot:'#374151', kr:false },
    ],
  },
  {
    label: '한국 증시', icon: '🇰🇷', cols: 4,
    items: [
      { sym:'^KS11', label:'KOSPI',  dot:'#A51C30', kr:true },
      { sym:'^KQ11', label:'KOSDAQ', dot:'#A51C30', kr:true },
    ],
  },
  {
    label: '미국 증시', icon: '🇺🇸', cols: 4,
    items: [
      { sym:'^DJI',  label:'다우존스', dot:'#1D4ED8', kr:false },
      { sym:'^IXIC', label:'NASDAQ',  dot:'#1D4ED8', kr:false },
      { sym:'^GSPC', label:'S&P 500', dot:'#1D4ED8', kr:false },
    ],
  },
  {
    label: '가상화폐', icon: '₿', cols: 4,
    items: [
      { sym:'BTC-USD', label:'비트코인',  dot:'#F97316', kr:false },
      { sym:'ETH-USD', label:'이더리움',  dot:'#6366F1', kr:false },
      { sym:'SOL-USD', label:'솔라나',    dot:'#8B5CF6', kr:false },
      { sym:'XRP-USD', label:'리플',      dot:'#0EA5E9', kr:false },
    ],
  },
];

// 전체 플랫 배열 (fetch 순서용)
const MARKET_ALL = MARKET_GROUPS.flatMap(g => g.items);

const DEV_MARKET = [
  // 환율
  { price:1354.5,  chg:  4.5,  pct:  0.33, closes:[1330,1335,1342,1338,1345,1350,1354] },
  { price:1498.2,  chg: -3.1,  pct: -0.21, closes:[1510,1505,1502,1508,1500,1501,1498] },
  { price:   9.21, chg:  0.03, pct:  0.33, closes:[9.10,9.12,9.15,9.18,9.16,9.20,9.21] },
  // 원자재
  { price:3240.1,  chg: 12.3,  pct:  0.38, closes:[3180,3195,3210,3200,3215,3228,3240] },
  { price:  32.45, chg: -0.20, pct: -0.61, closes:[33.0,32.8,32.9,32.7,32.6,32.65,32.45] },
  { price:  78.52, chg:  0.91, pct:  1.17, closes:[76.0,76.5,77.2,77.8,77.5,77.6,78.52] },
  // 한국 증시
  { price:2581.03, chg: -8.40, pct: -0.32, closes:[2620,2610,2598,2605,2595,2589,2581] },
  { price: 845.21, chg:  6.80, pct:  0.81, closes:[825,830,835,838,840,838,845] },
  // 미국 증시
  { price:38451.0,  chg: 312.5,  pct:  0.82, closes:[37800,37900,38100,38050,38200,38140,38451] },
  { price:17432.6,  chg: 194.3,  pct:  1.12, closes:[17000,17100,17200,17150,17250,17238,17432] },
  { price: 5123.41, chg:  47.80, pct:  0.94, closes:[5010,5030,5060,5055,5080,5075,5123] },
  // 가상화폐
  { price:83241.0,  chg:1230.0,  pct:  1.50, closes:[79000,80000,81200,80500,82000,82010,83241] },
  { price: 3182.4,  chg: -42.1,  pct: -1.31, closes:[3300,3280,3250,3220,3200,3224,3182] },
  { price:  142.3,  chg:   5.2,  pct:  3.79, closes:[128,130,133,135,138,137,142] },
  { price:    2.14, chg:   0.08, pct:  3.88, closes:[1.95,1.98,2.01,2.05,2.08,2.06,2.14] },
];

async function fetchSparkline(sym) {
  try {
    const r = await fetch(`/api/sparkline?sym=${encodeURIComponent(sym)}`, {
      signal: (()=>{ const c=new AbortController(); setTimeout(()=>c.abort(),8000); return c.signal; })()
    });
    const j = await r.json();
    return j?.closes?.length >= 2 ? j.closes : null;
  } catch { return null; }
}

function buildSparklineSvg(prices, cls) {
  if (!prices || prices.length < 2) return '';
  const W = 100, H = 28, pad = 2;
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (W - pad * 2);
    const y = H - pad - ((p - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = cls === 'up' ? '#16A34A' : cls === 'down' ? '#DC2626' : '#9CA3AF';
  return `<svg class="fm-sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function fmtMarketVal(price, kr) {
  if (price == null) return '—';
  return kr
    ? price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildFmCard(item, q, cols, sparkline) {
  const prev = q ? q.price - q.chg : null;
  const { cls, txt } = fmtChg(q);
  const chgAmt = q ? `${q.chg >= 0 ? '+' : ''}${fmtMarketVal(q.chg, item.kr)}` : '—';
  const compact = cols >= 4;
  const sparkSvg = sparkline ? buildSparklineSvg(sparkline, cls) : '';
  return `<div class="fm-card${compact ? ' fm-card-compact' : ''}">
    <div class="fm-card-top">
      <div class="fm-card-dot" style="background:${item.dot}"></div>
      <div class="fm-card-label">${item.label}</div>
    </div>
    <div class="fm-card-val">${q ? fmtMarketVal(q.price, item.kr) : '—'}</div>
    <div class="fm-card-prev">전일 ${prev != null ? fmtMarketVal(prev, item.kr) : '—'}</div>
    <div class="fm-card-chg ${cls}">${chgAmt}&nbsp;&nbsp;${txt}</div>
    ${sparkSvg}
  </div>`;
}

function buildFmSection(group, results, sparklines, offset) {
  const cols = group.cols || 2;
  const cards = group.items.map((item, i) => buildFmCard(item, results[offset + i], cols, sparklines?.[offset + i])).join('');
  return `
    <div class="fm-section-label">${group.icon} ${group.label}</div>
    <div class="fm-grid fm-grid-${cols}">${cards}</div>`;
}

async function loadFrontMarket() {
  const el = document.getElementById('front-market');
  if (!el) return;

  // 30분 캐시 — 유효하면 바로 렌더
  if (marketCache && Date.now() - marketCacheTime < MARKET_TTL) {
    let offset = 0;
    el.innerHTML = MARKET_GROUPS.map(g => {
      const html = buildFmSection(g, marketCache.results, marketCache.sparklines, offset);
      offset += g.items.length;
      return html;
    }).join('');
    return;
  }

  // 로딩 스켈레톤
  el.innerHTML = MARKET_GROUPS.map(g => `
    <div class="fm-section-label">${g.icon} ${g.label}</div>
    <div class="fm-grid fm-grid-2">${g.items.map(item =>
      `<div class="fm-card">
        <div class="fm-card-top"><div class="fm-card-dot" style="background:${item.dot}"></div><div class="fm-card-label">${item.label}</div></div>
        <div class="fm-card-val">—</div>
        <div class="fm-card-prev">전일 —</div>
        <div class="fm-card-chg flat">—</div>
      </div>`).join('')}
    </div>`).join('');

  const results = DEV_MODE
    ? DEV_MARKET
    : await Promise.all(MARKET_ALL.map(item => fetchQuote(item.sym)));

  // 1차 렌더 (스파크라인 없이 즉시)
  let offset = 0;
  el.innerHTML = MARKET_GROUPS.map(g => {
    const html = buildFmSection(g, results, null, offset);
    offset += g.items.length;
    return html;
  }).join('');

  // 2차 렌더 (스파크라인 포함)
  const sparklines = DEV_MODE
    ? DEV_MARKET.map(d => d.closes || null)
    : await Promise.all(MARKET_ALL.map(item => fetchSparkline(item.sym)));
  offset = 0;
  el.innerHTML = MARKET_GROUPS.map(g => {
    const html = buildFmSection(g, results, sparklines, offset);
    offset += g.items.length;
    return html;
  }).join('');

  // 캐시 저장
  if (!DEV_MODE) {
    marketCache = { results, sparklines };
    marketCacheTime = Date.now();
  }
}

/* ═══════════ STOCKS ═══════════ */
async function loadStocks(){
  // 30분 캐시
  if (stocksCache && Date.now() - stocksCacheTime < MARKET_TTL) {
    renderIndices(stocksCache.slice(0, 4));
    renderStockList(stocksCache.slice(4));
    return;
  }
  const results = await Promise.all([...INDICES,...STOCKS].map(s=>fetchQuote(s.sym)));
  stocksCache = results;
  stocksCacheTime = Date.now();
  renderIndices(results.slice(0,4));
  renderStockList(results.slice(4));
}

async function fetchQuote(sym){
  try {
    // Try Yahoo Finance v7 directly (CORS sometimes allowed)
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;
    const r = await fetch(url, {
      signal: (function(){ const c = new AbortController(); setTimeout(()=>c.abort(), 7000); return c.signal; })(),
      headers: { 'Accept': 'application/json' }
    });
    const j = await r.json();
    const q = j?.quoteResponse?.result?.[0];
    if (!q) return null;
    return {
      price: q.regularMarketPrice,
      chg:   q.regularMarketChange,
      pct:   q.regularMarketChangePercent
    };
  } catch {
    // Fallback: try v8 chart API
    try {
      const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
      const r2 = await fetch(url2, { signal: (function(){ const c = new AbortController(); setTimeout(()=>c.abort(), 7000); return c.signal; })() });
      const j2 = await r2.json();
      const meta = j2?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const price = meta.regularMarketPrice ?? meta.chartPreviousClose;
      const prev  = meta.chartPreviousClose ?? meta.previousClose;
      const chg   = price - prev;
      const pct   = prev ? (chg / prev) * 100 : 0;
      return { price, chg, pct };
    } catch { return null; }
  }
}

function renderIndices(res){
  const c = document.getElementById('market-indices');
  c.innerHTML = INDICES.map((idx,i)=>{
    const q = res[i];
    const cls = q?(q.chg>0?'up':q.chg<0?'down':'flat'):'flat';
    const arr = q?(q.chg>0?'▲':q.chg<0?'▼':'-'):'-';
    const isKR = idx.tag==='kr';
    return `<div class="idx-card">
      <div class="idx-name">${idx.name} <span class="market-tag tag-${idx.tag}">${idx.tag.toUpperCase()}</span></div>
      <div class="idx-val">${q?fmtN(q.price,isKR):'—'}</div>
      <div class="idx-chg ${cls}">${q?`${arr} ${Math.abs(q.pct).toFixed(2)}%`:'—'}</div>
    </div>`;
  }).join('');
}

function renderStockList(res){
  const c = document.getElementById('stocks-list');
  const kr = STOCKS.filter(s=>s.tag==='kr');
  const us = STOCKS.filter(s=>s.tag==='us');
  let h = '<div class="section-label">🇰🇷 국내 종목</div>';
  kr.forEach((s,i)=> h += stockRow(s, res[i]));
  h += '<div class="section-label">🇺🇸 미국 종목</div>';
  us.forEach((s,i)=> h += stockRow(s, res[kr.length+i]));
  c.innerHTML = h;
}

function stockRow(s,q){
  const isKR = s.tag==='kr';
  const up   = q&&q.chg>0, dn = q&&q.chg<0;
  const bc   = up?'up':dn?'down':'flat';
  const arr  = up?'▲':dn?'▼':'';
  return `<div class="stock-row">
    <div class="stock-icon">${s.icon}</div>
    <div class="stock-info">
      <div class="stock-ticker">${s.sym.replace('.KS','').replace('.KQ','')} <span class="market-tag tag-${s.tag}">${s.tag.toUpperCase()}</span></div>
      <div class="stock-name">${s.name}</div>
    </div>
    <div class="stock-right">
      <div class="stock-price">${q?fmtN(q.price,isKR)+'':'—'}</div>
      <div><span class="badge ${bc}">${q?`${arr}${Math.abs(q.pct).toFixed(2)}%`:'—'}</span></div>
    </div>
  </div>`;
}

function fmtN(n,isKRW){
  if(n==null)return'—';
  return isKRW
    ? n.toLocaleString('ko-KR',{maximumFractionDigits:0})
    : n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}

/* ═══════════ FX ═══════════ */
async function loadFX(){
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const d = await r.json();
    fxRates = d.rates;
    const krw = d.rates.KRW;
    document.getElementById('usdkrw').textContent = krw ? krw.toFixed(1) : '—';
    document.getElementById('usdkrw-sub').textContent = `1 USD = ${krw?.toFixed(1)||'—'} KRW`;
    document.getElementById('fx-time').textContent = d.time_last_update_utc ? '업데이트: '+new Date(d.time_last_update_utc).toLocaleString('ko-KR') : '';

    document.getElementById('fx-grid').innerHTML = FX_LIST.map(f=>{
      const base = d.rates[f.base];
      const rate = krw && base ? (krw/base) : null;
      const display = rate ? (f.per100?(rate*100).toFixed(1)+' 원':'≈ '+rate.toFixed(1)+' 원') : '—';
      return `<div class="fx-card">
        <div class="fx-pair-label">${f.flag} ${f.label}</div>
        <div class="fx-rate">${rate?(f.per100?(rate*100).toFixed(1):rate.toFixed(1)):'—'}</div>
        <div class="fx-unit">${f.per100?'100엔 기준':'KRW'}</div>
      </div>`;
    }).join('');
  } catch {
    document.getElementById('usdkrw').textContent = 'ERR';
  }
}

/* ═══════════ SETTINGS ═══════════ */
const FONT_SIZES = { xs: 85, small: 92, medium: 100, large: 108, xl: 116 };
let _savedFontSize = 'medium';
let _previewFontSize = null;
let _savedStartTab = 'economy';
let _previewStartTab = null;

function applyZoom(pct) {
  const contentEl = document.querySelector('.content');
  if (contentEl) contentEl.style.zoom = (pct / 100);
}

function previewFontSize(size) {
  _previewFontSize = size;
  applyZoom(FONT_SIZES[size] || 100);
  document.querySelectorAll('#font-size-btns .settings-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.size === size);
  });
  document.getElementById('font-size-actions').style.display =
    (size !== _savedFontSize) ? 'flex' : 'none';
}

function applyFontSize() {
  if (!_previewFontSize) return;
  _savedFontSize = _previewFontSize;
  localStorage.setItem('eco_font_size', _savedFontSize);
  document.getElementById('font-size-actions').style.display = 'none';
  _previewFontSize = null;
}

function cancelFontSize() {
  _previewFontSize = null;
  applyZoom(FONT_SIZES[_savedFontSize] || 100);
  document.querySelectorAll('#font-size-btns .settings-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.size === _savedFontSize);
  });
  document.getElementById('font-size-actions').style.display = 'none';
}

function previewStartTab(tab) {
  _previewStartTab = tab;
  document.querySelectorAll('#start-tab-btns .settings-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.start === tab);
  });
  document.getElementById('start-tab-actions').style.display =
    (tab !== _savedStartTab) ? 'flex' : 'none';
}

function applyStartTab() {
  if (!_previewStartTab) return;
  _savedStartTab = _previewStartTab;
  localStorage.setItem('eco_start_tab', _savedStartTab);
  document.getElementById('start-tab-actions').style.display = 'none';
  _previewStartTab = null;
}

function cancelStartTab() {
  _previewStartTab = null;
  document.querySelectorAll('#start-tab-btns .settings-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.start === _savedStartTab);
  });
  document.getElementById('start-tab-actions').style.display = 'none';
}

function initSettings() {
  _savedFontSize = localStorage.getItem('eco_font_size') || 'medium';
  applyZoom(FONT_SIZES[_savedFontSize] || 100);
  document.querySelectorAll('#font-size-btns .settings-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.size === _savedFontSize);
  });
  _savedStartTab = localStorage.getItem('eco_start_tab') || 'front';
  document.querySelectorAll('#start-tab-btns .settings-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.start === _savedStartTab);
  });
}

function closeModal(e){
  if(e.target.id==='modal') document.getElementById('modal').classList.remove('open');
}

/* ═══════════ DRAWER ═══════════ */
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

/* ═══════════ HOME ═══════════ */
function goHome() {
  // TODO: 랜딩 페이지 완성 후 → 별도 URL로 변경
  switchTab('front');
}

/* ═══════════ ARCHIVE ═══════════ */
const TAB_META = {
  economy:  { label: '경제', icon: '🏦', color: '#A51C30' },
  industry: { label: '산업', icon: '🏭', color: '#1D4ED8' },
  global:   { label: '국제', icon: '🌐', color: '#B45309' },
  stocks:   { label: '증권', icon: '📈', color: '#047857' },
};
let archiveEditions = null;
const editionDetailCache = {};
const EDITION_CACHE_MAX = 20;

async function loadArchive() {
  const root = document.getElementById('archive-root');
  if (!root) return;
  if (archiveEditions) { renderEditionCards(archiveEditions); return; }

  root.innerHTML = `<div class="loading-wrap"><div class="dots"><span></span><span></span><span></span></div><p style="margin-top:14px">아카이브를 불러오는 중...</p></div>`;

  try {
    const r = await fetch('/api/archive?action=editions');
    const j = await r.json();
    archiveEditions = j.items || [];
    renderEditionCards(archiveEditions);
  } catch (e) {
    root.innerHTML = `<div class="loading-wrap"><p style="color:var(--text-dim);">아카이브를 불러올 수 없습니다.</p></div>`;
  }
}

async function loadEditionDetail(id) {
  const root = document.getElementById('archive-root');
  if (!root) return;
  if (editionDetailCache[id]) { renderEditionDetail(editionDetailCache[id]); return; }
  root.innerHTML = `<div class="loading-wrap"><div class="dots"><span></span><span></span><span></span></div><p style="margin-top:14px">에디션 불러오는 중...</p></div>`;
  try {
    const r = await fetch(`/api/archive?action=edition&id=${encodeURIComponent(id)}`);
    const data = await r.json();
    const keys = Object.keys(editionDetailCache);
    if (keys.length >= EDITION_CACHE_MAX) delete editionDetailCache[keys[0]];
    editionDetailCache[id] = data;
    renderEditionDetail(data);
  } catch (e) {
    root.innerHTML = `<div class="loading-wrap"><p style="color:var(--text-dim);">에디션을 불러올 수 없습니다.</p></div>`;
  }
}

function renderEditionDetail(data) {
  const root = document.getElementById('archive-root');
  if (!root) return;

  const tabSectionsHtml = TAB_ORDER.map(tab => {
    const tabData = data.tabs?.[tab];
    if (!tabData?.summary) return '';
    const points = parseSummary(tabData.summary);
    if (!points.length) return '';
    const pointsHtml = points.map((pt, i) => `
      <div class="ed-detail-point">
        <div class="ed-detail-point-label">포인트${i+1} ${pt.label}</div>
        <div class="ed-detail-point-text">${pt.text}</div>
      </div>`).join('');
    return `<div class="ed-detail-tab">
      <div class="ed-detail-tab-header">
        <span class="ed-detail-tab-icon">${TAB_META[tab].icon}</span>
        <span class="ed-detail-tab-name">${TAB_META[tab].label}</span>
      </div>
      <div class="ed-detail-points">${pointsHtml}</div>
    </div>`;
  }).join('');

  const columnHtml = data.column?.text ? `
    <div class="ed-detail-column">
      <div class="ed-detail-column-label">칼럼</div>
      <div class="ed-detail-column-text">${data.column.text.replace(/\n/g,'<br>')}</div>
    </div>` : '';

  root.innerHTML = `
    <div class="edition-wrap">
      <button class="ed-detail-back" onclick="loadArchive()">← 목록으로</button>
      <div class="edition-page-header">
        <div class="edition-page-eyebrow">VIVA Economy Archive</div>
        <div class="edition-page-title">${formatDateKor(data.date)}</div>
        <div class="edition-page-desc">${data.period || data.slot}판</div>
      </div>
      <div class="ed-detail-tabs">${tabSectionsHtml}</div>
      ${columnHtml}
    </div>`;
}

function renderEditionCards(items) {
  const root = document.getElementById('archive-root');
  if (!root) return;

  if (!items.length) {
    root.innerHTML = `
      <div class="edition-wrap">
        <div class="edition-page-header">
          <div class="edition-page-eyebrow">VIVA Economy Archive</div>
          <div class="edition-page-title">브리핑 아카이브</div>
        </div>
        <div class="loading-wrap" style="padding:48px 0;">
          <p style="color:var(--text-dim);font-size:13px;line-height:1.8;">아직 쌓인 에디션이 없습니다.<br>매일 07:00 · 17:00에 자동 저장됩니다.</p>
        </div>
      </div>`;
    return;
  }

  const cardsHtml = items.map(ed => {
    const dateLabel = formatDateKor(ed.date);

    const tabRows = TAB_ORDER.map(tab => {
      const t = ed.tabs?.[tab];
      if (!t) return '';
      const teaser = (t.teaser || '').replace(/포인트\d+:\s*/g,'').trim();
      return `<div class="edition-tab-row">
        <span class="edition-tab-icon">${TAB_META[tab].icon}</span>
        <span class="edition-tab-name">${TAB_META[tab].label}</span>
        <span class="edition-tab-teaser">${teaser || '—'}</span>
      </div>`;
    }).join('');

    const columnRow = ed.columnTeaser ? `
      <div class="edition-column-row">
        <span class="edition-column-label">칼럼</span>
        <span class="edition-column-teaser">"${ed.columnTeaser}"</span>
      </div>` : '';

    return `<div class="edition-card" onclick="loadEditionDetail('${ed.id}')" style="cursor:pointer;">
      <div class="edition-card-header">
        <div class="edition-card-date">${dateLabel}</div>
        <div class="edition-card-badge">${ed.period || ed.slot}판</div>
      </div>
      <div class="edition-tab-list">${tabRows}</div>
      ${columnRow ? `<div class="edition-divider"></div>${columnRow}` : ''}
    </div>`;
  }).join('');

  root.innerHTML = `
    <div class="edition-wrap">
      <div class="edition-page-header">
        <div class="edition-page-eyebrow">VIVA Economy Archive</div>
        <div class="edition-page-title">브리핑 아카이브</div>
        <div class="edition-page-desc">매일 07:00 · 17:00 자동 저장 · ${items.length}개 에디션</div>
      </div>
      <div class="edition-list">${cardsHtml}</div>
    </div>`;
}

function drawerNav(tab) {
  closeDrawer();
  switchTab(tab);
}

function updateDrawerActive(tab) {
  document.querySelectorAll('[data-drawer-tab]').forEach(el => {
    el.classList.toggle('active', el.dataset.drawerTab === tab);
  });
}
