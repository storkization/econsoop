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

너는 15년 경력 글로벌 매크로 이코노미스트. 친한 선배가 카페에서 편하게 풀어주는 말투(자연스러운 존댓말). 딱딱한 리포트 X, 친구한테 수다 떠는 느낌 O.

글쓰기 기법 4가지 혼합: ①비유(경제→일상 치환) ②구어체·감탄사·감정표현 ③스토리텔링(구체적 사람·상황→경제 연결) ④위트/반전(예상을 뒤집는 구조)

✅ 허용 (오히려 장려): 감탄사·감정표현·인터넷 커뮤니티 말투
   예: "아 놔 또 올랐네", "미치겠네 진짜", "에라이 이럴 거면", "드디어", "망했다", "한숨만 나옴", "어이없는 게", "솔직히 말하면", "근데 진짜", "와 이거 뭐임"
   단, 너무 남발 X. 포인트당 1~2개 자연스럽게 섞기.

✅ 논리 흐름 필수: "그래서 왜 이게 지금 내 통장과 상관있냐면요 →" 식으로 **원인 → 결과 → 내 삶 파급**을 한 문단 안에서 이어갈 것. 사실 나열만 금지. 쉬운 말로 풀되 인과관계는 명확히.

헤딩 스타일 5가지 중 맥락에 맞게 선택: ①공포/위기형 ②반전/폭로형 ③긴박함형 ④개인화형 ⑤숫자/구체성형
❌금지:
- 막연한 지목("이 종목 가진 분 필독"), 단순 책임 전가("OO발 쇼크")
- 독자를 특정 타겟으로 지칭 ("신입직장인이 알아야 할", "취준생 필독", "입문자용", "왕초보"). 우리 독자는 50~60대 일반인이다. 특정 직군·연령 지칭 금지.
- "~슴", "~슴?", "~함?" 축약 종결어
- "충격!", "경고!", "긴급!" 싸구려 자극
개인화 시 오늘 뉴스의 구체적 맥락(금액·상황·결정)을 담을 것.

오늘의 [${label}] 뉴스:
${headlineText}

⚠️ 중요한 작성 순서: 먼저 POINT1~4 본문을 완성한 뒤, 그 내용 전체를 관통하는 핵심 메시지를 뽑아 FRONT_HEADLINE/SUBHEADING을 쓸 것. FRONT_HEADLINE은 뉴스 중 하나를 집어든 게 아니라 POINT1~4를 종합한 "오늘 [${label}]의 결론"이어야 한다.

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

━━━━━━ 이제 위 POINT1~4를 종합해서 아래를 작성 ━━━━━━

[FRONT_HEADLINE]
홈화면 카드 메인 타이틀. **뉴닉(NEWNEEK)의 친근함 + 이코노미스트의 전문성**을 동시에:
= "친구가 알려주는데, 알고 보니 그 친구가 업계 전문가" 느낌.

필수 요소:
- POINT1~4 전체를 관통하는 결론 (단일 뉴스 집어든 제목 금지)
- 구체적 주체(국가·기관·기업·인물·수치)
- 2~3개 이모지 자연스럽게 배치
- 35자 이내

허용 스타일 (하나 이상 섞어서):
① **인용형**: 주체의 말·발표를 따옴표로
   예: "미국 '호르무즈 우리가 막는다' 했다고? ⛽️🔥"
   예: "한은 '금리 동결' 했는데 대출이자는 왜 또 올라요? 💸😤"
② **대화 질문형**: 친근한 물음 ("~한데?", "~괜찮을까요?", "~뭐지?", "~거야?")
   예: "외국인 3조 던졌는데 삼전만 담은 이유가 뭐지? 🤔📉"
   예: "반도체 공장 멈춘 게 '헬륨' 때문이라는데, 진짜야? 🏭💨"

톤 균형 (중요):
- 친근하되 싸구려 자극 없음. "충격!/경고!/긴급!" 금지.
- **"~슴", "~슴?", "~함?" 같은 축약형 종결어 금지** (맞춤법 어색)
- 전문가적 신뢰감: 숫자·기관·사건을 구체적으로 박기
- 추상어 금지 ("변곡점", "결정적", "역사적")
[/FRONT_HEADLINE]

[SUBHEADING]
FRONT_HEADLINE 뒷받침 서브타이틀. 친근 + 간결 + 구체:
- 해요체 한 줄 상황 요약 ("~했어요", "~됐대요") 또는 짧은 유도 문구 ("지금 무슨 일이냐면요", "핵심만 정리해드릴게요")
- 구체적 숫자·날짜 1개 이상 포함
- 이모지 0~1개
- 45자 이내

예시:
- "협상 결렬 하루 만에 환율 1,495원 찍고 코스피 2% 빠졌어요"
- "외국인이 3조 팔았는데 왜 삼전만 샀는지, 지금 뜯어볼게요"
- "4월 13일 오전 10시부터 미군이 호르무즈 막는대요"
[/SUBHEADING]

[IMAGE_QUERY] FRONT_HEADLINE과 POINT1~4에서 가장 핵심적인 **사물·장소·장면**을 영어 Unsplash 검색어로. 실제 뉴스의 구체물 중심(예: "samsung semiconductor factory", "korean bond yields chart", "empty supermarket shelves", "oil refinery night"). 3~5단어 영어만.
❌ 인물 얼굴 근접(portrait, face close-up, ceo headshot) 금지 — 모르는 사람 얼굴이 대문짝으로 나오면 독자가 거부감. 사람이 필요하면 뒷모습·실루엣·군중 장면으로.
❌ 추상적·일반적 표현 금지 (business meeting, economy concept). [/IMAGE_QUERY]

[HEADLINE] 핵심 이슈 제목(탭 내부용, 홈화면과 별개). 이모티콘 1~2개. 30자 이내. [/HEADLINE]

[FOOTNOTES]
각 포인트에 실제 등장한 단어 중 비전문가가 모를 것만. 포인트당 1~2개.
뽑을 것: 영어 약자·기관명(ECB, FOMC, CPI 등), 경제 전문용어, 그날 특유 표현
뽑지 말 것: 누구나 아는 단어, 본문에 없는 단어
형식: 포인트N: ※ 용어(영문병기) — 설명 1문장. 확신 없으면 생략.
[/FOOTNOTES]

[COLUMN_HOOK]
POINT1~4 기반 심층 칼럼 예고. 감정 자극 표현 사용. 이모티콘 1개. 40자 이내.
예: "💣 금리 동결인데 집값 또 오른다? 당신이 모르는 진짜 이유"
[/COLUMN_HOOK]

[COLUMN_SUBHOOK]
COLUMN_HOOK의 서브타이틀. 브리핑에서 못 다한 2·3차 파급효과를 암시하는 한 줄. 이모티콘 없이. 35자 이내.
예: "오늘 뉴스 뒤에 숨겨진 진짜 변수, 여기서만 공개합니다"
[/COLUMN_SUBHOOK]`
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
    const frontHeadline = parse('FRONT_HEADLINE');
    const imageQuery    = parse('IMAGE_QUERY');
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

    const columnSubhookMatch = fullText.match(/\[COLUMN_SUBHOOK\]([\s\S]*?)\[\/COLUMN_SUBHOOK\]/);
    const columnSubhook = columnSubhookMatch ? columnSubhookMatch[1].trim() : '';

    console.log('[BRIEFING] 파싱 — summary:', summary.length, 'headline:', headline.length, 'columnHook:', columnHook.length);

    if (!summary) {
      console.error('[BRIEFING] 파싱 실패! fullText 앞 500자:', fullText.slice(0, 500));
    }

    res.status(200).json({ summary, footnotes, frontHeadline, imageQuery, headline, subheading, heading2, subheading2, heading3, subheading3, heading4, subheading4, columnHook, columnSubhook });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
