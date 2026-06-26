// 시세 단건 조회
//  - 한국 종목(.KS/.KQ) → 네이버 금융(KRX 실시간). 실패 시 야후로 폴백
//  - 미국 종목 → 야후 파이낸스 (미국은 야후가 정확)

function parseNum(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// 네이버 국내 실시간 (path 예: stock/005930, index/KOSPI)
async function fetchNaverDomestic(path) {
  try {
    const r = await fetch(`https://polling.finance.naver.com/api/realtime/domestic/${path}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://finance.naver.com/' },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const d = j?.datas?.[0];
    if (!d) return null;
    const price = parseNum(d.closePrice);
    const pct = parseNum(d.fluctuationsRatio);     // 부호 포함 (예: -5.43)
    if (price == null || pct == null) return null;
    const prev = price / (1 + pct / 100);
    const chg = price - prev;
    return { price, chg, pct, source: 'naver' };
  } catch { return null; }
}

async function fetchYahoo(sym) {
  const hosts = ['query1', 'query2'];
  for (const host of hosts) {
    try {
      const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(7000),
      });
      const j = await r.json();
      const meta = j?.chart?.result?.[0]?.meta;
      if (!meta) continue;
      const price = meta.regularMarketPrice ?? meta.chartPreviousClose;
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      if (price == null) continue;
      const chg = price - (prev ?? price);
      const pct = prev ? (chg / prev) * 100 : 0;
      return { price, chg, pct, source: 'yahoo' };
    } catch {}
  }
  return null;
}

export default async function handler(req, res) {
  const { sym } = req.query;
  if (!sym) return res.status(400).json({ error: 'sym required' });

  // 한국 종목: 네이버 우선
  const krMatch = /^(\d{6})\.(KS|KQ)$/i.exec(sym);
  if (krMatch) {
    const nv = await fetchNaverDomestic(`stock/${krMatch[1]}`);
    if (nv) {
      res.setHeader('Cache-Control', 's-maxage=30');
      return res.status(200).json(nv);
    }
  }

  // 미국 종목 + 네이버 실패 시 폴백
  const yq = await fetchYahoo(sym);
  if (yq) {
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(200).json(yq);
  }
  return res.status(502).json({ error: 'failed' });
}
