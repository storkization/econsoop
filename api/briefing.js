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
오늘 핵심 이슈를 유튜브 자극적 제목처럼 한 줄로. 이모티콘 1~2개. 30자 이내.
아래 5가지 유형 중 오늘 뉴스에 가장 임팩트 있는 스타일을 골라 써라. 혼합도 가능:
① 공포/위기형: "최악의 시나리오 시작됐습니다", "지금 당장 이거 파세요"
② 반전/폭로형: "전문가들이 숨기는 진짜 이유", "언론이 말 안 해주는 것"
③ 긴박함/시간압박형: "오늘 딱 하루입니다", "지금 안 보면 후회합니다"
④ 개인화/직접 지목형: "대출 있으신 분 필독", "30-40대라면 이건 꼭 아셔야"
⑤ 숫자/구체성형: "0.25%가 1억을 바꿉니다", "딱 3가지만 기억하세요"
독자가 멈칫하게 만들어야 한다.
[/HEADLINE]

[SUBHEADING]
헤드라인 아래 부연설명 한 줄. 독자가 "왜?"라고 묻기 전에 답을 주는 문장. 40자 이내. 이모티콘 없이 간결하게.
[/SUBHEADING]

[POINT1]
오늘 뉴스가 독자의 일상과 어떻게 맞닿아 있는지에서 시작하라.
"요즘 OO 느끼고 계신 분들, 그게 바로 이것 때문입니다" 식으로 독자의 현실에서 출발해 핵심 사실로 연결.
헤드라인에 있는 수치·사실만 사용. 없는 정보 절대 만들지 말 것.
최소 2문장, 최대 3문장.
[/POINT1]

[HEADING2]
배경(왜 지금?) 섹션의 제목. 아래 5가지 유형 중 이 섹션 내용에 가장 어울리는 스타일을 골라 써라:
① 공포/위기형 ② 반전/폭로형 ③ 긴박함형 ④ 개인화형 ⑤ 숫자/구체성형
이모티콘 1개. 25자 이내.
[/HEADING2]

[SUBHEADING2]
HEADING2 아래 부연 한 줄. 구조적 원인을 한 문장으로. 30자 이내.
[/SUBHEADING2]

[POINT2]
왜 지금 이 타이밍인지 — 추상적 정책 사이클이 아니라, 독자가 "아, 그래서 내가 요즘 이런 느낌이었구나" 하게 만들어라.
헤드라인에 없는 구조적 맥락은 전문 지식으로 직접 작성하되, 반드시 독자의 체감과 연결할 것.
POINT1 반복 금지.
최소 2문장, 최대 3문장.
[/POINT2]

[HEADING3]
시장 영향 섹션의 제목. 아래 5가지 유형 중 이 섹션 내용에 가장 어울리는 스타일을 골라 써라:
① 공포/위기형 ② 반전/폭로형 ③ 긴박함형 ④ 개인화형 ⑤ 숫자/구체성형
이모티콘 1개. 25자 이내.
[/HEADING3]

[SUBHEADING3]
HEADING3 아래 부연 한 줄. 파급 흐름 핵심을 한 문장으로. 30자 이내.
[/SUBHEADING3]

[POINT3]
시장 반응을 내 통장·내 주식·내 대출·내 소비 언어로 번역해서 전달하라.
"섹터", "자산군" 같은 추상어 대신 "지금 예금 넣으신 분", "달러 들고 계신 분", "주택담보대출 있으신 분" 식으로.
POINT1·2 반복 금지.
최소 2문장, 최대 3문장.
[/POINT3]

[HEADING4]
투자 전략 섹션의 제목. 아래 5가지 유형 중 이 섹션 내용에 가장 어울리는 스타일을 골라 써라:
① 공포/위기형 ② 반전/폭로형 ③ 긴박함형 ④ 개인화형 ⑤ 숫자/구체성형
이모티콘 1개. 25자 이내.
[/HEADING4]

[SUBHEADING4]
HEADING4 아래 부연 한 줄. 핵심 판단 기준을 한 문장으로. 30자 이내.
[/SUBHEADING4]

[POINT4]
"지금 이런 상황인 분이라면 이걸 보세요" 형식으로.
추상적 시나리오 분기가 아니라, 독자가 자신의 상황에 바로 대입할 수 있는 구체적 행동 단서를 줄 것.
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
