// ── 뉴스룸 팀 데이터 ───────────────────────────────────────

const NEWSROOM_CEO = {
  name: 'Shawn Kim (김도훈)',
  flag: '🇰🇷',
  role: 'CEO · Founder',
  bio: '대기업 전략기획 출신. 경제 정보의 민주화를 꿈꾸며 Econ.SOOP을 창업.',
  photo: '/images/team/shawn.jpg',
};

const NEWSROOM_TEAM = [
  { name: '김태준',        flag: '🇰🇷', team: 'Economy',  role: 'Chief Editor',      spec: '거시지표·금리정책',    photo: '/images/team/taejun.jpg' },
  { name: '박소현',        flag: '🇰🇷', team: 'Economy',  role: 'Senior Researcher', spec: '소비/물가·대중 해설',  photo: '/images/team/sohyun.jpg' },
  { name: '이준혁',        flag: '🇰🇷', team: 'Economy',  role: 'Junior Researcher', spec: '속보·트렌드',           photo: '/images/team/junhyuk.jpg' },
  { name: '최민서',        flag: '🇰🇷', team: 'Industry', role: 'Chief Editor',      spec: '반도체·산업구조',      photo: '/images/team/minseo.jpg' },
  { name: '정우성',        flag: '🇰🇷', team: 'Industry', role: 'Senior Researcher', spec: '테크·IT기업',          photo: '/images/team/woosung.jpg' },
  { name: '한지은',        flag: '🇰🇷', team: 'Industry', role: 'Junior Researcher', spec: '스타트업·신산업',      photo: '/images/team/jieun.jpg' },
  { name: '오민준',        flag: '🇰🇷', team: 'Global',   role: 'Chief Editor',      spec: '지정학·외교경제',      photo: '/images/team/minjun.jpg' },
  { name: 'Lena Hoffmann', flag: '🇩🇪', team: 'Global',   role: 'Senior Analyst',    spec: '유럽·ECB정책',         photo: '/images/team/lena.jpg' },
  { name: 'Kevin Chan',    flag: '🇭🇰', team: 'Global',   role: 'Junior Analyst',    spec: '아시아금융·신흥국',    photo: '/images/team/kevin.jpg' },
  { name: '강동현',        flag: '🇰🇷', team: 'Markets',  role: 'Chief Editor',      spec: '종목분석·기관동향',    photo: '/images/team/donghyun.jpg' },
  { name: '윤서영',        flag: '🇰🇷', team: 'Markets',  role: 'Senior Researcher', spec: '개인투자·실전전략',    photo: '/images/team/seoyoung.jpg' },
  { name: 'Yuki Tanaka',   flag: '🇯🇵', team: 'Markets',  role: 'Junior Analyst',    spec: '닛케이·아시아증시',    photo: '/images/team/yuki.jpg' },
];

// ── 뉴스룸 렌더링 ──────────────────────────────────────────
function renderNewsroom() {
  const root = document.getElementById('newsroom-root');
  if (!root || root.dataset.rendered) return;
  root.dataset.rendered = 'true';

  // CEO 카드
  const ceoHtml = `
    <div class="ceo-card">
      <div class="ceo-photo">
        <img src="${NEWSROOM_CEO.photo}" alt="${NEWSROOM_CEO.name}"
             onerror="this.parentElement.textContent='👤'">
      </div>
      <div class="ceo-info">
        <div class="ceo-badge">CEO · Founder ${NEWSROOM_CEO.flag}</div>
        <div class="ceo-name">${NEWSROOM_CEO.name}</div>
        <div class="ceo-role">${NEWSROOM_CEO.role}</div>
        <div class="ceo-bio">${NEWSROOM_CEO.bio}</div>
      </div>
    </div>
  `;

  // 팀 카드 그리드
  const teamHtml = NEWSROOM_TEAM.map(m => `
    <div class="team-card">
      <div class="team-photo">
        <img src="${m.photo}" alt="${m.name}"
             onerror="this.parentElement.textContent='${m.flag}'">
      </div>
      <div class="team-name">${m.name}</div>
      <div class="team-team">${m.team}</div>
      <div class="team-role">${m.role}</div>
      <div class="team-spec">${m.spec}</div>
    </div>
  `).join('');

  root.innerHTML = `
    <div class="newsroom-wrap">
      <div class="newsroom-header">
        <div class="newsroom-eyebrow">Econ.SOOP Newsroom</div>
        <div class="newsroom-title">우리 팀을 소개합니다</div>
        <div class="newsroom-desc">경제숲을 만드는 사람들</div>
      </div>
      ${ceoHtml}
      <div class="team-section-label">팀 멤버 · ${NEWSROOM_TEAM.length}명</div>
      <div class="team-grid">${teamHtml}</div>
    </div>
  `;
}
