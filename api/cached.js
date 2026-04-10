import admin from 'firebase-admin';

// ── Firebase Admin 초기화 (중복 방지) ──────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}
const db = admin.firestore();

// 크론 슬롯 기준: 07:00 KST (1일 1회)
function getLastSlotTime() {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hm = kst.getHours() * 100 + kst.getMinutes();
  const slots = [700];
  let lastHm = null;
  for (const s of slots) {
    if (hm >= s) lastHm = s;
  }
  if (lastHm === null) {
    const prev = new Date(kst);
    prev.setDate(prev.getDate() - 1);
    prev.setHours(20, 0, 0, 0);
    const offset = kst.getTime() - now.getTime();
    return prev.getTime() - offset;
  }
  const last = new Date(kst);
  last.setHours(Math.floor(lastHm / 100), lastHm % 100, 0, 0);
  const offset = kst.getTime() - now.getTime();
  return last.getTime() - offset;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { tab } = req.query;
  if (!tab || !['economy', 'industry', 'global', 'stocks'].includes(tab)) {
    return res.status(400).json({ error: 'Invalid tab' });
  }

  try {
    const doc = await db.collection('briefings').doc(tab).get();

    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const { summary, footnotes, headline, subheading, heading2, subheading2, heading3, subheading3, heading4, subheading4, columnHook, columnSubhook, topImageUrl, sectionImages, comments, created_at } = doc.data();
    if (!summary) return res.status(404).json({ error: 'No data' });

    const fresh = created_at >= getLastSlotTime();
    console.log(`[CACHED] ${tab} created_at=${new Date(created_at).toISOString()} fresh=${fresh}`);

    res.status(200).json({ summary, footnotes: footnotes || '', headline: headline || '', subheading: subheading || '', heading2: heading2 || '', subheading2: subheading2 || '', heading3: heading3 || '', subheading3: subheading3 || '', heading4: heading4 || '', subheading4: subheading4 || '', columnHook: columnHook || '', columnSubhook: columnSubhook || '', topImageUrl: topImageUrl || '', sectionImages: sectionImages || [], comments: comments || [], created_at, fresh });
  } catch(err) {
    console.error('[CACHED] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
