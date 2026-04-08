export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL' });

  try {
    const response = await fetch(decodeURIComponent(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });

    if (!response.ok) return res.status(404).json({ error: 'Fetch failed' });

    const html = await response.text();

    // OG image 추출 (순서대로 시도)
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];

    const BAD_PATTERNS = ['logo', 'favicon', 'icon', 'banner', 'default', 'blank', 'placeholder', 'no-image', 'noimage', '/ad/', '/ads/', 'spinner', 'loading'];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1] && match[1].startsWith('http')) {
        const url = match[1].toLowerCase();
        if (BAD_PATTERNS.some(p => url.includes(p))) continue;
        return res.status(200).json({ imageUrl: match[1] });
      }
    }

    return res.status(404).json({ error: 'No image found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
