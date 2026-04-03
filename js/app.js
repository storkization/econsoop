/* ═══════════ DEV MODE ═══════════ */
const DEV_MODE = new URLSearchParams(window.location.search).get('dev') === 'true';


const SUMMARY_QUERIES = {
  economy: ['한국은행 금리', '원달러 환율 외환', '코스피 증시 금융시장', '물가 인플레이션 소비', '수출 무역 경상수지', '가계부채 대출', '경제 오늘 주요뉴스'],
  industry:['반도체 전자', '자동차 배터리 전기차', '바이오 헬스 제약', '건설 부동산', '경영 재계 M&A'],
  global:  ['미국 연준 Fed 관세 무역', '중국 경제 위안화 무역분쟁', '일본 엔화 닛케이 일본은행', '유럽 ECB 유로존 독일', '국제유가 OPEC 중동 에너지', '국제경제 오늘 주요뉴스'],
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

const TAB_LABEL = { economy:'경제', industry:'산업', global:'국제' };

/* ═══════════ CACHE VERSION ═══════════ */
const CACHE_VERSION = 'v112';
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
    `<span style="color:#1A7A45;font-weight:700;font-size:11px;">${days[d.getDay()]}요일</span> · <span style="font-size:11px;">${months[d.getMonth()]} ${d.getDate()}일, ${d.getFullYear()}</span>`;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 앱 시작 = 저장된 시작 탭 로드
  const startTab = localStorage.getItem('eco_start_tab') || 'economy';
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
function openLink(u){ if(u) window.open(u,'_blank'); }
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

  const isNewsTab = ['economy','industry','global'].includes(id);
  if (isNewsTab && !summaryCache[id]) genTabSummary(id);
  if (id==='stocks') loadStocks();
  if (id==='fx' && !fxRates) loadFX();
  if (id==='breaking') loadBreaking();
  if (id==='newsroom') renderNewsroom();
  if (id==='column') loadColumnTab();
  if (id==='archive') loadArchive();
}


/* ═══════════ 종합 생성 ═══════════ */
const LOADING_MSGS = [
  '오늘의 핵심 이슈를 짚어보고 있어요...',
  '시장 흐름을 분석하고 있습니다...',
  '글로벌 경제 신호를 읽고 있어요...',
  '전문가 관점으로 뉴스를 해석 중입니다...',
  '오늘 꼭 알아야 할 이슈를 추리는 중입니다...',
  '뉴스의 행간을 읽고 있습니다...',
  'Shawn의 눈으로 시장을 훑고 있어요...',
  'Shawn이 오늘의 한 줄을 고르고 있습니다...',
  "Shawn's AI가 판단을 내리고 있습니다...",
  'Shawn이 경제 숲을 걷고 있는 중이에요...',
];

// 경제 퀴즈 (50문항)
const QUIZ_LIST = [
  // ── 환율 (8) ──
  { q:'원/달러 환율이 오르면, 원화의 가치는?', a:'하락 (원화 약세)', hint:'환율 상승 = 달러 1개에 더 많은 원화가 필요하다는 뜻이에요 💱' },
  { q:'한국은행이 기준금리를 올리면, 원/달러 환율은?', a:'하락 (원화 강세)', hint:'한국 금리가 높아지면 외국 자금이 유입돼 원화 수요가 늘어요 🏦' },
  { q:'미국 연준이 금리를 올리면, 원/달러 환율은?', a:'상승 (원화 약세)', hint:'미국 금리가 높아지면 달러 자산으로 자금이 이동해요 🇺🇸' },
  { q:'수출이 크게 늘면, 원/달러 환율은?', a:'하락 (원화 강세)', hint:'수출 대금(달러)을 원화로 바꾸면서 원화 수요가 늘어나요 📦' },
  { q:'원화 강세일 때 유리한 쪽은?', a:'수입업체·해외여행자', hint:'같은 원화로 더 많은 달러를 살 수 있으니까요 ✈️' },
  { q:'원화 약세일 때 유리한 쪽은?', a:'수출기업', hint:'달러로 받은 수출 대금을 원화로 바꾸면 더 많아져요 🚢' },
  { q:'환율이 급등할 때, 한국은행이 하는 조치는?', a:'외환시장 개입 (달러 매도)', hint:'보유 달러를 팔아 환율 상승을 억제하는 거예요 🛡' },
  { q:'"안전자산 선호" 현상이 나타나면, 원/달러 환율은?', a:'상승 (원화 약세)', hint:'불확실할 때 투자자들이 달러·미국채로 이동해요 🏃' },
  // ── 금리 (8) ──
  { q:'물가가 빠르게 오를 때, 중앙은행은 보통 어떤 조치를 취할까요?', a:'기준금리 인상', hint:'금리를 올려 소비·투자를 줄이고 물가를 안정시켜요 🔧' },
  { q:'기준금리가 오르면, 시중 대출 금리는?', a:'함께 상승', hint:'기준금리는 모든 금리의 출발점이에요 📊' },
  { q:'기준금리가 오르면, 주식시장에는 일반적으로?', a:'하락 압력', hint:'돈이 예금·채권으로 이동하고 기업 이자 부담이 커져요 📉' },
  { q:'채권 금리가 오르면, 채권 가격은?', a:'하락 (반비례 관계)', hint:'새 채권이 더 높은 이자를 주니 기존 채권 매력이 떨어져요 ⚖️' },
  { q:'기준금리를 내리면, 시중에 돈은?', a:'늘어남 (유동성 증가)', hint:'대출이 싸지니 사람들이 돈을 더 빌려요 💧' },
  { q:'"금리 동결"이란?', a:'기준금리를 올리지도 내리지도 않는 것', hint:'경제 상황을 좀 더 지켜보겠다는 신호예요 ⏸' },
  { q:'한국은행 금통위는 무엇을 결정하는 기구인가요?', a:'기준금리', hint:'금융통화위원회 — 한국은행의 최고 의사결정 기구예요 🏛' },
  { q:'실질금리란?', a:'명목금리에서 물가상승률을 뺀 것', hint:'금리 3%인데 물가 4% 오르면, 실질금리는 -1%예요 🧮' },
  // ── 주식·증시 (7) ──
  { q:'외국인 투자자가 한국 주식을 대량 매수하면, 원화에는?', a:'강세 요인', hint:'달러를 원화로 바꿔서 투자하니까 원화 수요가 늘어요 📈' },
  { q:'코스피 지수란?', a:'한국 유가증권시장 상장사의 시가총액 지수', hint:'한국 증시의 "체온계" 같은 대표 지표예요 🇰🇷' },
  { q:'PER(주가수익비율)이 높다는 건?', a:'현재 이익 대비 주가가 비싸다는 의미', hint:'PER = 주가 ÷ 주당순이익. 높을수록 고평가 신호예요 🔍' },
  { q:'공매도란?', a:'주식을 빌려서 팔고, 나중에 싸게 사서 갚는 전략', hint:'주가 하락을 예상할 때 사용하는 투자 방법이에요 📉' },
  { q:'"시가총액"이란?', a:'주가 × 발행 주식 수', hint:'그 회사의 시장에서의 전체 가치를 나타내요 💰' },
  { q:'IPO란?', a:'기업공개 — 처음으로 주식시장에 상장하는 것', hint:'비상장 기업이 주식을 일반에 팔아 자금을 조달하는 거예요 🎉' },
  { q:'코스닥과 코스피의 차이는?', a:'코스닥은 중소·벤처, 코스피는 대기업 중심', hint:'코스닥은 기술주가 많고, 코스피는 삼성전자 같은 대형주예요 🏢' },
  // ── 물가·인플레이션 (5) ──
  { q:'CPI(소비자물가지수)가 전년 대비 5% 올랐다면?', a:'1년 전보다 물건값이 평균 5% 비싸졌다는 뜻', hint:'CPI는 장바구니 물가 변화를 측정하는 대표 지표예요 🛒' },
  { q:'스태그플레이션이란?', a:'경기 침체와 물가 상승이 동시에 오는 상황', hint:'경기가 나쁜데 물가까지 오르는 최악의 조합이에요 ⚠️' },
  { q:'디플레이션은 좋은 걸까요?', a:'아니요 — 소비 위축과 경기 침체를 유발', hint:'물가가 떨어지면 "더 싸질 때 사자"며 소비가 멈춰요 🧊' },
  { q:'"근원물가"란?', a:'변동 큰 식품·에너지를 제외한 물가', hint:'일시적 요인을 빼고 물가의 기본 추세를 보는 지표예요 🎯' },
  { q:'물가가 오르면, 현금의 가치는?', a:'떨어짐', hint:'같은 만 원으로 살 수 있는 게 줄어드니까요 💸' },
  // ── 중앙은행·통화정책 (6) ──
  { q:'한국은행의 영문 약칭은?', a:'BOK (Bank of Korea)', hint:'우리나라 기준금리를 결정하는 중앙은행이에요 🏛' },
  { q:'미국 연준(Fed)이 하는 가장 중요한 일은?', a:'미국 기준금리(연방기금금리) 결정', hint:'전 세계 금융시장에 가장 큰 영향을 미치는 기관이에요 🌍' },
  { q:'"매파적(Hawkish)" 발언이란?', a:'금리 인상을 선호하는 강경한 입장', hint:'물가 안정을 최우선으로 보는 입장. 반대는 비둘기파 🦅' },
  { q:'양적완화(QE)란?', a:'중앙은행이 채권을 사서 시중에 돈을 푸는 정책', hint:'금리 인하만으론 부족할 때 쓰는 비상 수단이에요 💵' },
  { q:'양적긴축(QT)이란?', a:'중앙은행이 보유 채권을 줄여 시중 돈을 회수하는 것', hint:'양적완화의 반대. 풀었던 돈을 다시 거둬들이는 거예요 🧹' },
  { q:'ECB는 어떤 기관인가요?', a:'유럽중앙은행 (European Central Bank)', hint:'유로존 20개국의 통화정책을 총괄하는 중앙은행이에요 🇪🇺' },
  // ── 무역·국제 (5) ──
  { q:'경상수지가 흑자라는 건?', a:'해외에서 벌어들인 돈이 나간 돈보다 많다는 뜻', hint:'수출·서비스·투자 등을 모두 합산한 대외 수지예요 📦' },
  { q:'미국이 관세를 올리면, 한국 수출기업에는?', a:'부정적 (가격 경쟁력 하락)', hint:'수출품 가격이 올라 미국 내 판매가 줄어들 수 있어요 🚢' },
  { q:'"무역수지"란?', a:'수출액에서 수입액을 뺀 것', hint:'플러스면 무역 흑자, 마이너스면 무역 적자예요 ⚖️' },
  { q:'국제유가가 오르면, 한국 경제에는?', a:'부정적 (수입 비용 증가)', hint:'한국은 원유를 거의 전량 수입하는 에너지 수입국이에요 ⛽' },
  { q:'OPEC이란?', a:'석유수출국기구 — 원유 생산량을 조절하는 카르텔', hint:'중동 산유국 중심으로 유가에 큰 영향을 미쳐요 🛢' },
  // ── 부동산·가계 (4) ──
  { q:'기준금리가 오르면, 부동산 시장에는?', a:'하락 압력', hint:'대출 이자가 늘어 매수 여력이 줄고 수요가 감소해요 🏠' },
  { q:'LTV(주택담보대출비율)란?', a:'집값 대비 대출 가능한 최대 비율', hint:'LTV 70%면 10억 집에 최대 7억까지 빌릴 수 있어요 🔑' },
  { q:'DSR(총부채원리금상환비율)이란?', a:'연소득 대비 전체 대출 원리금 상환 비율', hint:'DSR이 높으면 소득 대비 빚 갚는 부담이 크다는 뜻이에요 📋' },
  { q:'가계부채가 늘면 경제에 어떤 위험이 있나요?', a:'소비 위축 + 금융 불안정', hint:'빚 갚느라 소비를 못 하고, 금리 오르면 연체 위험이 커져요 ⚡' },
  // ── 기본 개념 (7) ──
  { q:'GDP(국내총생산)란?', a:'한 나라에서 일정 기간 생산된 재화·서비스의 총 가치', hint:'나라 경제의 규모와 성장률을 보여주는 대표 지표예요 🌍' },
  { q:'GDP가 2분기 연속 감소하면?', a:'기술적 경기 침체(리세션)', hint:'경제가 쪼그라들고 있다는 공식적 신호예요 📉' },
  { q:'"유동성이 풍부하다"는 무슨 뜻?', a:'시중에 돈이 많이 풀려 있다는 의미', hint:'투자·소비가 활발해지지만 물가 상승 위험도 있어요 💧' },
  { q:'"경기 연착륙"이란?', a:'급격한 침체 없이 경제가 서서히 안정되는 것', hint:'반대말은 "경착륙" — 갑자기 경제가 꺾이는 거예요 🛬' },
  { q:'"블랙스완"이란?', a:'예측 불가능하고 파급력이 큰 사건', hint:'코로나, 리먼 브라더스 파산 같은 충격적 사건을 말해요 🦢' },
  { q:'선행지표란?', a:'경기 변동보다 먼저 움직이는 경제 지표', hint:'건축 허가, 주가, 소비자 기대 등이 대표적이에요 🔮' },
  { q:'"디커플링"이란?', a:'두 시장이 같이 움직이다가 방향이 갈라지는 현상', hint:'예: 미국 증시는 오르는데 한국 증시는 내리는 경우 🔀' },
];

let _loadingInterval = null;
let _briefingController = null;
let _currentQuiz = null; // 현재 로딩 중 표시 중인 퀴즈
let _aiStepIndex = 0;    // AI 단계 진행 인덱스 (0~5)
let _aiStepTimers = [];   // AI 단계 자동 전진 타이머들

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function setLoadingMsg(tab, phase, count = null) {
  const card = document.getElementById(`${tab}-summary-card`);
  if (!card) return;
  if (_loadingInterval) { clearInterval(_loadingInterval); _loadingInterval = null; }
  _aiStepTimers.forEach(t => clearTimeout(t));
  _aiStepTimers = [];

  // 퀴즈는 뉴스 수집 시작 시 고정
  if (!_currentQuiz) {
    _currentQuiz = QUIZ_LIST[Math.floor(Math.random() * QUIZ_LIST.length)];
  }

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
    { label:'씨앗 심기',   icon:'🌰', desc:'뉴스를 수집하는 중이에요' },
    { label:'새싹 돋기',   icon:'🌱', desc:'AI가 헤드라인을 읽고 있어요' },
    { label:'줄기 성장',   icon:'🌿', desc:'핵심 이슈를 분석하는 중이에요' },
    { label:'가지 뻗기',   icon:'🪵', desc:'시장 흐름을 파악하는 중이에요' },
    { label:'잎 피우기',   icon:'🍃', desc:'투자 포인트를 정리하는 중이에요' },
    { label:'경제숲 완성', icon:'🌲', desc:'브리핑을 마무리하는 중이에요' },
  ];

  function renderLoading() {
    const ci = _aiStepIndex; // current index (0~6, 6=all done)
    const totalSteps = ALL_STEPS.length;

    // 나무 성장 시각화
    const trunkHeight = Math.min(ci / (totalSteps - 1), 1) * 100; // 0~100%
    const trunkColor = ci >= totalSteps ? '#1A7A45' : '#8B6914';

    // 단계별 아이콘 + 라벨 (좌우 교대 배치)
    const stepLabels = ALL_STEPS.map((s, idx) => {
      const done = idx < ci;
      const active = idx === ci;
      const pct = (idx / (totalSteps - 1)) * 100;
      const side = idx % 2 === 0 ? 'right' : 'left';
      const color = done ? '#1A7A45' : active ? '#1A7A45' : '#C4C9CF';
      const weight = (done || active) ? '700' : '500';
      const opacity = done ? '1' : active ? '1' : '0.5';
      const posStyle = side === 'right'
        ? 'left:calc(50% + 18px);text-align:left;'
        : 'right:calc(50% + 18px);text-align:right;';
      const pulse = active ? 'animation:pulse 1s infinite;' : '';
      return `<div style="position:absolute;bottom:${pct}%;${posStyle}transform:translateY(50%);white-space:nowrap;display:flex;align-items:center;gap:5px;opacity:${opacity};transition:all 0.5s ease;${side === 'left' ? 'flex-direction:row-reverse;' : ''}">
        <span style="font-size:14px;${pulse}">${s.icon}</span>
        <div style="display:flex;flex-direction:column;${side === 'left' ? 'align-items:flex-end;' : 'align-items:flex-start;'}gap:1px;">
          <span style="font-size:9px;font-weight:${weight};color:${color};font-family:var(--font-sans);letter-spacing:-0.2px;">${s.label}</span>
          ${active ? `<span style="font-size:9px;color:#1A7A45;font-weight:500;font-family:var(--font-sans);opacity:0.85;">${s.desc}</span>` : ''}
        </div>
      </div>`;
    }).join('');

    // 나뭇잎 (step 4+)
    const leaves = ci >= 4 ? `
      <div style="position:absolute;top:2%;left:calc(50% - 22px);width:12px;height:14px;background:radial-gradient(ellipse,#2DA55E,#1A7A45);border-radius:50% 50% 50% 0;transform:rotate(-60deg);opacity:0.7;animation:leafAppear 0.6s ease-out forwards;"></div>
      <div style="position:absolute;top:8%;right:calc(50% - 24px);width:10px;height:12px;background:radial-gradient(ellipse,#4ADE80,#22914F);border-radius:50% 50% 50% 0;transform:rotate(30deg);opacity:0.6;animation:leafAppear 0.6s ease-out 0.2s forwards;"></div>
      <div style="position:absolute;top:15%;left:calc(50% - 18px);width:9px;height:11px;background:radial-gradient(ellipse,#2DA55E,#1A7A45);border-radius:50% 50% 50% 0;transform:rotate(-30deg);opacity:0.5;animation:leafAppear 0.6s ease-out 0.4s forwards;"></div>` : '';

    // 가지 (step 3+)
    const branches = ci >= 3 ? `
      <div style="position:absolute;bottom:55%;left:50%;width:20px;height:3px;background:linear-gradient(90deg,#1A7A45,#2DA55E);border-radius:1.5px;transform-origin:left center;animation:branchGrow 0.6s ease-out forwards;"></div>
      <div style="position:absolute;bottom:45%;right:50%;width:18px;height:3px;background:linear-gradient(-90deg,#1A7A45,#2DA55E);border-radius:1.5px;transform-origin:right center;animation:branchGrow 0.6s ease-out 0.2s forwards;"></div>
      <div style="position:absolute;bottom:70%;left:50%;width:14px;height:2px;background:linear-gradient(90deg,#22914F,#4ADE80);border-radius:1px;transform-origin:left center;animation:branchGrow 0.6s ease-out 0.4s forwards;"></div>` : '';

    // 완성 시 빛 효과
    const glow = ci >= totalSteps ? `
      <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:60px;height:60px;background:radial-gradient(circle,rgba(26,122,69,0.15) 0%,transparent 70%);border-radius:50%;animation:pulse 2s infinite;"></div>` : '';

    const treeViz = `
      <div style="position:relative;height:140px;margin:16px auto 20px;width:200px;">
        ${glow}
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:4px;height:${trunkHeight}%;background:linear-gradient(0deg,${trunkColor} 0%,#1A7A45 100%);border-radius:2px;transition:height 1.5s cubic-bezier(0.34,1.56,0.64,1);"></div>
        ${branches}
        ${leaves}
        ${stepLabels}
        <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:24px;height:4px;background:rgba(139,105,20,0.2);border-radius:50%;"></div>
      </div>`;

    const quizCard = _currentQuiz ? `
      <div style="background:linear-gradient(135deg,#F0FDF4 0%,#FAFFFD 100%);border:1.5px solid rgba(26,122,69,0.2);border-radius:12px;padding:14px 16px;margin:0 0 16px;text-align:left;position:relative;">
        <div style="position:absolute;top:-6px;right:8px;font-size:12px;opacity:0.5;">🌿</div>
        <div style="font-size:10px;font-weight:700;color:#16A34A;letter-spacing:0.5px;margin-bottom:6px;">🌱 오늘의 퀴즈 — 경제숲 완성 시 정답 공개!</div>
        <div style="font-size:13px;font-weight:700;color:#111827;line-height:1.5;">${_currentQuiz.q}</div>
      </div>` : '';

    card.innerHTML = `
      <div style="padding:24px 20px;background:#FFFFFF;border-radius:16px;box-shadow:0 2px 16px rgba(13,51,32,0.06);">
        <div style="font-family:var(--font-serif);font-size:15px;font-weight:900;color:var(--text);letter-spacing:-0.3px;margin-bottom:4px;text-align:center;">Money Forest 데일리 브리핑</div>
        ${treeViz}
        ${quizCard}
        <div style="text-align:center;">
          <div class="dots" style="margin-bottom:10px;"><span></span><span></span><span></span></div>
          <div style="color:var(--text-muted);font-size:12px;font-weight:500;">${msgs[msgIdx % msgs.length]}</div>
        </div>
        <div style="text-align:center;margin-top:20px;">
          <div style="font-size:10px;color:#9CA3AF;font-family:var(--font-mono);margin-bottom:12px;">뉴스 양에 따라 10~30초 정도 걸릴 수 있어요</div>
          <button onclick="cancelBriefing('${tab}')"
            style="background:transparent;border:1.5px solid rgba(26,122,69,0.15);border-radius:8px;
                   padding:7px 18px;font-size:11px;font-weight:600;color:var(--text-dim);
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

function showQuizAnswer() {
  if (!_currentQuiz) return;
  const quiz = _currentQuiz;
  _currentQuiz = null;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9994;
    background:rgba(13,51,32,0.5);
    display:flex;align-items:center;justify-content:center;
    max-width:480px;margin:0 auto;
    animation:fadeIn 0.2s ease;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background:#fff;border-radius:16px;
    padding:24px;max-width:300px;width:85%;
    box-shadow:0 12px 40px rgba(13,51,32,0.25);
    animation:slideUpBounce 0.35s ease-out;
    font-family:var(--font-sans);text-align:center;
  `;
  card.innerHTML = `
    <div style="font-size:32px;margin-bottom:12px;">🌲</div>
    <div style="font-size:10px;font-weight:700;color:#16A34A;letter-spacing:0.5px;margin-bottom:10px;">경제숲 퀴즈 정답!</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.5;">${quiz.q}</div>
    <div style="font-size:15px;font-weight:800;color:var(--accent);margin-bottom:6px;">→ ${quiz.a}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:18px;line-height:1.5;">${quiz.hint}</div>
    <button onclick="this.closest('div[style*=fixed]').remove()"
      style="background:linear-gradient(135deg,#1A7A45,#22914F);color:#fff;border:none;border-radius:10px;
             padding:10px 32px;font-size:13px;font-weight:700;
             font-family:var(--font-sans);cursor:pointer;">
      확인
    </button>
  `;
  overlay.appendChild(card);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function stopLoadingMsg() {
  if (_loadingInterval) { clearInterval(_loadingInterval); _loadingInterval = null; }
  _aiStepTimers.forEach(t => clearTimeout(t));
  _aiStepTimers = [];
}

function cancelBriefing(tab) {
  stopLoadingMsg();
  if (_briefingController) { _briefingController.abort(); _briefingController = null; }
  _currentQuiz = null;
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
by. Shawn Kim`
};

/* ═══════════ 스케줄 캐시 헬퍼 ═══════════ */
function getLastScheduleTime() {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hm = kst.getHours() * 100 + kst.getMinutes();
  const schedules = [700, 1700];
  let lastHm = null;
  for (const s of schedules) {
    if (hm >= s) lastHm = s;
  }
  if (lastHm === null) {
    const prev = new Date(kst);
    prev.setDate(prev.getDate() - 1);
    prev.setHours(17, 0, 0, 0);
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
        const result = { summary: cf.summary, oneliner: '', footnotes: cf.footnotes || '', headline: cf.headline || '', subheading: cf.subheading || '', heading2: cf.heading2 || '', subheading2: cf.subheading2 || '', heading3: cf.heading3 || '', subheading3: cf.subheading3 || '', heading4: cf.heading4 || '', subheading4: cf.subheading4 || '', columnHook: cf.columnHook || '', topNews: [] };
        summaryCache[tab] = result;
        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(cacheTimeKey, cf.created_at.toString());
        // 로딩 애니메이션 5초 후 렌더링 → 렌더 완료 후 뉴스 백그라운드 로딩
        setLoadingMsg(tab, 'fast');
        setTimeout(async () => {
          renderTabSummary(tab, result);
          updateFrontPreview(tab, result.summary);
          // 뉴스 목록 백그라운드 로딩 (렌더 완료 후 시작)
          const allItems = [];
          for (const q of SUMMARY_QUERIES[tab]) {
            try {
              const r = await fetch(`/api/news?query=${encodeURIComponent(q)}&display=7`);
              const j = await r.json();
              if (j.items) allItems.push(...j.items);
            } catch(e) {}
          }
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
    if (newsElLoading) newsElLoading.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:16px 4px;">
        <div class="dots" style="transform:scale(0.7);transform-origin:left;"><span></span><span></span><span></span></div>
        <span style="font-size:12px;color:#6B7280;">AI가 핵심 뉴스를 선별하는 중...</span>
      </div>`;
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
    showQuizAnswer();
    renderTabSummary(tab, result);
    updateFrontPreview(tab, result.summary);


  } catch(err) {
    console.error('[BRIEFING ERROR]', err.message, err);
    stopLoadingMsg();
    const card = document.getElementById(`${tab}-summary-card`);
    if (card) card.innerHTML = `
      <div class="status-card">
        <div class="status-card-icon">🌲</div>
        <div class="status-card-title">잠시 점검 중입니다</div>
        <div class="status-card-desc">더 나은 브리핑을 위해 숲을 정비하고 있어요.<br>잠시 후 다시 확인해 주세요.</div>
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
    const schedules = [700,1700];
    const scheduleLabels = {700:'07:00',1700:'17:00'};
    const kst = new Date(d.toLocaleString('en-US',{timeZone:'Asia/Seoul'}));
    const hm = kst.getHours()*100+kst.getMinutes();
    let slotHm = null;
    for (const s of schedules) { if (hm >= s) slotHm = s; }
    const slotLabel = slotHm ? scheduleLabels[slotHm] : null;
    const dateStr = `${d.getMonth()+1}월 ${d.getDate()}일 · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} 기준`;
    const slotBadge = slotLabel
      ? `<span style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:#fff;background:#1A7A45;padding:2px 7px;border-radius:10px;letter-spacing:0.5px;">${slotLabel} 브리핑</span>`
      : '';

    // 4포인트 그라데이션 카드 (배경 더 연하게)
    const CARDS = [
      { label:'핵심 이슈', color:'#1A7A45', bg:'linear-gradient(135deg,#F0FAF5 0%,#FAFFFD 100%)', shadow:'rgba(26,122,69,0.07)' },
      { label:'배경',      color:'#6B21A8', bg:'linear-gradient(135deg,#F9F0FF 0%,#FEF8FF 100%)', shadow:'rgba(107,33,168,0.06)' },
      { label:'시장 영향', color:'#1D4ED8', bg:'linear-gradient(135deg,#F3F8FF 0%,#F8FBFF 100%)', shadow:'rgba(29,78,216,0.06)' },
      { label:'투자 전략', color:'#B45309', bg:'linear-gradient(135deg,#FFFCF3 0%,#FFFEF9 100%)', shadow:'rgba(180,83,9,0.06)' },
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

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:6px;">
        <div>
          <div style="font-family:var(--font-serif);font-size:14px;font-weight:900;color:var(--text);letter-spacing:-0.3px;">Money Forest 데일리 브리핑</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono);">${dateStr}</div>
        </div>
        ${slotBadge}
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
          <div style="font-size:18px;font-weight:900;color:#111;line-height:1.35;margin-bottom:5px;font-family:var(--font-sans);letter-spacing:-0.3px;">${hd.h}</div>
          ${hd.s ? `<div style="font-size:12px;font-weight:700;color:${cfg.color};line-height:1.5;margin-bottom:12px;font-family:var(--font-sans);">${hd.s}</div>` : ''}
        ` : '';
        return `<div style="background:${cfg.bg};border-radius:20px;padding:18px 18px 16px;margin-bottom:10px;box-shadow:0 4px 20px ${cfg.shadow};">
          <div style="display:inline-flex;align-items:center;gap:5px;background:${cfg.color};color:#fff;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;margin-bottom:12px;letter-spacing:-0.1px;">${cfg.label}</div>
          ${headlinePart}
          <div style="font-size:14px;line-height:1.85;color:#111111;font-family:var(--font-sans);">${bodyHtml}</div>
          ${fnHtml}
        </div>`;
      }).join('')}
    `;
  }

  // 프리미엄 칼럼 배너 (칼럼 탭으로 연결)
  const columnEl = document.getElementById(`${tab}-column`);
  if (columnEl) {
    const hook = result.columnHook || `오늘의 ${TAB_LABEL[tab]} 심층 분석`;
    columnEl.innerHTML = `
      <div onclick="openColumnTab('${tab}')"
        style="margin:4px 0 14px;background:linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#1A365D 100%);
               border-radius:14px;padding:16px 18px;cursor:pointer;box-shadow:0 4px 20px rgba(15,23,42,0.22);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="font-size:13px;">📰</span>
            <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);font-family:var(--font-mono);letter-spacing:0.5px;">오늘의 ${TAB_LABEL[tab]} 칼럼 · by Shawn Kim</span>
          </div>
          <span style="font-size:10px;font-weight:700;color:#FCD34D;background:rgba(252,211,77,0.12);padding:3px 9px;border-radius:20px;letter-spacing:0.5px;white-space:nowrap;">💎 PREMIUM</span>
        </div>
        <div style="font-size:14px;font-weight:800;color:#FFFFFF;line-height:1.45;letter-spacing:-0.3px;">${hook}</div>
        <div style="margin-top:10px;font-size:10px;font-weight:600;color:rgba(255,255,255,0.4);font-family:var(--font-mono);letter-spacing:0.5px;">TAP TO READ FULL COLUMN →</div>
      </div>`;
  }
  const newsEl = document.getElementById(`${tab}-summary-news`);
  if (newsEl) {
    if (!result.topNews || !result.topNews.length) {
      newsEl.innerHTML = '';
    } else {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      let h = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;font-weight:800;letter-spacing:0.8px;color:#1A7A45;font-family:var(--font-mono);">AI PICK</span>
            <span style="font-size:11px;color:#6B7280;font-family:var(--font-sans);">오늘의 핵심 뉴스</span>
          </div>
          <span style="font-size:10px;color:#9CA3AF;font-family:var(--font-mono);">${timeStr} 기준 · ${result.topNews.length}건</span>
        </div>
        <div style="border-radius:var(--radius);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);border:1px solid rgba(26,122,69,0.1);">`;
      result.topNews.forEach((it, i) => {
        const isLast = i === result.topNews.length - 1;
        h += `<div class="news-item" style="${!isLast ? 'border-bottom:1px solid rgba(0,0,0,0.05);' : ''}">
          <div class="news-num" style="color:#1A7A45;font-weight:800;">${pad(i+1)}</div>
          <div class="news-body" onclick="openLink('${esc(it.link)}')">
            <div class="news-title">${it.title}</div>
            <div class="news-meta">
              <span style="background:#E8F5EE;color:#1A7A45;padding:1px 6px;border-radius:4px;font-weight:600;">${it.source}</span>
              <span>${ago(it.date)}</span>
            </div>
          </div>
        </div>`;
      });
      h += `</div>`;
      newsEl.innerHTML = h;
    }
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
        <div style="font-size:10px;font-family:var(--font-mono);color:var(--text-dim);margin-top:3px;letter-spacing:0.3px;">by Shawn Kim · Daily Editorial</div>
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
  if (columnCache[tab]) { renderColumn(tab, columnCache[tab], bodyEl); return; }
  const savedCol = localStorage.getItem(`eco_column_${tab}`);
  const savedColTime = localStorage.getItem(`eco_column_time_${tab}`);
  if (savedCol && savedColTime && Number(savedColTime) >= getLastScheduleTime()) {
    columnCache[tab] = savedCol;
    renderColumn(tab, savedCol, bodyEl);
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
    renderColumn(tab, j.column, bodyEl);
  } catch(err) {
    bodyEl.innerHTML = `<div class="status-card">
      <div style="font-size:13px;color:var(--red);margin-bottom:12px;">⚠️ ${err.message}</div>
      <button class="retry-btn" onclick="loadColumnTab()">🔄 다시 시도</button>
    </div>`;
  }
}

async function loadColumn(tab) {
  const body = document.getElementById(`${tab}-column-body`);
  const btn  = document.getElementById(`${tab}-column-btn`);
  if (!body) return;

  // 토글
  if (body.style.display === 'block') {
    body.style.display = 'none';
    btn.querySelector('span:last-child').textContent = '▼';
    return;
  }

  body.style.display = 'block';
  btn.querySelector('span:last-child').textContent = '▲';

  // 개발모드: 더미 칼럼
  if (DEV_MODE) {
    renderColumn(tab, DEV_DUMMY.column);
    return;
  }

  // 캐시 확인 (메모리 → localStorage, 스케줄 기반)
  if (columnCache[tab]) {
    renderColumn(tab, columnCache[tab]);
    return;
  }
  const colCacheKey = `eco_column_${tab}`;
  const colCacheTimeKey = `eco_column_time_${tab}`;
  const savedCol = localStorage.getItem(colCacheKey);
  const savedColTime = localStorage.getItem(colCacheTimeKey);
  if (savedCol && savedColTime) {
    const lastSchedule = getLastScheduleTime();
    if (Number(savedColTime) >= lastSchedule) {
      columnCache[tab] = savedCol;
      renderColumn(tab, savedCol);
      return;
    }
  }

  // 로딩
  body.innerHTML = `
    <div class="status-card">
      <div class="dots" style="margin-bottom:12px;"><span></span><span></span><span></span></div>
      <div class="status-card-desc" style="margin-bottom:0;">칼럼 작성 중...</div>
    </div>`;

  const cached = summaryCache[tab];
  if (!cached?.summary) {
    body.innerHTML = `<div class="status-card"><div class="status-card-desc" style="color:var(--red);margin-bottom:0;">브리핑을 먼저 생성해주세요.</div></div>`;
    return;
  }

  try {
    const res = await fetch('/api/column', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: cached.summary, oneliner: cached.oneliner, label: TAB_LABEL[tab] }),
      signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 55000); return c.signal; })()
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || `오류 ${res.status}`);
    columnCache[tab] = j.column;
    localStorage.setItem(colCacheKey, j.column);
    localStorage.setItem(colCacheTimeKey, Date.now());
    renderColumn(tab, j.column);
  } catch(err) {
    body.innerHTML = `
      <div class="status-card">
        <div style="font-size:13px;color:var(--red);margin-bottom:12px;">⚠️ ${err.message}</div>
        <button class="retry-btn" onclick="columnCache['${tab}']=null;loadColumn('${tab}')">🔄 다시 시도</button>
      </div>`;
  }
}

function renderColumn(tab, text, bodyEl) {
  const body = bodyEl || document.getElementById(`${tab}-column-body`);
  if (!body) return;

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

  body.innerHTML = `<div class="column-wrap">${html}</div>`;
}

function updateFrontPreview(tab, summary) {
  const el = document.getElementById(`front-${tab}-preview`);
  if (!el || !summary) return;
  const firstLine = summary.split('\n').map(l=>l.replace(/^줄\d+:\s*/,'').trim()).find(l=>l.length>0) || '';
  el.innerHTML = `<span style="font-size:14px;color:var(--text);line-height:1.6;">${firstLine} →</span>`;
}

/* ═══════════ 서브칩 뉴스 ═══════════ */

function renderNewsList(items, el) {
  if (!items || !items.length) {
    el.innerHTML = `<div class="loading-wrap"><p>뉴스를 찾을 수 없습니다.</p></div>`;
    return;
  }
  let h = `<div class="section-label">주요 뉴스</div>`;
  items.forEach((it, i) => {
    h += `<div class="news-item">
      <div class="news-num">${pad(i+1)}</div>
      <div class="news-body" onclick="openLink('${esc(it.link)}')">
        <div class="news-title">${it.title}</div>
        <div class="news-meta"><span>${it.source}</span><span>${ago(it.date)}</span></div>
      </div>
    </div>`;
  });
  el.innerHTML = h;
}


/* ═══════════ BREAKING NEWS ═══════════ */
let breakingCache = null;
let breakingLoaded = false;

async function loadBreaking(force = false) {
  if (breakingLoaded && !force) return;

  const el = document.getElementById('breaking-news-list');
  el.innerHTML = `<div class="loading-wrap"><div class="dots"><span></span><span></span><span></span></div><p style="margin-top:14px">속보를 불러오는 중...</p></div>`;

  const queries = ['속보 경제', '속보 금융 증시', '속보 환율 금리'];
  const allItems = [];

  const results = await fetchInBatches(queries, async q => {
    try {
      const r = await fetch(`/api/news?query=${encodeURIComponent(q)}&display=15&type=general`,
        { signal: (function(){ const c = new AbortController(); setTimeout(()=>c.abort(), 5000); return c.signal; })() });
      const j = await r.json();
      return j.items || [];
    } catch(e) {
      console.warn("[BREAKING FETCH]", q, e.message);
      return [];
    }
  }, 3, 250);
  allItems.push(...results.flat());

  // 중복 제거 + 최신순
  const seen = new Set();
  const unique = allItems
    .filter(it => { const k=it.title.slice(0,15); if(seen.has(k)) return false; seen.add(k); return true; })
    .sort((a,b) => new Date(b.date)-new Date(a.date))
    .slice(0, 30);

  breakingCache = unique;
  breakingLoaded = true;

  if (!unique.length) {
    el.innerHTML = `<div class="loading-wrap"><p>속보를 찾을 수 없습니다.</p></div>`;
    return;
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  let h = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;font-weight:800;letter-spacing:0.8px;color:var(--red);font-family:var(--font-mono);">BREAKING</span>
        <span style="font-size:11px;color:#6B7280;font-family:var(--font-sans);">경제 속보</span>
      </div>
      <span style="font-size:10px;color:#9CA3AF;font-family:var(--font-mono);">${timeStr} 기준 · ${unique.length}건</span>
    </div>
    <div style="border-radius:var(--radius);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);border:1px solid rgba(220,38,38,0.15);">`;

  unique.forEach((it, i) => {
    const isLast = i === unique.length - 1;
    h += `<div class="news-item" style="${!isLast ? 'border-bottom:1px solid rgba(0,0,0,0.05);' : ''}">
      <div class="news-num" style="color:var(--red);font-weight:800;">${pad(i+1)}</div>
      <div class="news-body" onclick="openLink('${esc(it.link)}')">
        <div class="news-title">${it.title}</div>
        <div class="news-meta">
          <span style="background:#FEE2E2;color:#DC2626;padding:1px 6px;border-radius:4px;font-weight:600;">${it.source}</span>
          <span>${ago(it.date)}</span>
        </div>
      </div>
    </div>`;
  });
  h += `</div>`;
  el.innerHTML = h;
}


/* ═══════════ STOCKS ═══════════ */
async function loadStocks(){
  const results = await Promise.all([...INDICES,...STOCKS].map(s=>fetchQuote(s.sym)));
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
  _savedStartTab = localStorage.getItem('eco_start_tab') || 'economy';
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

/* ═══════════ ARCHIVE ═══════════ */
const TAB_META = {
  economy:  { label: '경제', icon: '🏦', color: '#1A7A45' },
  industry: { label: '산업', icon: '🏭', color: '#1D4ED8' },
  global:   { label: '국제', icon: '🌐', color: '#B45309' },
};
let archiveFilter = 'all';
let archiveItems = null;

async function loadArchive() {
  const root = document.getElementById('archive-root');
  if (!root) return;

  // 이미 로드된 경우 필터만 다시 렌더
  if (archiveItems) { renderArchiveList(archiveItems); return; }

  root.innerHTML = `<div class="loading-wrap"><div class="dots"><span></span><span></span><span></span></div><p style="margin-top:14px">아카이브를 불러오는 중...</p></div>`;

  try {
    const r = await fetch('/api/archive?action=list');
    const j = await r.json();
    archiveItems = j.items || [];
    renderArchiveList(archiveItems);
  } catch (e) {
    root.innerHTML = `<div class="loading-wrap"><p>아카이브를 불러올 수 없습니다.</p></div>`;
  }
}

function renderArchiveList(items) {
  const root = document.getElementById('archive-root');
  if (!root) return;

  const filtered = archiveFilter === 'all' ? items : items.filter(it => it.tab === archiveFilter);

  // 날짜별 그룹핑
  const groups = {};
  filtered.forEach(it => {
    const key = it.date; // YYYYMMDD
    if (!groups[key]) groups[key] = [];
    groups[key].push(it);
  });

  const filterHtml = `
    <div class="archive-filter-row">
      ${['all','economy','industry','global'].map(f => {
        const meta = f === 'all' ? { label: '전체', icon: '📋' } : TAB_META[f];
        return `<button class="archive-chip${archiveFilter===f?' active':''}"
          onclick="setArchiveFilter('${f}')"
          ${f !== 'all' ? `style="${archiveFilter===f?`background:${TAB_META[f].color};color:#fff;border-color:${TAB_META[f].color};`:''}"` : ''}>
          ${meta.icon} ${meta.label}
        </button>`;
      }).join('')}
    </div>`;

  if (!filtered.length) {
    root.innerHTML = `
      <div class="archive-wrap">
        <div class="archive-header">
          <div class="archive-eyebrow">Money Forest Archive</div>
          <div class="archive-title">브리핑 아카이브</div>
        </div>
        ${filterHtml}
        <div class="loading-wrap" style="padding:40px 0;">
          <p style="color:var(--text-dim);">아직 쌓인 데이터가 없습니다.<br>매일 07:00 · 17:00에 자동 저장됩니다.</p>
        </div>
      </div>`;
    return;
  }

  const groupsHtml = Object.keys(groups).sort((a,b)=>b-a).map(dateKey => {
    const y = dateKey.slice(0,4), mo = dateKey.slice(4,6), d = dateKey.slice(6,8);
    const label = `${parseInt(mo)}월 ${parseInt(d)}일`;
    const rowsHtml = groups[dateKey].map(it => {
      const meta = TAB_META[it.tab] || TAB_META.economy;
      return `<div class="archive-row" onclick="loadArchiveDetail('${it.id}')">
        <div class="archive-row-left">
          <span class="archive-slot">${it.slot}</span>
          <span class="archive-tab-badge" style="background:${meta.color}15;color:${meta.color};">${meta.icon} ${meta.label}</span>
        </div>
        <div class="archive-headline">${it.headline || '브리핑 보기 →'}</div>
        <div class="archive-arrow">›</div>
      </div>`;
    }).join('');
    return `<div class="archive-group">
      <div class="archive-date-label">${label}</div>
      ${rowsHtml}
    </div>`;
  }).join('');

  root.innerHTML = `
    <div class="archive-wrap">
      <div class="archive-header">
        <div class="archive-eyebrow">Money Forest Archive</div>
        <div class="archive-title">브리핑 아카이브</div>
        <div class="archive-desc">매일 07:00 · 17:00 자동 저장 · ${items.length}건</div>
      </div>
      ${filterHtml}
      <div class="archive-list">${groupsHtml}</div>
    </div>`;
}

function setArchiveFilter(f) {
  archiveFilter = f;
  if (archiveItems) renderArchiveList(archiveItems);
}

async function loadArchiveDetail(id) {
  const root = document.getElementById('archive-root');
  root.innerHTML = `<div class="loading-wrap"><div class="dots"><span></span><span></span><span></span></div><p style="margin-top:14px">불러오는 중...</p></div>`;

  try {
    const r = await fetch(`/api/archive?action=get&id=${encodeURIComponent(id)}`);
    const data = await r.json();
    if (!r.ok || data.error) throw new Error(data.error || '불러오기 실패');
    renderArchiveDetail(data);
  } catch (e) {
    root.innerHTML = `<div class="loading-wrap"><p style="color:var(--text-dim);">브리핑을 불러올 수 없습니다.</p>
      <button onclick="renderArchiveList(archiveItems)"
        style="margin-top:16px;padding:8px 18px;border-radius:10px;border:1.5px solid var(--border);background:#fff;font-size:13px;font-weight:600;cursor:pointer;">
        ← 목록으로
      </button></div>`;
  }
}

function renderArchiveDetail(data) {
  const root = document.getElementById('archive-root');
  const meta = TAB_META[data.tab] || TAB_META.economy;
  const mo = data.date ? parseInt(data.date.slice(4,6)) : '';
  const d  = data.date ? parseInt(data.date.slice(6,8)) : '';
  const dateLabel = data.date ? `${mo}월 ${d}일 ${data.slot} · ${meta.label}` : '';

  // 포인트 파싱 (메인과 동일)
  const summaryClean = (data.summary || '').replace(/\*\*/g,'').replace(/^#+\s*/gm,'').trim();
  const m1 = summaryClean.match(/포인트1:\s*(.+?)(?=\s*포인트2:|$)/s);
  const m2 = summaryClean.match(/포인트2:\s*(.+?)(?=\s*포인트3:|$)/s);
  const m3 = summaryClean.match(/포인트3:\s*(.+?)(?=\s*포인트4:|$)/s);
  const m4 = summaryClean.match(/포인트4:\s*(.+?)(?=\s*\[|$)/s);
  const lines = [m1,m2,m3,m4].map(m => m ? m[1].trim() : null).filter(Boolean);

  const CARDS = [
    { label:'핵심 이슈', color:'#1A7A45', bg:'linear-gradient(135deg,#F0FAF5,#FAFFFD)', shadow:'rgba(26,122,69,0.07)' },
    { label:'배경',      color:'#6B21A8', bg:'linear-gradient(135deg,#F9F0FF,#FEF8FF)', shadow:'rgba(107,33,168,0.06)' },
    { label:'시장 영향', color:'#1D4ED8', bg:'linear-gradient(135deg,#F3F8FF,#F8FBFF)', shadow:'rgba(29,78,216,0.06)' },
    { label:'투자 전략', color:'#B45309', bg:'linear-gradient(135deg,#FFFCF3,#FFFEF9)', shadow:'rgba(180,83,9,0.06)' },
  ];
  const headings = [
    { h: data.headline,  s: data.subheading  },
    { h: data.heading2,  s: data.subheading2 },
    { h: data.heading3,  s: data.subheading3 },
    { h: data.heading4,  s: data.subheading4 },
  ];

  const cardsHtml = lines.map((line, i) => {
    const cfg = CARDS[i] || CARDS[0];
    const hd = headings[i] || {};
    const cleaned = line.replace(/^포인트\d+:\s*/,'').replace(/\*\*/g,'').trim();
    const headlinePart = hd.h ? `
      <div style="font-size:18px;font-weight:900;color:#111;line-height:1.35;margin-bottom:5px;font-family:var(--font-sans);letter-spacing:-0.3px;">${hd.h}</div>
      ${hd.s ? `<div style="font-size:12px;font-weight:700;color:${cfg.color};line-height:1.5;margin-bottom:12px;font-family:var(--font-sans);">${hd.s}</div>` : ''}
    ` : '';
    return `<div style="background:${cfg.bg};border-radius:20px;padding:18px 18px 16px;margin-bottom:10px;box-shadow:0 4px 20px ${cfg.shadow};">
      <div style="display:inline-flex;align-items:center;gap:5px;background:${cfg.color};color:#fff;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;margin-bottom:12px;">${cfg.label}</div>
      ${headlinePart}
      <div style="font-size:14px;line-height:1.85;color:#111;font-family:var(--font-sans);">${cleaned}</div>
    </div>`;
  }).join('');

  root.innerHTML = `
    <div class="archive-detail-wrap">
      <button class="archive-back-btn" onclick="renderArchiveList(archiveItems)">← 목록으로</button>
      <div class="archive-detail-header">
        <span class="archive-tab-badge" style="background:${meta.color}15;color:${meta.color};font-size:12px;padding:4px 10px;">${meta.icon} ${meta.label}</span>
        <div class="archive-detail-date">${dateLabel}</div>
      </div>
      <div style="padding:0 2px;">${cardsHtml}</div>
      ${data.columnHook ? `
        <div style="margin:8px 0 16px;background:linear-gradient(135deg,#0F172A,#1E3A5F);border-radius:14px;padding:16px 18px;">
          <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);font-family:var(--font-mono);letter-spacing:0.5px;margin-bottom:8px;">📰 오늘의 칼럼 예고</div>
          <div style="font-size:14px;font-weight:800;color:#fff;line-height:1.45;">${data.columnHook}</div>
        </div>` : ''}
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
