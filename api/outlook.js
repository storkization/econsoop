export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers['authorization'];
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { headlines = [], quotes = {} } = req.body;
  if (!headlines.length && !Object.keys(quotes).length) {
    return res.status(400).json({ error: 'No input' });
  }

  try {
    const quoteText = Object.entries(quotes)
      .map(([name, q]) => `- ${name}: ${q.price} (${q.pct > 0 ? '+' : ''}${Number(q.pct).toFixed(2)}%)`)
      .join('\n');
    const headlineText = headlines.map((h, i) => `${i + 1}. ${h}`).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(60000),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `⚠️ 마크다운 절대 금지(**, *, #, --- 등). 지정 태그만 사용.

너는 15년 경력 증시 전략가. 친한 선배가 아침에 커피 마시며 편하게 설명하는 말투(자연스러운 존댓말).

밤사이 마감 시세:
${quoteText || '(시세 없음)'}

오늘 아침 브리핑 요약:
${headlineText || '(헤드라인 없음)'}

🎯 임무: "오늘 한국 증시, 앞으로 어떻게 될까?"에 답하는 아침 전망 노트.

⚠️ 절대 규칙:
- 위 시세·요약에 없는 사실·수치 창작 금지. 전망은 "~할 가능성", "~에 주목" 같은 조건부 표현으로만.
- 특정 종목 매수/매도 권유 금지 ("사세요/파세요/담으세요/비중 확대" 금지).
- "충격!/경고!/긴급!" 싸구려 자극 금지. 독자는 50~60대 일반인.

[HEADLINE] 오늘 증시 전망 한 줄. 구체 수치·고유명사 포함. 이모지 1개. 30자 이내. [/HEADLINE]

[BODY] 3~5문장, 해요체. 흐름: ①밤사이 미국 증시가 어땠는지 → ②그게 오늘 한국 시장에 왜 중요한지(인과관계 명확히) → ③오늘 방향이 갈릴 수 있는 변수. 쉬운 말로, 낯선 수치는 친숙한 기준과 짝짓기. [/BODY]

[WATCH] 오늘 체크할 포인트 2~3개. 각 줄을 "· "로 시작, 한 줄 20자 이내, 줄바꿈으로 구분. [/WATCH]`
        }]
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      console.error('[OUTLOOK] Anthropic API error:', JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || JSON.stringify(data) });
    }

    const fullText = data.content?.[0]?.text || '';
    const parse = (tag) => {
      const m = fullText.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`));
      return m ? m[1].trim() : '';
    };

    const headline = parse('HEADLINE');
    const body = parse('BODY');
    const watch = parse('WATCH');

    if (!body) {
      console.error('[OUTLOOK] 파싱 실패! fullText 앞 300자:', fullText.slice(0, 300));
      return res.status(500).json({ error: 'parse failed' });
    }

    res.status(200).json({ headline, body, watch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
