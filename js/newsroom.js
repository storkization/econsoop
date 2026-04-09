// ── 뉴스룸 팀 데이터 ───────────────────────────────────────

const NEWSROOM_CEO = {
  name: 'Shawn Kim',
  flag: '',
  role: 'CEO · Founder',
  bio: '경제 뉴스는 왜 항상 어렵게 쓰여 있을까. 10년간 대기업 전략기획실에서 수천 장의 리포트를 읽으며 내린 결론은 하나였다. 복잡한 건 숨기기 위함이 아니라, 제대로 정리한 사람이 없어서다. VIVA Economy는 그 질문에서 시작됐다.',
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

// ── 뉴스룸 렌더링 ──────────────────────────────────────────
function renderNewsroom() {
  const root = document.getElementById('newsroom-root');
  if (!root || root.dataset.rendered) return;
  root.dataset.rendered = 'true';

  // CEO 카드
  const ceoHtml = `
    <div class="ceo-card">
      <div class="ceo-card-top">
        <div class="ceo-photo">
          <img src="${NEWSROOM_CEO.photo}" alt="${NEWSROOM_CEO.name}"
               onerror="this.parentElement.textContent='👤'">
        </div>
        <div class="ceo-info">
          <div class="ceo-name">${NEWSROOM_CEO.name}</div>
          <div class="ceo-badge">CEO · Founder</div>
        </div>
      </div>
    </div>
  `;

  // 섹션별 팀 카드
  const sectionsHtml = TEAM_SECTIONS.map(sec => {
    const members = NEWSROOM_TEAM.filter(m => m.team === sec.key);
    if (!members.length) return '';

    const makeCard = m => `
      <div class="team-card" style="background:${sec.bg};border-color:${sec.border};">
        <div class="team-name">${m.flag} ${m.name}</div>
        <div class="team-role" style="color:${sec.color};">${m.role}</div>
        <div class="team-spec">${m.spec}</div>
      </div>
    `;

    return `
      <div class="team-section">
        <div class="team-section-header" style="color:${sec.color};border-left-color:${sec.color};">
          <span class="team-section-icon emoji">${sec.icon}</span>
          <span class="team-section-label-text">${sec.label}</span>
        </div>
        <div class="team-grid">${members.map(makeCard).join('')}</div>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <div class="newsroom-wrap">
      <div class="newsroom-header">
        <div class="newsroom-eyebrow">VIVA Economy Intelligence</div>
        <div class="newsroom-title">Today's Biz Bite</div>
        <div class="newsroom-desc">비즈니스 로직을 해석하는 사람들</div>
      </div>
      ${sectionsHtml}
      ${ceoHtml}
    </div>
  `;
}
