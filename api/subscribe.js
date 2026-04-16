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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: 구독자 존재 확인
  if (req.method === 'GET') {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || email.length > 254) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    try {
      const doc = await db.collection('subscribers').doc(email).get();
      return res.status(200).json({ exists: doc.exists });
    } catch (err) {
      console.error('[CHECK-SUBSCRIBER]', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // POST: 신규 구독
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || !email.includes('@') || email.length > 254) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const normalized = email.trim().toLowerCase();

  try {
    await db.collection('subscribers').doc(normalized).set({
      email: normalized,
      subscribed_at: Date.now(),
      source: 'gate',
    }, { merge: true });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[SUBSCRIBE]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}
