// 7일 스파크라인 + 현재가
//  - closes(미니차트)는 야후 차트에서
//  - 한국 지수(KOSPI/KOSDAQ)의 현재가·등락률은 네이버 KRX 실시간으로 보정 (실패 시 야후 유지)

function parseNum(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

async function fetchNaverIndex(naverCode) {
  try {
    const r = await fetch(`https://polling.finance.naver.com/api/realtime/domestic/index/${naverCode}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://finance.naver.com/' },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const d = j?.datas?.[0];
    if (!d) return null;
    const price = parseNum(d.closePrice);
    const pct = parseNum(d.fluctuationsRatio);
    if (price == null || pct == null) return null;
    const prev = price / (1 + pct / 100);
    return { price, chg: price - prev, pct };
  } catch { return null; }
}

const KR_INDEX = { '^KS11': 'KOSPI', '^KQ11': 'KOSDAQ' };

export default async function handler(req, res) {
  const { sym } = req.query;
  if (!sym) return res.status(400).json({ error: 'sym required' });

  const hosts = ['query1', 'query2'];
  for (const host of hosts) {
    try {
      const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=7d`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(7000),
      });
      const j = await r.json();
      const result = j?.chart?.result?.[0];
      const closes = result?.indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (closes?.length >= 2) {
        const meta = result.meta;
        let price = meta?.regularMarketPrice ?? closes[closes.length - 1];
        let prev  = meta?.chartPreviousClose ?? closes[closes.length - 2];
        let chg   = price - prev;
        let pct   = prev ? (chg / prev) * 100 : 0;

        // 한국 지수는 네이버 실시간 값으로 현재가·등락률 보정 (차트는 야후 유지)
        const naverCode = KR_INDEX[sym];
        if (naverCode) {
          const nv = await fetchNaverIndex(naverCode);
          if (nv) { price = nv.price; chg = nv.chg; pct = nv.pct; }
        }

        res.setHeader('Cache-Control', 's-maxage=60');
        return res.status(200).json({ closes, price, chg, pct });
      }
    } catch {}
  }
  return res.status(502).json({ error: 'failed' });
}
