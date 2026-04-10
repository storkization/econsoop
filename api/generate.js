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

async function genComments(summary, label) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];
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
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: `오늘의 ${label} 브리핑:\n${summary.slice(0, 350)}\n\n이 브리핑을 읽은 한국 독자 4명의 댓글과, 각 댓글에 달린 대댓글 1~2개를 생성하세요.\n규칙: 댓글 15~45자, 대댓글 10~30자, 인터넷 말투 자연스럽게, 이모지 1개 이하, 마크다운 금지.\nJSON만 출력:\n[{"text":"댓글","replies":["대댓글1","대댓글2"]},...]`,
        }],
      }),
      signal: AbortSignal.timeout(25000),
    });
    const j = await r.json();
    const items = JSON.parse(j.content[0].text);
    const shuffled = [...NICK_POOL].sort(() => Math.random() - 0.5);
    return items.slice(0, 4).map((item, i) => ({
      nick: shuffled[i],
      text: item.text,
      likes: Math.floor(Math.random() * 18) + 1,
      replies: (item.replies || []).slice(0, 2).map((rt, ri) => ({
        nick: shuffled[4 + i * 2 + ri] || shuffled[(i + ri + 5) % NICK_POOL.length],
        text: rt,
      })),
    }));
  } catch(e) {
    console.error('[GENERATE] 댓글 생성 실패:', e.message);
    return [];
  }
}

// ── 탭 설정 ────────────────────────────────────────────────
const SUMMARY_QUERIES = {
  economy:  ['한국은행 금리', '원달러 환율 외환', '코스피 증시 금융시장', '물가 인플레이션 소비', '수출 무역 경상수지', '가계부채 대출', '경제 오늘 주요뉴스'],
  industry: ['반도체 전자', '자동차 배터리 전기차', '바이오 헬스 제약', '건설 부동산', '경영 재계 M&A'],
  global:   ['미국 연준 Fed 관세 무역', '중국 경제 위안화 무역분쟁', '일본 엔화 닛케이 일본은행', '유럽 ECB 유로존 독일', '국제유가 OPEC 중동 에너지', '국제경제 오늘 주요뉴스'],
  stocks:   ['삼성전자 SK하이닉스 주가 전망', '코스피 코스닥 증시 오늘', '미국주식 나스닥 S&P500', '증권사 투자 리포트 목표주가', '공모주 IPO 상장', '외국인 기관 수급 매수매도'],
};
const TAB_LABEL = { economy: '경제', industry: '산업', global: '국제', stocks: '증권' };

// ── 메인 핸들러 ────────────────────────────────────────────
export default async function handler(req, res) {
  const auth = req.headers['authorization'];
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const host = req.headers.host;
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

      // 2-a. 대표 기사 OG 이미지 추출
      let topImageUrl = '';
      const topUrl = unique[0]?.originallink || unique[0]?.link;
      if (topUrl) {
        try {
          const ogRes = await fetch(`https://${host}/api/ogimage?url=${encodeURIComponent(topUrl)}`, {
            signal: AbortSignal.timeout(6000),
          });
          if (ogRes.ok) {
            const ogData = await ogRes.json();
            topImageUrl = ogData.imageUrl || '';
          }
        } catch(e) { /* skip */ }
      }

      // 2-b. Claude 브리핑 생성
      const briefingRes = await fetch(`https://${host}/api/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines, tab, label: TAB_LABEL[tab] }),
      });
      if (!briefingRes.ok) throw new Error(`briefing API 오류 ${briefingRes.status}`);

      const { summary, footnotes, headline, subheading, heading2, subheading2, heading3, subheading3, heading4, subheading4, columnHook, columnSubhook } = await briefingRes.json();
      if (!summary) throw new Error('브리핑 파싱 실패');

      // 3. Firestore 저장 (최신 캐시 — 덮어쓰기)
      const comments = await genComments(summary, TAB_LABEL[tab]);
      const now = Date.now();
      const briefingData = {
        summary,
        footnotes: footnotes || '',
        headline: headline || '',
        subheading: subheading || '',
        heading2: heading2 || '', subheading2: subheading2 || '',
        heading3: heading3 || '', subheading3: subheading3 || '',
        heading4: heading4 || '', subheading4: subheading4 || '',
        columnHook: columnHook || '',
        columnSubhook: columnSubhook || '',
        topImageUrl: topImageUrl || '',
        comments: comments.length ? comments : [],
        created_at: now,
      };
      await db.collection('briefings').doc(tab).set(briefingData);

      // 4. 아카이브 저장 (예약 슬롯 시간에만 — 07:00±15분, 17:00±15분)
      try {
        const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        const hm = kst.getHours() * 100 + kst.getMinutes();
        const SLOTS = [{ hm: 700, label: '0700' }, { hm: 1700, label: '1700' }];
        const matchedSlot = SLOTS.find(s => Math.abs(hm - s.hm) <= 15);

        if (matchedSlot) {
          const dateStr = String(kst.getFullYear()) +
            String(kst.getMonth() + 1).padStart(2, '0') +
            String(kst.getDate()).padStart(2, '0');
          const archiveId = `${tab}_${dateStr}_${matchedSlot.label}`;
          const month = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}`;
          const slotDisplay = `${matchedSlot.label.slice(0, 2)}:${matchedSlot.label.slice(2)}`;
          await db.collection('archive').doc(archiveId).set({
            ...briefingData,
            tab,
            date: dateStr,
            slot: slotDisplay,
            month,
            year: String(kst.getFullYear()),
          });
          console.log(`[GENERATE] ${tab} 아카이브 저장: ${archiveId}`);
        } else {
          console.log(`[GENERATE] ${tab} 아카이브 건너뜀 (슬롯 외 시간: ${hm})`);
        }
      } catch (archiveErr) {
        console.error(`[GENERATE] ${tab} 아카이브 저장 실패:`, archiveErr.message);
      }

      results.push({ tab, ok: true, len: summary.length, summary });
      console.log(`[GENERATE] ${tab} 완료 (${summary.length}자)`);
    } catch(err) {
      console.error(`[GENERATE] ${tab} 실패:`, err.message);
      results.push({ tab, ok: false, error: err.message });
    }
  }

  // ── 에디션 저장 (슬롯 시간에만) ───────────────────────────
  try {
    const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const hm = kst.getHours() * 100 + kst.getMinutes();
    const SLOTS = [
      { hm: 700,  label: '0700', period: '오전' },
      { hm: 1700, label: '1700', period: '오후' },
    ];
    const matchedSlot = SLOTS.find(s => Math.abs(hm - s.hm) <= 15);

    if (matchedSlot) {
      const dateStr = String(kst.getFullYear()) +
        String(kst.getMonth() + 1).padStart(2, '0') +
        String(kst.getDate()).padStart(2, '0');
      const editionId = `${dateStr}_${matchedSlot.label}`;
      const month = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}`;

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
          tabs[r.tab] = { summary: r.summary, teaser: extractTeaser(r.summary) };
        }
      }

      // 칼럼 생성 (경제 탭 기반)
      let columnText = '';
      let columnTeaser = '';
      const econResult = results.find(r => r.ok && r.tab === 'economy');
      if (econResult?.summary) {
        try {
          const colRes = await fetch(`https://${host}/api/column`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        date: dateStr,
        slot: `${matchedSlot.label.slice(0, 2)}:${matchedSlot.label.slice(2)}`,
        period: matchedSlot.period,
        month,
        year: String(kst.getFullYear()),
        created_at: Date.now(),
        tabs,
        column: { text: columnText, teaser: columnTeaser },
      });
      console.log(`[GENERATE] 에디션 저장: ${editionId}`);
    } else {
      console.log(`[GENERATE] 에디션 건너뜀 (슬롯 외 시간: ${hm})`);
    }
  } catch(e) {
    console.error('[GENERATE] 에디션 저장 실패:', e.message);
  }

  res.status(200).json({ done: true, results, ts: new Date().toISOString() });
}
