export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { headlines } = req.body;

  if (!headlines || !headlines.length) {
    return res.status(400).json({ error: 'No headlines provided' });
  }

  try {
    const headlineText = headlines.map((h, i) => `${i + 1}. ${h}`).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `다음 오늘의 경제 뉴스 헤드라인을 보고, 투자자 관점에서 오늘 꼭 알아야 할 핵심 3가지를 브리핑해줘.

헤드라인:
${headlineText}

아래 형식으로 작성해줘 (이모지 포함, 간결하게):

1️⃣ [핵심 이슈 제목]
→ [한 줄 투자 시사점]

2️⃣ [핵심 이슈 제목]
→ [한 줄 투자 시사점]

3️⃣ [핵심 이슈 제목]
→ [한 줄 투자 시사점]

💡 오늘의 한마디: [전체 시장 흐름 한 줄 요약]`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '브리핑 생성 실패';

    res.status(200).json({ briefing: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
