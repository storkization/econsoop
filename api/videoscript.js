// 유튜브 영상용 스크립트 생성 — 어머니도 이해하는 눈높이.
// 4탭(경제·산업·국제·증권) 톱 헤드라인을 받아 1편의 "오늘의 경제 한 방" 스크립트 생성.
// CRON_SECRET Bearer 필수 — api/generate.js 크론만 호출.

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

  const { headlines = {}, summaries = {} } = req.body;

  const econHead  = headlines.economy  || '';
  const indHead   = headlines.industry || '';
  const gloHead   = headlines.global   || '';
  const stkHead   = headlines.stocks   || '';

  const econSum   = (summaries.economy  || '').slice(0, 400);
  const indSum    = (summaries.industry || '').slice(0, 400);
  const gloSum    = (summaries.global   || '').slice(0, 400);
  const stkSum    = (summaries.stocks   || '').slice(0, 400);

  try {
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
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `너는 경제 뉴스를 **60대 어머니도 이해하는 유튜브 영상 스크립트**로 풀어내는 크리에이터야.

오늘 아침 4개 분야 헤드라인·요약:

[경제]
헤드라인: ${econHead}
요약: ${econSum}

[산업]
헤드라인: ${indHead}
요약: ${indSum}

[국제]
헤드라인: ${gloHead}
요약: ${gloSum}

[증권]
헤드라인: ${stkHead}
요약: ${stkSum}

# 네 임무
위 4개 중 **오늘 파급력·관심도가 가장 큰 단 하나**를 골라, 1분 30초짜리 유튜브 영상 스크립트를 작성해.

# 🚨 필수 규칙 — 어머니 눈높이
1. **전문용어 완전 금지**
   - "CCSI" → "소비심리 점수" 또는 풀어쓰기
   - "금통위" → "한국은행 금리 회의"
   - "DS부문" → "메모리 반도체 부문"
   - "HBM" → "AI용 고성능 메모리"
   - 약어가 꼭 필요하면 한 번은 풀어쓰기

2. **숫자는 비교로**
   - "99.2" → "100이 보통인데 지금은 99예요 — 살짝 낮아요"
   - "7.8p 하락" → "한 달 만에 확 떨어진 거예요"
   - "1,478원" → "1달러에 1,478원 — 작년보다 한참 비싸졌어요"

3. **대화체 필수**
   - "~했어요", "~거든요", "~인 거예요"
   - "~입니다", "~합니다" 같은 격식체 금지

4. **포인트는 짧게**
   - 각 포인트 1~2문장, **총 60자 이내**
   - 영상 자막용이라 한 줄에 들어가야 함

5. **훅은 질문형**
   - 시청자가 궁금해할 만한 한 줄 질문
   - "왜 금리 안 올렸는데 이자는 더 내야 해?" 같은 느낌

6. **이모지는 훅·엔딩에만** (각 1개씩)

# 출력 형식 (반드시 이 JSON 형식 그대로)
아무 설명·마크다운 없이 순수 JSON만 출력:

{
  "selectedTab": "economy|industry|global|stocks 중 하나",
  "selectedReason": "왜 이걸 골랐는지 한 줄",
  "title": "영상 제목 (20자 이내, 이모지 1개, 질문형 추천)",
  "subtitle": "부제 (30자 이내, 제목 보완)",
  "hook": "훅 질문 (영상 첫 5초에 나오는 한 줄, 이모지 1개)",
  "points": [
    "포인트1 (60자 이내, 한 문장)",
    "포인트2 (60자 이내)",
    "포인트3 (60자 이내)",
    "포인트4 (60자 이내)"
  ],
  "endingHook": "엔딩 한 줄 — 핵심 요약 + 구독 유도 (40자 이내, 이모지 1개)",
  "endingSubhook": "엔딩 부연 (30자 이내)"
}

⚠️ 위 요약·헤드라인에 없는 수치·사실은 절대 만들지 말 것.
⚠️ JSON 외 어떤 설명도 출력하지 말 것 (파싱 에러남).`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(500).json({ error: data.error?.message || JSON.stringify(data) });
    }

    const raw = data.content?.[0]?.text || '';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    try {
      const script = JSON.parse(cleaned);
      // 기본 구조 검증
      if (!script.title || !Array.isArray(script.points) || script.points.length !== 4) {
        throw new Error('스크립트 구조 부적합');
      }
      res.status(200).json({ script });
    } catch (parseErr) {
      res.status(500).json({ error: `파싱 실패: ${parseErr.message}`, raw: cleaned.slice(0, 500) });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
