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
  const chiefCols = TEAM_SECTIONS.map(sec => {
    const chief   = NEWSROOM_TEAM.find(m => m.team === sec.key && m.role === 'Chief Editor');
    const reports = NEWSROOM_TEAM.filter(m => m.team === sec.key && m.role !== 'Chief Editor');
    const reportHtml = reports.map(r => `
      <div class="org-report">
        <div class="org-report-id">${r.flag} ${r.name}</div>
        <div class="org-report-role">${r.role.replace(' Researcher','').replace(' Analyst','')}</div>
        <div class="org-report-spec">${r.spec}</div>
      </div>`).join('');
    return `
      <div class="org-col">
        <div class="org-chief" style="border-top:3px solid ${sec.color};background:${sec.bg};border-color:${sec.border};">
          <div class="org-chief-badge" style="color:${sec.color};">${sec.icon} ${sec.label}</div>
          <div class="org-chief-id">${chief?.name || ''} <span class="emoji">🤖</span></div>
          <div class="org-chief-role">Chief Editor</div>
          <div class="org-chief-spec">${chief?.spec || ''}</div>
        </div>
        <div class="org-reports">${reportHtml}</div>
      </div>`;
  }).join('');

  const colCol = `
    <div class="org-col org-col-c">
      <div class="org-chief org-chief-c">
        <div class="org-chief-badge" style="color:#0F172A;">✍️ Column</div>
        <div class="org-chief-id">C-01 <span class="emoji">🤖</span></div>
        <div class="org-chief-role">Column Editor</div>
        <div class="org-chief-spec">4개 부문 종합</div>
      </div>
      <div class="org-reports">
        <div class="org-report org-report-c">
          <div class="org-report-role">경제·산업·국제·증권</div>
          <div class="org-report-spec">브리핑 수렴 후 칼럼 생성</div>
        </div>
      </div>
    </div>`;

  return `
    <div class="org-section">
      <div class="org-eyebrow">ORGANIZATION</div>
      <div class="org-title">AI 뉴스룸 구조</div>

      <div class="org-ceo-node">
        <div class="org-ceo-photo">
          ${NEWSROOM_CEO.photo
            ? `<img src="${NEWSROOM_CEO.photo}" alt="${NEWSROOM_CEO.name}" onerror="this.textContent='👤'">`
            : '👤'}
        </div>
        <div>
          <div class="org-ceo-name">${NEWSROOM_CEO.name}</div>
          <div class="org-ceo-role">${NEWSROOM_CEO.role}</div>
        </div>
      </div>

      <div class="org-connector-v"></div>

      <div class="org-chiefs-scroll">
        <div class="org-chiefs-row">
          ${chiefCols}
          ${colCol}
        </div>
      </div>
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
      <div class="wf-sub">전문화된 AI들의 협업으로 신뢰도 높은 브리핑을 제공합니다.<br>4개 부문 13개 AI가 매일 협력하여 정확하고 깊이 있는 경제 브리핑을 만듭니다.</div>
      <div class="wf-steps">${stepsHtml}</div>
    </div>`;
}

// ── 뉴스룸 렌더링 ──────────────────────────────────────────
function renderNewsroom() {
  const root = document.getElementById('newsroom-root');
  if (!root || root.dataset.rendered) return;
  root.dataset.rendered = 'true';

  const sectionsHtml = TEAM_SECTIONS.map(sec => {
    const members = NEWSROOM_TEAM.filter(m => m.team === sec.key);
    if (!members.length) return '';
    const makeCard = m => `
      <div class="team-card" style="background:${sec.bg};border-color:${sec.border};">
        <div class="team-name">${m.flag} ${m.name}</div>
        <div class="team-role" style="color:${sec.color};">${m.role}</div>
        <div class="team-spec">${m.spec}</div>
      </div>`;
    return `
      <div class="team-section">
        <div class="team-section-header" style="color:${sec.color};border-left-color:${sec.color};">
          <span class="team-section-icon emoji">${sec.icon}</span>
          <span class="team-section-label-text">${sec.label}</span>
        </div>
        <div class="team-grid">${members.map(makeCard).join('')}</div>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="newsroom-wrap">
      <div class="newsroom-header">
        <div class="newsroom-eyebrow">VIVA Economy Intelligence</div>
        <div class="newsroom-title">Today's Biz Bite</div>
        <div class="newsroom-desc">비즈니스 로직을 해석하는 AI 뉴스룸</div>
      </div>
      ${buildOrgChart()}
      ${buildWorkflow()}
      <div class="nr-team-header">
        <div class="org-eyebrow">TEAM</div>
        <div class="org-title">부문별 AI 에디터</div>
      </div>
      ${sectionsHtml}
    </div>`;
}
