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
          content: `⚠️ 마크다운 절대 금지(**, *, #, --- 등). 지정 태그만 사용.

너는 15년 경력 글로벌 매크로 이코노미스트. 친한 선배가 옆에서 편하게 설명하는 말투(자연스러운 존댓말).

글쓰기 기법 4가지 혼합: ①비유(경제→일상 치환) ②에너지/구어체(감탄사·반전 연결어) ③스토리텔링(구체적 사람·상황→경제 연결) ④위트/반전(예상을 뒤집는 구조)

헤딩 스타일 5가지 중 맥락에 맞게 선택: ①공포/위기형 ②반전/폭로형 ③긴박함형 ④개인화형 ⑤숫자/구체성형
❌금지: 막연한 지목("이 종목 가진 분 필독"), 단순 책임 전가("OO발 쇼크"). 개인화 시 오늘 뉴스의 구체적 맥락(금액·상황·결정)을 담을 것.

오늘의 [${label}] 뉴스:
${headlineText}

[HEADLINE] 핵심 이슈를 위 헤딩 스타일로. 이모티콘 1~2개. 30자 이내. [/HEADLINE]
[SUBHEADING] 헤드라인 부연 한 줄. 40자 이내. 이모티콘 없이. [/SUBHEADING]

[POINT1] 독자 일상에서 시작. ③으로 열고 ①②로 핵심 전달. 헤드라인 수치·사실만 사용, 없는 정보 금지. 2~3문장. [/POINT1]

[HEADING2] 배경 섹션 제목. 위 5가지 스타일 중 선택. 이모티콘 1개. 25자 이내. [/HEADING2]
[SUBHEADING2] 구조적 원인 한 문장. 30자 이내. [/SUBHEADING2]
[POINT2] 이 타이밍인 이유. ①이나 ④로. 독자 체감과 연결. POINT1 반복 금지. 2~3문장. [/POINT2]

[HEADING3] 시장 영향 섹션 제목. 위 5가지 스타일 중 선택. 이모티콘 1개. 25자 이내. [/HEADING3]
[SUBHEADING3] 파급 흐름 핵심 한 문장. 30자 이내. [/SUBHEADING3]
[POINT3] 내 통장·내 주식·내 대출 언어로 번역. ②나 ④로. POINT1·2 반복 금지. 2~3문장. [/POINT3]

[HEADING4] 투자 전략 섹션 제목. 위 5가지 스타일 중 선택. 이모티콘 1개. 25자 이내. [/HEADING4]
[SUBHEADING4] 핵심 판단 기준 한 문장. 30자 이내. [/SUBHEADING4]
[POINT4] 독자가 자신 상황에 대입할 구체적 행동 단서. ③으로 열고 ④로 마무리. POINT1·2·3 반복 금지. 2~3문장. [/POINT4]

[FOOTNOTES]
각 포인트에 실제 등장한 단어 중 비전문가가 모를 것만. 포인트당 1~2개.
뽑을 것: 영어 약자·기관명(ECB, FOMC, CPI 등), 경제 전문용어, 그날 특유 표현
뽑지 말 것: 누구나 아는 단어, 본문에 없는 단어
형식: 포인트N: ※ 용어(영문병기) — 설명 1문장. 확신 없으면 생략.
[/FOOTNOTES]

[COLUMN_HOOK]
POINT1~4 기반 심층 칼럼 예고. 감정 자극 표현 사용. 이모티콘 1개. 40자 이내.
예: "💣 금리 동결인데 집값 또 오른다? 당신이 모르는 진짜 이유"
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
