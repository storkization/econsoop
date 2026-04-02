import crypto from 'crypto';

// ── Firebase 인증 ──────────────────────────────────────────
async function getFirebaseToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const sig = sign.sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${sig}`;

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Firebase token 발급 실패: ' + JSON.stringify(d));
  return d.access_token;
}

// ── Firestore 쓰기 ─────────────────────────────────────────
async function firestoreWrite(projectId, docPath, fields, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, { stringValue: String(v) }])
      ),
    }),
  });
  if (!r.ok) throw new Error(`Firestore 쓰기 실패: ${await r.text()}`);
}

// ── 탭 설정 ────────────────────────────────────────────────
const SUMMARY_QUERIES = {
  economy:  ['한국은행 금리', '원달러 환율 외환', '코스피 증시 금융시장', '물가 인플레이션 소비', '수출 무역 경상수지', '가계부채 대출', '경제 오늘 주요뉴스'],
  industry: ['반도체 전자', '자동차 배터리 전기차', '바이오 헬스 제약', '건설 부동산', '경영 재계 M&A'],
  global:   ['미국 연준 Fed 관세 무역', '중국 경제 위안화 무역분쟁', '일본 엔화 닛케이 일본은행', '유럽 ECB 유로존 독일', '국제유가 OPEC 중동 에너지', '국제경제 오늘 주요뉴스'],
};
const TAB_LABEL = { economy: '경제', industry: '산업', global: '국제' };

// ── 메인 핸들러 ────────────────────────────────────────────
export default async function handler(req, res) {
  // Vercel Cron은 자동으로 Authorization: Bearer CRON_SECRET 헤더를 붙임
  const auth = req.headers['authorization'];
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const token = await getFirebaseToken(sa);
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

      const { summary, footnotes } = await briefingRes.json();
      if (!summary) throw new Error('브리핑 파싱 실패');

      // 3. Firestore 저장
      await firestoreWrite(sa.project_id, `briefings/${tab}`, {
        summary,
        footnotes: footnotes || '',
        created_at: Date.now().toString(),
      }, token);

      results.push({ tab, ok: true, len: summary.length });
      console.log(`[GENERATE] ${tab} 완료 (${summary.length}자)`);
    } catch(err) {
      console.error(`[GENERATE] ${tab} 실패:`, err.message);
      results.push({ tab, ok: false, error: err.message });
    }
  }

  res.status(200).json({ done: true, results, ts: new Date().toISOString() });
}
