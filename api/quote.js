export default async function handler(req, res) {
  const { sym } = req.query;
  if (!sym) return res.status(400).json({ error: 'sym required' });

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
      const prev  = meta.chartPreviousClose ?? meta.previousClose;
      if (price == null) continue;
      const chg = price - (prev ?? price);
      const pct = prev ? (chg / prev) * 100 : 0;
      res.setHeader('Cache-Control', 's-maxage=300');
      return res.status(200).json({ price, chg, pct });
    } catch {}
  }
  return res.status(502).json({ error: 'failed' });
}
