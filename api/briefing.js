export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { headlines, tab = 'economy', label = '경제', mock = false } = req.body;

  if (!headlines || !headlines.length) {
    return res.status(400).json({ error: 'No headlines provided' });
  }

  // SSE 헤더
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendToken = (text) => res.write(`data: ${JSON.stringify({ text })}\n\n`);
  const sendDone  = () => { res.write('data: [DONE]\n\n'); res.end(); };

  // Mock 모드 — API 호출 없이 스트리밍 동작 테스트
  if (mock) {
    const mockText =
`[SUMMARY]
줄1: 미국 연준이 기준금리를 동결하며 올해 인하 횟수를 2회로 제시했다. 파월 의장은 인플레이션 둔화가 예상보다 더딜 수 있다고 경고했다.
줄2: 금리 동결 소식에 뉴욕 증시는 혼조세로 마감했다. 달러화는 강세를 보이며 원/달러 환율이 1,340원대로 상승했다.
줄3: 고금리 장기화 우려가 커지는 만큼 성장주보다는 배당주·가치주 중심의 포트폴리오 재편이 필요한 시점이다.
[/SUMMARY]

[FOOTNOTES]
줄1: ※ 기준금리 동결 — 중앙은행이 현재 금리 수준을 유지하는 것. 올리지도 내리지도 않는 상태
줄2: ※ 혼조세 — 주식시장에서 일부 종목은 오르고 일부는 내리는 엇갈린 흐름
줄3: ※ 가치주 — 현재 실적 대비 주가가 낮게 평가된 주식. 금리 상승기에 상대적으로 안정적
[/FOOTNOTES]`;

    for (const char of mockText) {
      sendToken(char);
      await new Promise(r => setTimeout(r, 12));
    }
    sendDone();
    return;
  }

  // 실제 Claude API 스트리밍 호출
  const headlineText = headlines.map((h, i) => `${i + 1}. ${h}`).join('\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        stream: true,
        messages: [{
          role: 'user',
          content: `⚠️ 출력 형식 규칙 (반드시 준수):
- 마크다운 절대 사용 금지: **, *, #, ---, ___ 등 모든 마크다운 기호 사용 금지
- 지정된 레이블 형식만 사용할 것
- 섹션 태그([SUMMARY], [FOOTNOTES] 등) 그대로 출력할 것

아래는 오늘의 [${label}] 분야 주요 뉴스 헤드라인이야.

헤드라인:
${headlineText}

두 가지를 작성해줘.

[SUMMARY]
반드시 "줄1:", "줄2:", "줄3:" 레이블을 붙일 것. (마크다운 볼드 금지 — 줄1: 형식만 사용)
각 줄은 두 문장으로 구성하되, 아래 규칙을 반드시 따를 것:

규칙:
- 두 문장이 같은 이슈/맥락을 다루면 → 자연스럽게 이어서 한 줄로 작성
- 두 문장이 서로 다른 이슈를 다뤄야 한다면 → "• 문장1\n• 문장2" 형식으로 불릿 분리
- 억지로 무관한 이슈를 한 줄에 끼워 넣지 말 것.
- 모든 내용은 위 헤드라인에 근거할 것. 헤드라인에 없는 정보, 수치, 사실은 절대 만들어 쓰지 말 것.

줄1: (핵심 이슈 — 오늘 가장 중요한 이슈. 헤드라인에 있는 숫자만 포함)
줄2: (시장 흐름 — 줄1 이슈에 대한 시장 반응 또는 파급 흐름)
줄3: (투자 포인트 — 줄1/2 맥락에서 투자자가 지금 봐야 할 것)
[/SUMMARY]

[FOOTNOTES]
SUMMARY의 줄1/줄2/줄3에 등장한 용어 중, 독자가 그날 뉴스를 읽으며 "이게 뭐지?" 하고 실제로 궁금해할 단어를 줄별로 1~2개 골라 설명을 달아줘.

선택 기준 (둘 다 포함):
- ✅ 그날 뉴스 맥락에서 독자가 "이게 뭐지?" 하고 궁금해할 키워드 (예: "확전 자제", "차량 5부제", ECB, 금통위)
- ✅ 경제 입문자가 모를 전문 용어 (예: 스태그플레이션, 양적완화, 매파적 입장)
- ❌ 누구나 아는 단어는 제외 (환율, 금리, 물가, 주식, 수출 등)
- ❌ 설명해도 뉴스 이해에 별 도움이 안 되는 단어

규칙:
- 반드시 "줄1:", "줄2:", "줄3:" 레이블 사용 (마크다운 볼드 금지)
- 설명이 필요 없는 줄은 생략
- 형식: ※ [용어] — [설명]
- 영어/정식 명칭이 있는 용어는 괄호로 병기 예) 매파(Hawkish)적 입장
- 단순 개념은 한 문장으로 설명
- 경제 초보자도 이해할 수 있게 쉽고 간결하게
- ⚠️ 절대 규칙1: 해당 줄 본문에 실제로 등장한 단어만 설명할 것. 본문에 없는 단어를 임의로 추가하거나 유추해서 설명하지 말 것.
- ⚠️ 절대 규칙2: 오직 SUMMARY의 해당 줄 텍스트만 참조할 것.

예시:
줄1: ※ 확전 자제 — 전쟁이나 분쟁이 더 넓은 지역·국가로 번지지 않도록 군사적 행동을 억제하는 것
줄2: ※ ECB(유럽중앙은행) — 유로존 20개국의 통화정책을 총괄하는 중앙은행
[/FOOTNOTES]`
        }]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      res.write(`data: ${JSON.stringify({ error: errData.error?.message || `Anthropic API 오류 ${response.status}` })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 마지막 불완전 줄 보존

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            sendToken(parsed.delta.text);
          }
        } catch (e) { /* JSON 파싱 실패 무시 */ }
      }
    }

    sendDone();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
