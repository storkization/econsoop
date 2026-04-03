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

// ── 탭 설정 ────────────────────────────────────────────────
const SUMMARY_QUERIES = {
  economy:  ['한국은행 금리', '원달러 환율 외환', '코스피 증시 금융시장', '물가 인플레이션 소비', '수출 무역 경상수지', '가계부채 대출', '경제 오늘 주요뉴스'],
  industry: ['반도체 전자', '자동차 배터리 전기차', '바이오 헬스 제약', '건설 부동산', '경영 재계 M&A'],
  global:   ['미국 연준 Fed 관세 무역', '중국 경제 위안화 무역분쟁', '일본 엔화 닛케이 일본은행', '유럽 ECB 유로존 독일', '국제유가 OPEC 중동 에너지', '국제경제 오늘 주요뉴스'],
};
const TAB_LABEL = { economy: '경제', industry: '산업', global: '국제' };

// ── 메인 핸들러 ────────────────────────────────────────────
export default async function handler(req, res) {
  const auth = req.headers['authorization'];
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const host = req.headers.host;
  const results = [];

  for (const tab of ['economy', 'industry', 'global']) {
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

      // 2. Claude 브리핑 생성
      const briefingRes = await fetch(`https://${host}/api/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines, tab, label: TAB_LABEL[tab] }),
      });
      if (!briefingRes.ok) throw new Error(`briefing API 오류 ${briefingRes.status}`);

      const { summary, footnotes, headline, subheading, heading2, subheading2, heading3, subheading3, heading4, subheading4, columnHook } = await briefingRes.json();
      if (!summary) throw new Error('브리핑 파싱 실패');

      // 3. Firestore 저장 (최신 캐시 — 덮어쓰기)
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

      results.push({ tab, ok: true, len: summary.length });
      console.log(`[GENERATE] ${tab} 완료 (${summary.length}자)`);
    } catch(err) {
      console.error(`[GENERATE] ${tab} 실패:`, err.message);
      results.push({ tab, ok: false, error: err.message });
    }
  }

  res.status(200).json({ done: true, results, ts: new Date().toISOString() });
}
