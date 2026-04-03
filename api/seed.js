import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  const auth = req.headers['authorization'];
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const DUMMY = {
    economy: {
      headline: '기준금리 동결, 하반기 인하 기대감 고조',
      subheading: '한은 총재 "물가 안정세 확인 후 결정"',
      heading2: '원달러 환율 1,380원대 안착',
      subheading2: '달러 약세·외국인 채권 매수 유입',
      heading3: '가계부채 증가세 다시 꺾여',
      subheading3: '대출 규제 효과, 3개월 연속 감소',
      heading4: '소비자물가 2.1%… 목표치 근접',
      subheading4: '에너지 가격 안정이 주요 요인',
      summary: '포인트1~기준금리 3.50% 동결\n포인트2~원달러 환율 1,382원 마감\n포인트3~가계부채 전월 대비 0.3% 감소\n포인트4~소비자물가 전년比 2.1% 상승',
      footnotes: '한국은행 금통위 의결 (2026.04.03) / 서울외환시장 종가 기준 / 금융위원회 발표',
      columnHook: '금리 동결이 반가운 이유 — 집값과 대출이자, 동시에 잡힐 수 있을까',
      tab: 'economy', date: '20260403', slot: '07:00', month: '2026-04', year: '2026',
      created_at: Date.now(),
    },
    industry: {
      headline: '삼성전자 HBM4 양산 돌입, 엔비디아 납품 초읽기',
      subheading: '3분기 공급 목표… SK하이닉스와 정면 대결',
      heading2: '현대차 전기차 미국 관세 직격탄',
      subheading2: '25% 관세에 현지 생산 확대 검토',
      heading3: '바이오 섹터 급등 — 신약 FDA 승인 기대',
      subheading3: '유한양행·한미약품 52주 신고가',
      heading4: '건설업 PF 리스크 여전',
      subheading4: '지방 미분양 10만 호 돌파',
      summary: '포인트1~삼성 HBM4 양산 개시\n포인트2~현대차 미국 현지 생산 검토\n포인트3~유한양행 FDA 조건부 승인 기대\n포인트4~전국 미분양 102,000호 기록',
      footnotes: '삼성전자 IR 자료 (2026.04.02) / 현대차 공시 / 식약처 발표',
      columnHook: 'HBM 전쟁의 승자는 누구인가 — 삼성의 반격이 시작됐다',
      tab: 'industry', date: '20260403', slot: '07:00', month: '2026-04', year: '2026',
      created_at: Date.now(),
    },
    global: {
      headline: '미 연준 의사록 "인하 서두르지 않겠다"',
      subheading: '물가 재반등 우려에 매파 기조 유지',
      heading2: '중국 제조업 PMI 51.2 — 예상 상회',
      subheading2: '내수 회복 신호, 위안화 강세 전환',
      heading3: '국제유가 배럴당 $82 돌파',
      subheading3: 'OPEC+ 감산 연장 결정',
      heading4: '일본 엔화 155엔 재진입',
      subheading4: '일본은행 추가 금리인상 신중론',
      summary: '포인트1~연준 5.25~5.50% 동결 유지\n포인트2~중국 PMI 51.2 (전월 50.8)\n포인트3~WTI 원유 $82.4\n포인트4~달러/엔 155.2',
      footnotes: 'FOMC 의사록 공개 (2026.04.02) / NBS 발표 / CME 선물 종가',
      columnHook: '연준은 왜 아직도 기다리는가 — 미국 경제의 마지막 퍼즐',
      tab: 'global', date: '20260403', slot: '07:00', month: '2026-04', year: '2026',
      created_at: Date.now(),
    },
    stocks: {
      headline: '💥 삼성전자 HBM4 납품 확정 — 코스피 반등 신호탄?',
      subheading: '외국인 순매수 전환, 반도체 수급 모멘텀 가시화',
      heading2: '📊 코스피 2,600 회복 — 기술적 반등인가 추세 전환인가',
      subheading2: '외국인·기관 동반 매수에 거래량 급증',
      heading3: '🇺🇸 미국 증시 나스닥 사상 최고치 — 국내 ETF 수혜 주목',
      subheading3: '빅테크 실적 서프라이즈, S&P500 5,200 돌파',
      heading4: '🎯 공모주 시장 과열 경보 — 묻지마 청약 위험',
      subheading4: 'IPO 경쟁률 500:1 초과, 수요예측 실패 사례도',
      summary: '포인트1: 삼성전자 HBM4 엔비디아 공급 계약 확정, 주가 +4.2% 급등\n\n포인트2: 외국인 코스피 3거래일 연속 순매수, 2,580→2,615 회복\n\n포인트3: 나스닥 종합 18,200 돌파, 반도체·AI 테마 국내 ETF 동반 강세\n\n포인트4: 이번 주 IPO 3건 경쟁률 평균 480:1, 증거금 쏠림 경고',
      footnotes: '포인트1: ※ HBM(High Bandwidth Memory) — 인공지능 연산에 쓰이는 고대역폭 메모리 반도체\n포인트4: ※ 수요예측 — IPO 전 기관투자자 대상으로 공모가·물량을 사전 확인하는 절차',
      columnHook: '🔥 HBM 전쟁 2라운드 — 삼성의 반격, SK하이닉스는 버틸 수 있나',
      tab: 'stocks', date: '20260403', slot: '07:00', month: '2026-04', year: '2026',
      created_at: Date.now(),
    },
  };

  const saved = [];
  for (const [tab, data] of Object.entries(DUMMY)) {
    const id = `${tab}_20260403_0700`;
    await db.collection('archive').doc(id).set(data);
    saved.push(id);
  }

  res.status(200).json({ ok: true, saved });
}
