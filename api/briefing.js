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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `아래 뉴스 헤드라인 중 투자자/경제 입문자 관점에서 가장 중요한 5개를 골라 브리핑해줘.

헤드라인:
${headlineText}

선별 기준:
- 거시경제(환율/금리/물가/GDP), 글로벌 시장, 주요 산업 중심
- 구직/채용/지역행사/단순 기업 홍보 제외
- 숫자/데이터 있으면 반드시 포함

각 이슈마다 반드시 포함할 것:
- 이게 왜 지금 중요한지 (배경)
- 시장/내 자산에 구체적으로 어떤 영향인지 (숫자 포함)
- 개인투자자가 지금 당장 어떻게 행동해야 하는지 (액션 포인트)

형식:
1️⃣ [제목]
📌 배경: [왜 지금 중요한지 - 맥락 설명]
📊 영향: [구체적 수치와 함께 시장 영향]
💼 액션: [개인투자자가 지금 취해야 할 행동]

(2~5번 동일)

💡 오늘의 한마디: [경제 초보자도 이해할 수 있는 오늘 시장 핵심 메시지 - 비유나 쉬운 언어로]`
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic API error:', JSON.stringify(data));
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content?.[0]?.text || '브리핑 생성 실패';
    res.status(200).json({ briefing: text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
