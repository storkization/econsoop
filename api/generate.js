import admin from 'firebase-admin';

// ── Firebase Admin 초기화 (중복 방지) ──────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}
const db = admin.firestore();

// ── 닉네임 풀 ──────────────────────────────────────────────
const NICK_POOL = [
  '청소의왕','꼬북이','경제요정','파란하늘82','투자고수','돈나무',
  'Rodus23','thesomeaudio','moonrider','k_investor','seoul_wolf',
  '수익왕','주식초보99','환율걱정러','현명한소비자','서울시민A',
  '금리덕후','꼬마투자자','경제공부중','bull_k','야간매수러',
];

async function callHaiku({ prompt, maxTokens, timeoutMs }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return '';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const j = await r.json();
    return j.content?.[0]?.text || '';
  } catch(e) {
    console.error('[GENERATE] Haiku 호출 실패:', e.message);
    return '';
  }
}

// 옵션 B: 인기 집중형(첫 두 댓글에 대댓글 몰림) + 대대댓글 20% 확률
function buildCommentTemplate() {
  const count = 4 + Math.floor(Math.random() * 4);
  const tree = [];
  for (let i = 0; i < count; i++) {
    let replyCount;
    if (i === 0)      replyCount = 2 + Math.floor(Math.random() * 2);
    else if (i === 1) replyCount = 1 + Math.floor(Math.random() * 2);
    else              replyCount = Math.random() < 0.4 ? 1 : 0;
    const replies = [];
    for (let j = 0; j < replyCount; j++) {
      const subCount = Math.random() < 0.2 ? (1 + Math.floor(Math.random() * 2)) : 0;
      const subReplies = Array.from({ length: subCount }, () => ({ text: '' }));
      replies.push({ text: '', subReplies });
    }
    tree.push({ text: '', replies });
  }
  return tree;
}

async function genComments(summary, label) {
  const template = buildCommentTemplate();
  const prompt = `오늘의 ${label} 브리핑:
${summary.slice(0, 350)}

이 브리핑에 달린 한국 독자 댓글 트리를 아래 JSON 템플릿 구조대로 생성하세요. 각 "text" 필드를 채워 반환하세요.

✅ 핵심: **진짜 사람이 커뮤니티(네이버·디시·블라인드)에 쓴 듯한** 감정 실린 댓글. AI스러운 정갈한 말투 X, 실제 독자의 날것 반응 O.

✅ 감정·인터넷 말투 적극 장려 (남발 금지, 자연스럽게):
- 감탄·한숨: "아 놔", "하 진짜", "미치겠네", "에라이", "어이없네", "한숨만 나옴", "드디어", "와씨"
- 경험담: "아 놔 SK하이닉스 팔았는데 또 오르누", "나만 물린 거 아니지?", "어제 샀는데 오늘 이러네"
- 반응: "역시 그럴 줄 알았음", "이거 진짜임?", "또요?", "뭐임 이거", "솔직히 예상했지"
- 질문: "이거 내 대출금리도 오르는 거예요?", "지금 들어가도 됨?"
- 감정: 억울함·불안·자조·분노·희망·체념 다양하게

규칙:
- 댓글(최상위 text): 15~45자. 공감·의견·질문·경험담·분노·자조 다양하게. 이모지 0~1개
- 대댓글(replies의 text): 10~30자. 원댓글에 대한 반응(공감/반박/질문/위로/보충)
- 대대댓글(subReplies의 text): 8~25자. 짧은 동조·추임새 ("ㅇㅈ", "맞아요", "그러게요", "헐", "아 진짜요?", "저도요")
- 마크다운·이모지 과용 금지 (문장당 최대 1개)
- 너무 정갈·교과서스러운 "~입니다" 체 금지. 커뮤니티 반말/짧은 존댓말 섞기
- 브리핑 내용과 구체적으로 연결 (추상적 감상 금지)

템플릿 (구조를 바꾸지 말고 text만 채우기):
${JSON.stringify(template, null, 2)}

채워진 JSON만 출력하세요.`;
  const text = await callHaiku({ prompt, maxTokens: 1400, timeoutMs: 30000 });
  if (!text) return [];
  try {
    const raw = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const items = JSON.parse(raw);
    const shuffled = [...NICK_POOL].sort(() => Math.random() - 0.5);
    let ni = 0;
    const pick = () => shuffled[ni++ % shuffled.length];
    return items.map((c) => ({
      nick: pick(),
      text: c.text || '',
      likes: Math.floor(Math.random() * 18) + 1,
      replies: (c.replies || []).map((r) => ({
        nick: pick(),
        text: r.text || '',
        subReplies: (r.subReplies || []).map((sr) => ({
          nick: pick(),
          text: sr.text || '',
        })),
      })),
    }));
  } catch(e) {
    console.error('[GENERATE] 댓글 파싱 실패:', e.message);
    return [];
  }
}

// ── 네이버 이미지 검색 ────────────────────────────────────
async function fetchNaverImage(query) {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) return '';
  try {
    const r = await fetch(
      `https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(query)}&display=5&sort=sim&filter=large`,
      { headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret }, signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return '';
    const j = await r.json();
    // 첫 번째 유효한 이미지 반환 (최소 크기 필터)
    const items = j?.items || [];
    for (const item of items) {
      const url = item.link || item.thumbnail || '';
      if (url && !url.includes('logo') && !url.includes('icon') && !url.includes('banner')) return url;
    }
    return items[0]?.link || '';
  } catch { return ''; }
}

// ── Unsplash 이미지 (폴백) ────────────────────────────────
const UNSPLASH_KW = {
  economy:  'finance economy money korea',
  industry: 'technology industry manufacturing',
  global:   'world globe international business',
  stocks:   'stock market trading investment',
};
async function fetchUnsplashImage(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return '';
  try {
    const r = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${key}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return '';
    const j = await r.json();
    return j?.urls?.regular || '';
  } catch { return ''; }
}

// ── 탭 설정 ────────────────────────────────────────────────
const SUMMARY_QUERIES = {
  economy:  ['한국은행 금리', '원달러 환율 외환', '코스피 증시 금융시장', '물가 인플레이션 소비', '수출 무역 경상수지', '가계부채 대출', '경제 오늘 주요뉴스'],
  industry: ['반도체 전자', '자동차 배터리 전기차', '바이오 헬스 제약', '건설 부동산', '경영 재계 M&A'],
  global:   ['미국 연준 Fed 관세 무역', '중국 경제 위안화 무역분쟁', '일본 엔화 닛케이 일본은행', '유럽 ECB 유로존 독일', '국제유가 OPEC 중동 에너지', '국제경제 오늘 주요뉴스'],
  stocks:   ['삼성전자 SK하이닉스 주가 전망', '코스피 코스닥 증시 오늘', '미국주식 나스닥 S&P500', '증권사 투자 리포트 목표주가', '공모주 IPO 상장', '외국인 기관 수급 매수매도'],
};
const TAB_LABEL = { economy: '경제', industry: '산업', global: '국제', stocks: '증권' };

async function pickLeadTab(headlines) {
  const prompt = `오늘 아침 한국 경제 브리핑 4개의 톱 헤드라인입니다.\n\n경제: ${headlines.economy || ''}\n산업: ${headlines.industry || ''}\n국제: ${headlines.global || ''}\n증권: ${headlines.stocks || ''}\n\n이 중 "오늘의 톱 뉴스"로 신문 1면 히어로에 올릴 하나를 고르세요. 기준: 파급력·긴급성·독자 관심도.\n답: economy / industry / global / stocks 중 하나만 단어로. 설명 금지.`;
  const text = await callHaiku({ prompt, maxTokens: 20, timeoutMs: 10000 });
  const m = text.trim().toLowerCase().match(/(economy|industry|global|stocks)/);
  return m ? m[1] : 'economy';
}

// ── 메인 핸들러 ────────────────────────────────────────────
export default async function handler(req, res) {
  const auth = req.headers['authorization'];
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const host = req.headers.host;

  // 오늘 이미 생성했으면 스킵 (중복 API 호출 방지)
  const _kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const todayStr = String(_kst.getFullYear()) +
    String(_kst.getMonth() + 1).padStart(2, '0') +
    String(_kst.getDate()).padStart(2, '0');
  const todayMonth = `${_kst.getFullYear()}-${String(_kst.getMonth() + 1).padStart(2, '0')}`;
  const todayYear = String(_kst.getFullYear());
  const force = req.query.force === '1';
  if (!force) {
    const existing = await db.collection('editions').doc(`${todayStr}_0700`).get();
    if (existing.exists) {
      const existingTabs = existing.data()?.tabs || {};
      const successCount = Object.keys(existingTabs).length;
      if (successCount > 0) {
        // 에디션이 있어도 briefing 데이터가 오늘 7시 슬롯 이전이면 재생성
        const slotToday = new Date(_kst);
        slotToday.setHours(7, 0, 0, 0);
        const slotMs = slotToday.getTime() - (_kst.getTime() - new Date().getTime());
        const editionCreated = existing.data()?.created_at || 0;
        if (editionCreated >= slotMs) {
          console.log(`[GENERATE] 오늘(${todayStr}) 7시 이후 생성됨 (탭 ${successCount}개) — 스킵`);
          return res.status(200).json({ done: true, skipped: true, reason: 'already_generated_today', ts: new Date().toISOString() });
        }
        console.log(`[GENERATE] 오늘(${todayStr}) 에디션 있지만 7시 이전 생성 (${new Date(editionCreated).toISOString()}) — 재생성`);
      } else {
        console.log(`[GENERATE] 오늘(${todayStr}) 빈 에디션 발견 — 재생성 진행`);
      }
    }
  }

  const results = [];

  for (const tab of ['economy', 'industry', 'global', 'stocks']) {
    try {
      // 1. 뉴스 수집
      const allItems = [];
      for (const q of SUMMARY_QUERIES[tab]) {
        try {
          const r = await fetch(`https://${host}/api/news?query=${encodeURIComponent(q)}&display=7`);
          const j = await r.json();
          if (j.items) allItems.push(...j.items);
        } catch(e) { /* skip */ }
      }

      const seen = new Set();
      const skipKw = ['구직','채용','취업','자립준비','희망디딤돌','주요기사'];
      const unique = allItems
        .filter(it => !skipKw.some(kw => it.title.includes(kw)))
        .filter(it => { const k = it.title.slice(0, 15); if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 18);

      if (!unique.length) throw new Error('뉴스 없음');

      const headlines = unique.map(it =>
        it.description ? `${it.title}\n   → ${it.description.slice(0, 100)}` : it.title
      );

      // 2-a. Claude 브리핑 생성 (imageQuery 포함)
      const briefingRes = await fetch(`https://${host}/api/briefing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ headlines, tab, label: TAB_LABEL[tab] }),
      });
      if (!briefingRes.ok) throw new Error(`briefing API 오류 ${briefingRes.status}`);

      const { summary, footnotes, frontHeadline, imageQuery, headline, subheading, heading2, subheading2, heading3, subheading3, heading4, subheading4, columnHook, columnSubhook } = await briefingRes.json();
      if (!summary) throw new Error('브리핑 파싱 실패');

      // 2-b. 이미지 수집
      //   topImageUrl: 네이버 이미지 검색 우선 (imageQuery 키워드)
      //     실패 시 Unsplash 폴백
      //   sectionImages: Unsplash 2장 (본문 중간 삽입용)
      const fallbackKw = UNSPLASH_KW[tab];
      const topKw = imageQuery || fallbackKw;
      const [naverImg, img1, img2] = await Promise.all([
        fetchNaverImage(topKw),
        fetchUnsplashImage(fallbackKw + ' chart data'),
        fetchUnsplashImage(fallbackKw + ' office people'),
      ]);
      let topImageUrl = naverImg || '';
      const sectionImages = [img1, img2].filter(Boolean);
      if (!topImageUrl) {
        topImageUrl = await fetchUnsplashImage(topKw) || sectionImages.shift() || '';
      }

      // 3. Firestore 저장 (최신 캐시 — 덮어쓰기)
      const comments = await genComments(summary, TAB_LABEL[tab]);
      const now = Date.now();
      const briefingData = {
        summary,
        footnotes: footnotes || '',
        frontHeadline: frontHeadline || '',
        headline: headline || '',
        subheading: subheading || '',
        heading2: heading2 || '', subheading2: subheading2 || '',
        heading3: heading3 || '', subheading3: subheading3 || '',
        heading4: heading4 || '', subheading4: subheading4 || '',
        columnHook: columnHook || '',
        columnSubhook: columnSubhook || '',
        topImageUrl: topImageUrl || '',
        sectionImages: sectionImages.length ? sectionImages : [],
        comments: comments.length ? comments : [],
        created_at: now,
      };
      await db.collection('briefings').doc(tab).set(briefingData);

      // 4. 아카이브 저장 (날짜 기준 — 매 실행마다 저장, archiveId로 중복 방지)
      try {
        const archiveId = `${tab}_${todayStr}_0700`;
        await db.collection('archive').doc(archiveId).set({
          ...briefingData,
          tab,
          date: todayStr,
          slot: '07:00',
          month: todayMonth,
          year: todayYear,
        });
        console.log(`[GENERATE] ${tab} 아카이브 저장: ${archiveId}`);
      } catch (archiveErr) {
        console.error(`[GENERATE] ${tab} 아카이브 저장 실패:`, archiveErr.message);
      }

      results.push({ tab, ok: true, len: summary.length, summary, footnotes: footnotes || '', frontHeadline: frontHeadline || '', headline: headline || '', topImageUrl: topImageUrl || '' });
      console.log(`[GENERATE] ${tab} 완료 (${summary.length}자)`);
    } catch(err) {
      console.error(`[GENERATE] ${tab} 실패:`, err.message);
      results.push({ tab, ok: false, error: err.message });
    }
  }

  // ── 오늘의 톱 탭 판정 (신문 1면 히어로) ──
  let leadTab = 'economy';
  const successfulTabs = results.filter(r => r.ok);
  if (successfulTabs.length >= 2) {
    const headlineMap = {};
    for (const r of successfulTabs) {
      headlineMap[r.tab] = r.frontHeadline || r.headline || '';
    }
    leadTab = await pickLeadTab(headlineMap);
    if (!successfulTabs.some(r => r.tab === leadTab)) leadTab = successfulTabs[0].tab;
    console.log(`[GENERATE] leadTab 선정: ${leadTab}`);
    await Promise.all(successfulTabs.map(r =>
      db.collection('briefings').doc(r.tab).set({ leadTab }, { merge: true })
        .catch(e => console.error(`[GENERATE] ${r.tab} leadTab update 실패:`, e.message))
    ));
  }

  // ── 에디션 저장 (매 실행마다 저장, editionId로 중복 방지) ──
  try {
    const editionId = `${todayStr}_0700`;

    // 탭별 티저 추출 (포인트1 첫 문장)
    function extractTeaser(summary) {
      if (!summary) return '';
      const m = summary.match(/포인트1:\s*(.+?)(?=\s*포인트2:|$)/s);
      const raw = m ? m[1].trim() : summary.split('\n').find(l => l.trim().length > 10) || summary;
      return raw.replace(/\*\*/g, '').trim().slice(0, 80);
    }

    const tabs = {};
    for (const r of results) {
      if (r.ok && r.summary) {
        tabs[r.tab] = { summary: r.summary, teaser: extractTeaser(r.summary), headline: r.headline || '', frontHeadline: r.frontHeadline || '', topImageUrl: r.topImageUrl || '' };
      }
    }

    // 모든 탭 실패 시 에디션 저장 건너뛰기 (다음 크론이 재시도할 수 있도록)
    if (Object.keys(tabs).length === 0) {
      console.error(`[GENERATE] 모든 탭 실패 — 에디션 저장 스킵 (재시도 가능)`);
      return res.status(500).json({ done: false, results, reason: 'all_tabs_failed', ts: new Date().toISOString() });
    }

    // 칼럼 생성 (경제 탭 기반)
    let columnText = '';
    let columnTeaser = '';
    const econResult = results.find(r => r.ok && r.tab === 'economy');
    if (econResult?.summary) {
      try {
        const colRes = await fetch(`https://${host}/api/column`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({ summary: econResult.summary, oneliner: '', label: '경제' }),
        });
        if (colRes.ok) {
          const colData = await colRes.json();
          if (colData.column) {
            columnText = colData.column;
            const firstLine = columnText.split('\n')
              .find(l => l.trim().length > 5 && !l.startsWith('---') && !l.startsWith('by.') && !l.startsWith('###'));
            columnTeaser = (firstLine || '').replace(/^#+\s*/, '').replace(/[📈🚨💡📉⚠️🔥💰🏦]/g, '').trim().slice(0, 70);
          }
        }
      } catch(e) {
        console.error('[GENERATE] 칼럼 생성 실패:', e.message);
      }
    }

    await db.collection('editions').doc(editionId).set({
      date: todayStr,
      slot: '07:00',
      period: '오전',
      month: todayMonth,
      year: todayYear,
      created_at: Date.now(),
      tabs,
      leadTab,
      column: { text: columnText, teaser: columnTeaser },
    });
    console.log(`[GENERATE] 에디션 저장: ${editionId}`);
  } catch(e) {
    console.error('[GENERATE] 에디션 저장 실패:', e.message);
  }

  // ── 용어사전 누적 저장 ──
  try {
    const batch = db.batch();
    for (const r of results) {
      if (!r.ok || !r.footnotes) continue;
      for (const line of r.footnotes.split('\n')) {
        const m = line.match(/※\s*(.+?)\s*[—–]\s*(.+)/);
        if (!m) continue;
        const term = m[1].trim();
        const definition = m[2].trim();
        const docId = term.slice(0, 100).replace(/\//g, '_');
        batch.set(db.collection('glossary').doc(docId), { term, definition, tab: r.tab, last_seen: Date.now() }, { merge: true });
      }
    }
    await batch.commit();
    console.log('[GENERATE] 용어사전 저장 완료');
  } catch (e) {
    console.error('[GENERATE] 용어사전 저장 실패:', e.message);
  }

  res.status(200).json({ done: true, results, ts: new Date().toISOString() });
}
