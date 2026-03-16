export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 4
        }],
        messages: [{
          role: 'user',
          content: `오늘(${today}) 한국 및 글로벌 주요 경제 뉴스를 검색해서 핵심 5가지만 간결하게 브리핑해줘.

형식:
1️⃣ [제목]
📌 배경: [한줄]
📊 영향: [한줄]
🔮 전망: [한줄]

(2~5번 동일)

💡 오늘의 투자 포인트: [한줄]`
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic API error:', JSON.stringify(data));
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    res.status(200).json({ briefing: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
