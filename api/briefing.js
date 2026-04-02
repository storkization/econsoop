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
        max_tokens: 2200,
        messages: [{
          role: 'user',
          content: `⚠️ 출력 형식 규칙 (반드시 준수):
- 마크다운 절대 사용 금지: **, *, #, ---, ___ 등 모든 마크다운 기호 사용 금지
- 지정된 레이블/태그 형식만 사용할 것

너는 15년 경력의 글로벌 매크로 이코노미스트야.
글을 쓸 때는 친한 선배가 독자 옆에서 편하게 설명해주는 말투로 — 자연스러운 존댓말, 너무 딱딱하지 않게.

아래는 오늘의 [${label}] 분야 주요 뉴스 헤드라인이야.

헤드라인:
${headlineText}

아래 순서대로 작성해줘.

[HEADLINE]
오늘 핵심 이슈를 유튜브 썸네일처럼 자극적으로 한 줄로. 이모티콘 1~2개 포함. 30자 이내.
독자가 멈칫하게 만들어야 해. "설마?", "대박", "충격" 같은 감정을 유발하도록.
예시 스타일: "🚨 금리 동결인데 집값 또 오른다고?!", "💥 중국發 쇼크, 한국 수출 직격탄"
[/HEADLINE]

[SUBHEADING]
헤드라인 아래 부연설명 한 줄. 독자가 "왜?"라고 묻기 전에 답을 주는 문장. 40자 이내. 이모티콘 없이 간결하게.
[/SUBHEADING]

[POINT1]
오늘 가장 중요한 뉴스가 무엇인지. 이 뉴스를 처음 접하는 사람도 상황이 바로 그려지도록.
헤드라인에 있는 수치·사실만 사용할 것. 없는 정보 절대 만들지 말 것.
최소 2문장, 최대 3문장.
[/POINT1]

[HEADING2]
배경(왜 지금?) 섹션의 제목. 독자가 "어? 이게 왜지?" 하고 멈추게 만들 것.
이모티콘 1개. 25자 이내. 예시: "🕰️ 3년 전부터 예고된 시한폭탄", "🌐 미국발 도미노, 한국이 첫 번째 도미노"
[/HEADING2]

[SUBHEADING2]
HEADING2 아래 부연 한 줄. 구조적 원인을 한 문장으로. 30자 이내.
[/SUBHEADING2]

[POINT2]
왜 지금 이 타이밍에 이런 일이 생겼는지.
POINT1 내용 절대 반복 금지 — 독자는 이미 읽었다.
헤드라인에 없는 구조적 맥락(정책 사이클, 역사적 전례, 글로벌 자금 흐름 등)은 전문 지식으로 직접 작성할 것.
최소 2문장, 최대 3문장.
[/POINT2]

[HEADING3]
시장 영향 섹션의 제목. "내 돈이 어떻게 되는 거야?"라는 공포심 또는 기대감을 자극할 것.
이모티콘 1개. 25자 이내. 예시: "📉 주식·부동산 동시 충격 오나?", "💸 환율 1,500원 시대, 이미 시작됐다"
[/HEADING3]

[SUBHEADING3]
HEADING3 아래 부연 한 줄. 파급 흐름 핵심을 한 문장으로. 30자 이내.
[/SUBHEADING3]

[POINT3]
즉각적인 시장 반응에서 시작해 2차·3차 파급 효과까지.
주가·환율·채권의 직접 반응뿐 아니라, 다른 섹터·자산군·실물경제로 어떻게 번지는지 흐름을 짚어줄 것.
POINT1·2 반복 금지.
최소 2문장, 최대 3문장.
[/POINT3]

[HEADING4]
투자 전략 섹션의 제목. "그래서 나는 뭘 해야 하지?"라는 실행 욕구를 자극할 것.
이모티콘 1개. 25자 이내. 예시: "🎯 지금 당장 확인해야 할 딱 한 가지", "⚡ 이 시나리오면 전략을 바꿔야 한다"
[/HEADING4]

[SUBHEADING4]
HEADING4 아래 부연 한 줄. 핵심 판단 기준을 한 문장으로. 30자 이내.
[/SUBHEADING4]

[POINT4]
지금 투자자가 실제로 어디를 봐야 하는지.
"A면 B, 아니면 C" 구조로 구체적인 시나리오 분기점을 제시할 것. 추상적 전망 금지.
POINT1·2·3 반복 금지.
최소 2문장, 최대 3문장.
[/POINT4]

[FOOTNOTES]
각 포인트 본문에 실제로 등장한 단어 중에서만 선택. 포인트당 1~2개.

✅ 뽑아야 하는 단어:
- 경제 뉴스를 막 보기 시작한 사람이 "이게 뭐지?" 할 법한 것
- 영어 약자·기관명 (ECB, FOMC, CPI, ISM 등)
- 경제 전문 용어 (스태그플레이션, 양적완화, 매파적 입장 등)
- 그날 뉴스 특유의 표현 (확전 자제, 긴급 유동성 등)

❌ 절대 뽑지 말 것:
- 누구나 아는 단어 (환율, 금리, 물가, 주식, 수출, 경기 등)
- 본문에 없는 단어를 임의로 추가하는 것
- 설명해도 뉴스 이해에 별 도움 안 되는 단어

형식: 포인트N: ※ 용어(영문 있으면 병기) — 설명 (1문장, 쉽고 간결하게)
확신 없으면 생략. 억지로 채우지 말 것.
[/FOOTNOTES]

[COLUMN_HOOK]
오늘의 심층 칼럼 예고 제목. 독자가 "이거 꼭 읽어야겠다"는 생각이 들도록.

규칙:
- 위 POINT1~4에서 다룬 내용 중 가장 파급력 있는 이슈를 기반으로 할 것 (할루시네이션 금지)
- "당신이 모르는", "지금 당장", "충격", "폭탄", "진짜 이유" 같은 감정을 자극하는 표현 사용
- 질문형("~라고?", "~인가?") 또는 반전형("~인데 사실은...") 구조 권장
- 이모티콘 1개 포함
- 40자 이내
- 예시: "💣 금리 동결인데 집값 또 오른다? 당신이 모르는 진짜 이유"
- 예시: "🔥 미국이 한국을 겨냥했다 — 관세 폭탄의 숨겨진 타깃"
- 예시: "⚠️ 지금 예금 들면 손해? 전문가들이 말 못 하는 속사정"
[/COLUMN_HOOK]`
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

    // 각 카드 헤딩/서브헤딩 파싱
    const parse = (tag) => { const m = fullText.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`)); return m ? m[1].trim() : ''; };
    const headline    = parse('HEADLINE');
    const subheading  = parse('SUBHEADING');
    const heading2    = parse('HEADING2');
    const subheading2 = parse('SUBHEADING2');
    const heading3    = parse('HEADING3');
    const subheading3 = parse('SUBHEADING3');
    const heading4    = parse('HEADING4');
    const subheading4 = parse('SUBHEADING4');

    // 포인트 파싱
    const extractPoint = (n) => {
      const m = fullText.match(new RegExp(`\\[POINT${n}\\]([\\s\\S]*?)\\[\\/POINT${n}\\]`));
      if (m) return m[1].trim();
      const next = n < 4 ? `\\[POINT${n+1}\\]` : '\\[FOOTNOTES\\]';
      const fb = fullText.match(new RegExp(`\\[POINT${n}\\]([\\s\\S]*?)(?=${next}|$)`));
      return fb ? fb[1].trim() : '';
    };

    const p1 = extractPoint(1);
    const p2 = extractPoint(2);
    const p3 = extractPoint(3);
    const p4 = extractPoint(4);

    const summary = [
      p1 ? `포인트1: ${p1}` : '',
      p2 ? `포인트2: ${p2}` : '',
      p3 ? `포인트3: ${p3}` : '',
      p4 ? `포인트4: ${p4}` : '',
    ].filter(Boolean).join('\n\n');

    const footnotesMatch = fullText.match(/\[FOOTNOTES\]([\s\S]*?)\[\/FOOTNOTES\]/);
    const footnotes = footnotesMatch ? footnotesMatch[1].trim() : '';

    const columnHookMatch = fullText.match(/\[COLUMN_HOOK\]([\s\S]*?)\[\/COLUMN_HOOK\]/);
    const columnHook = columnHookMatch ? columnHookMatch[1].trim() : '';

    console.log('[BRIEFING] 파싱 — summary:', summary.length, 'headline:', headline.length, 'columnHook:', columnHook.length);

    if (!summary) {
      console.error('[BRIEFING] 파싱 실패! fullText 앞 500자:', fullText.slice(0, 500));
    }

    res.status(200).json({ summary, footnotes, headline, subheading, heading2, subheading2, heading3, subheading3, heading4, subheading4, columnHook });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
