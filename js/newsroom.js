// ── 뉴스룸 팀 데이터 ───────────────────────────────────────

const NEWSROOM_CEO = {
  name: 'Shawn Kim',
  role: 'CEO · Founder',
  photo: '/img/team/shawn1.png',
};

const NEWSROOM_TEAM = [
  { name: 'E-01', flag: '🤖', team: 'Economy',  role: 'Chief Editor',      spec: '거시지표·금리정책',    photo: '' },
  { name: 'E-02', flag: '🤖', team: 'Economy',  role: 'Senior Researcher', spec: '소비/물가·대중 해설',  photo: '' },
  { name: 'E-03', flag: '🤖', team: 'Economy',  role: 'Junior Researcher', spec: '속보·트렌드',           photo: '' },
  { name: 'I-01', flag: '🤖', team: 'Industry', role: 'Chief Editor',      spec: '반도체·산업구조',      photo: '' },
  { name: 'I-02', flag: '🤖', team: 'Industry', role: 'Senior Researcher', spec: '테크·IT기업',          photo: '' },
  { name: 'I-03', flag: '🤖', team: 'Industry', role: 'Junior Researcher', spec: '스타트업·신산업',      photo: '' },
  { name: 'G-01', flag: '🤖', team: 'Global',   role: 'Chief Editor',      spec: '지정학·외교경제',      photo: '' },
  { name: 'G-02', flag: '🤖', team: 'Global',   role: 'Senior Analyst',    spec: '유럽·ECB정책',         photo: '' },
  { name: 'G-03', flag: '🤖', team: 'Global',   role: 'Junior Analyst',    spec: '아시아금융·신흥국',    photo: '' },
  { name: 'M-01', flag: '🤖', team: 'Markets',  role: 'Chief Editor',      spec: '종목분석·기관동향',    photo: '' },
  { name: 'M-02', flag: '🤖', team: 'Markets',  role: 'Senior Researcher', spec: '개인투자·실전전략',    photo: '' },
  { name: 'M-03', flag: '🤖', team: 'Markets',  role: 'Junior Analyst',    spec: '닛케이·아시아증시',    photo: '' },
];

const TEAM_SECTIONS = [
  { key: 'Economy',  label: '경제',  color: '#1A7A45', bg: 'linear-gradient(135deg,#F0FAF5,#FAFFFD)', border: 'rgba(26,122,69,0.15)',  icon: '🏦' },
  { key: 'Industry', label: '산업',  color: '#1D4ED8', bg: 'linear-gradient(135deg,#F3F8FF,#F8FBFF)', border: 'rgba(29,78,216,0.15)',  icon: '🏭' },
  { key: 'Global',   label: '국제',  color: '#B45309', bg: 'linear-gradient(135deg,#FFFCF3,#FFFEF9)', border: 'rgba(180,83,9,0.15)',   icon: '🌐' },
  { key: 'Markets',  label: '증권',  color: '#6B21A8', bg: 'linear-gradient(135deg,#F9F0FF,#FEF8FF)', border: 'rgba(107,33,168,0.15)', icon: '📈' },
];

// ── 조직도 ─────────────────────────────────────────────────
function buildOrgChart() {
  const teamCardsHtml = TEAM_SECTIONS.map(sec => {
    const chief   = NEWSROOM_TEAM.find(m => m.team === sec.key && m.role === 'Chief Editor');
    const reports = NEWSROOM_TEAM.filter(m => m.team === sec.key && m.role !== 'Chief Editor');
    const reportHtml = reports.map(r => `
      <div class="org-report-mini">
        <span class="org-mini-id">${r.flag} ${r.name}</span>
        <span class="org-mini-role">${r.role.replace(' Researcher','').replace(' Analyst','')}</span>
        <span class="org-mini-spec">${r.spec}</span>
      </div>`).join('');
    return `
      <div class="org-team-card" style="border-top:3px solid ${sec.color};background:${sec.bg};border-color:${sec.border};">
        <div class="org-team-badge" style="color:${sec.color};">${sec.icon} ${sec.label}</div>
        <div class="org-team-chief">
          <div class="org-chief-id">${chief?.name || ''} <span class="emoji">🤖</span></div>
          <div class="org-chief-role">Chief Editor</div>
          <div class="org-chief-spec">${chief?.spec || ''}</div>
        </div>
        <div class="org-team-reports">${reportHtml}</div>
      </div>`;
  }).join('');

  const colCard = `
    <div class="org-col-full-card">
      <div class="org-col-inner">
        <div>
          <div class="org-team-badge" style="color:#0F172A;margin-bottom:6px;">✍️ Column</div>
          <div class="org-chief-id">C-01 <span class="emoji">🤖</span></div>
          <div class="org-chief-role">Column Editor</div>
          <div class="org-chief-spec">4개 부문 종합 · 브리핑 수렴 후 칼럼 생성</div>
        </div>
        <div class="org-col-badge">경제 · 산업 · 국제 · 증권</div>
      </div>
    </div>`;

  return `
    <div class="org-section">
      <div class="org-eyebrow">ORGANIZATION</div>
      <div class="org-title">AI Newsroom</div>
      <div class="org-grid">${teamCardsHtml}</div>
      ${colCard}
    </div>`;
}

// ── 브리핑 플로우 ───────────────────────────────────────────
function buildWorkflow() {
  const steps = [
    { num:'01', icon:'📡', title:'실시간 데이터 수집',        desc:'검증된 미디어 소스에서 경제·산업·국제·증권 뉴스를 실시간으로 수집합니다.' },
    { num:'02', icon:'🔍', title:'파트별 리서치 (Junior AI)', desc:'파트 전담 AI가 핵심 정보를 체계적으로 분류하고 초안을 작성합니다.' },
    { num:'03', icon:'📊', title:'교차 검증 (Senior AI)',     desc:'배경 맥락과 수치를 독립적으로 분석하여 정확도를 높입니다.' },
    { num:'04', icon:'✅', title:'최종 편집 확정 (Chief AI)', desc:'편집 기준에 따라 최종 검토를 거쳐 완성도 높은 브리핑을 확정합니다.' },
    { num:'05', icon:'📰', title:'브리핑 발행',               desc:'경제·산업·국제·증권 4개 부문이 동시에 완성되어 균형 있는 시각을 제공합니다.', last4: true },
    { num:'06', icon:'✍️', title:'칼럼 종합 (C-01)',         desc:'4개 부문의 인사이트를 종합하여 부문 간 상관관계와 심층 인사이트를 더합니다.', isCol: true },
  ];

  const stepsHtml = steps.map((s, i) => `
    <div class="wf-step${s.isCol ? ' wf-step-col' : ''}">
      <div class="wf-step-left">
        <div class="wf-num${s.isCol ? ' wf-num-col' : ''}">${s.num}</div>
        ${i < steps.length - 1 ? '<div class="wf-line"></div>' : ''}
      </div>
      <div class="wf-body">
        <div class="wf-title"><span class="emoji">${s.icon}</span> ${s.title}</div>
        <div class="wf-desc">${s.desc}</div>
        ${s.last4 ? '<div class="wf-badge">경제 · 산업 · 국제 · 증권 동시 진행</div>' : ''}
      </div>
    </div>`).join('');

  return `
    <div class="wf-section">
      <div class="org-eyebrow">BRIEFING PROCESS</div>
      <div class="org-title">브리핑 제작 과정</div>
      <div class="wf-sub">4개 부문 13개 AI 에디터가 매일 협업합니다. 각 AI는 독립적으로 분석하고, 검증 결과를 서로 교차 참조하여 단일 AI보다 훨씬 높은 정확도와 깊이를 실현합니다.</div>
      <div class="wf-steps">${stepsHtml}</div>
    </div>`;
}

// ── 발행인 히어로 ──────────────────────────────────────────
function buildFounder() {
  return `
    <div class="founder-hero">
      <div class="org-eyebrow">FOUNDER</div>
      <div class="founder-row">
        <div class="founder-photo">
          <img src="${NEWSROOM_CEO.photo}" alt="${NEWSROOM_CEO.name}" onerror="this.style.display='none'">
        </div>
        <div class="founder-info">
          <div class="founder-name">${NEWSROOM_CEO.name}</div>
          <div class="founder-role">${NEWSROOM_CEO.role}</div>
          <div class="founder-quote">"13명의 AI 에디터와 함께, 매일 아침 살아있는 브리핑을 만듭니다."</div>
        </div>
      </div>
    </div>`;
}

// ── 뉴스룸 렌더링 ──────────────────────────────────────────
function renderNewsroom() {
  const root = document.getElementById('newsroom-root');
  if (!root || root.dataset.rendered) return;
  root.dataset.rendered = 'true';

  root.innerHTML = `
    <div class="newsroom-wrap">
      ${buildFounder()}
      ${buildOrgChart()}
      ${buildWorkflow()}
    </div>`;
}
