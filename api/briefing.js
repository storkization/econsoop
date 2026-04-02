export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { headlines, tab = 'economy', label = '경제' } = req.body;

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
        model: 'claude-sonnet-4-6',
        max_tokens: 2400,
        messages: [{
          role: 'user',
          content: `⚠️ 출력 형식 규칙 (반드시 준수):
- 마크다운 절대 사용 금지: **, *, #, ---, ___ 등 모든 마크다운 기호 사용 금지
- 지정된 레이블 형식만 사용할 것
- 섹션 태그([POINT1] 등) 그대로 출력할 것

아래는 오늘의 [${label}] 분야 주요 뉴스 헤드라인이야.

헤드라인:
${headlineText}

너는 15년 경력의 글로벌 매크로 이코노미스트야. 글을 쓸 때는 딱딱한 보고서 말투가 아니라, 친한 선배가 독자 옆에 앉아서 커피 한 잔 마시며 설명해주는 것처럼 친근하고 자연스럽게 써줘. 자연스러운 존댓말로, 너무 캐주얼하지 않게. 문장은 충분히 길고 풍부하게 — 핵심을 담되 독자가 읽으면서 고개를 끄덕일 수 있도록.

아래 4가지 포인트를 작성해줘. 각 포인트는 3~5문장으로 충분히 설명할 것.

[POINT1]
포인트1: 핵심 이슈 — 오늘 가장 중요한 뉴스가 무엇인지, 어떤 상황인지 독자가 바로 그림이 그려지도록 설명해줘. 헤드라인에 있는 수치만 사용할 것.
[/POINT1]

[POINT2]
포인트2: 배경 — 왜 지금 이 타이밍에 이런 일이 생겼는지. 포인트1을 단순 반복하지 말고, 독자가 "아, 그래서 지금 이런 거구나" 하고 맥락을 이해할 수 있도록 구조적 배경(정책 사이클, 글로벌 자금 흐름, 역사적 전례 등)을 풀어서 설명해줘.
[/POINT2]

[POINT3]
포인트3: 시장 영향 — 이 뉴스에 시장이 어떻게 반응했고, 앞으로 어디까지 파급될지. 당장의 반응뿐 아니라 다른 섹터·자산군·실물경제로 어떻게 번져나갈 수 있는지 2차·3차 흐름까지 짚어줘.
[/POINT3]

[POINT4]
포인트4: 투자 전략 — 투자자 입장에서 지금 어디를 봐야 하는지 구체적으로 알려줘. "A면 B, 아니면 C" 시나리오 구조로 앞으로의 분기점을 짚되, 추상적 전망이 아닌 실제로 행동에 도움이 되는 내용으로.
[/POINT4]

[FOOTNOTES]
포인트1~4 본문에 실제로 등장한 단어 중, 독자가 "이게 뭐지?" 할 만한 용어를 골라 쉽게 설명해줘.

선택 기준:
- ✅ 그날 뉴스 맥락에서 독자가 궁금해할 키워드 (예: 금통위, ECB, 확전 자제)
- ✅ 경제 입문자가 모를 전문 용어 (예: 스태그플레이션, 양적완화, 매파적 입장)
- ❌ 누구나 아는 단어 제외 (환율, 금리, 물가, 주식, 수출 등)

규칙:
- 반드시 "포인트N:" 레이블 사용
- 형식: ※ [용어] — [설명] (쉽고 간결하게, 1문장)
- 영어/정식 명칭이 있으면 괄호 병기 예) 매파(Hawkish)적 입장
- 설명 없는 포인트는 생략
- ⚠️ 해당 포인트 본문에 실제로 등장한 단어만 설명할 것
[/FOOTNOTES]`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Anthropic API error:', JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || JSON.stringify(data) });
    }

    const fullText = data.content?.[0]?.text || '';
    console.log('[BRIEFING] fullText 길이:', fullText.length);

    // 포인트 파싱
    const extractPoint = (n) => {
      const m = fullText.match(new RegExp(`\\[POINT${n}\\]([\\s\\S]*?)\\[\\/POINT${n}\\]`));
      if (m) return m[1].trim();
      // 폴백: 포인트N: 레이블로 추출
      const next = n < 4 ? `포인트${n+1}:` : '\\[FOOTNOTES\\]';
      const fb = fullText.match(new RegExp(`포인트${n}:\\s*([\\s\\S]*?)(?=${next}|$)`));
      return fb ? fb[1].trim() : '';
    };

    const p1 = extractPoint(1);
    const p2 = extractPoint(2);
    const p3 = extractPoint(3);
    const p4 = extractPoint(4);

    // 포인트들을 하나의 summary 텍스트로 합침 (기존 캐시 구조 호환)
    const summary = [
      p1 ? `포인트1: ${p1}` : '',
      p2 ? `포인트2: ${p2}` : '',
      p3 ? `포인트3: ${p3}` : '',
      p4 ? `포인트4: ${p4}` : '',
    ].filter(Boolean).join('\n\n');

    const footnotesMatch = fullText.match(/\[FOOTNOTES\]([\s\S]*?)\[\/FOOTNOTES\]/);
    const footnotes = footnotesMatch ? footnotesMatch[1].trim() : '';

    console.log('[BRIEFING] 파싱 — summary:', summary.length, 'footnotes:', footnotes.length);

    if (!summary) {
      console.error('[BRIEFING] 파싱 실패! fullText 앞 500자:', fullText.slice(0, 500));
    }

    res.status(200).json({ summary, footnotes });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
