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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { action, id, tab } = req.query;

  try {
    // ── 에디션 목록 (카드 아카이브) ──────────────────
    if (action === 'editions') {
      const snap = await db.collection('editions').orderBy('created_at', 'desc').limit(60).get();
      const items = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          date: d.date,
          slot: d.slot,
          period: d.period,
          month: d.month,
          year: d.year,
          created_at: d.created_at,
          tabs: Object.fromEntries(['economy','industry','global','stocks'].map(t => [
            t, d.tabs?.[t] ? { headline: d.tabs[t].headline || '', teaser: d.tabs[t].teaser || '', topImageUrl: d.tabs[t].topImageUrl || '' } : null,
          ])),
          columnTeaser: d.column?.teaser || '',
        };
      });
      return res.status(200).json({ items });
    }

    // ── 목록 조회 ─────────────────────────────────
    if (action === 'list') {
      let query = db.collection('archive').orderBy('created_at', 'desc').limit(90);
      if (tab && ['economy', 'industry', 'global', 'stocks'].includes(tab)) {
        query = db.collection('archive').where('tab', '==', tab).limit(30);
      }
      const snap = await query.get();
      const items = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          tab: d.tab,
          date: d.date,
          slot: d.slot,
          month: d.month,
          year: d.year,
          headline: d.headline || '',
          created_at: d.created_at,
        };
      }).sort((a, b) => b.created_at - a.created_at);
      return res.status(200).json({ items });
    }

    // ── 단건 조회 ─────────────────────────────────
    if (action === 'get' && id) {
      const doc = await db.collection('archive').doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ id: doc.id, ...doc.data() });
    }

    // ── 에디션 단건 조회 ──────────────────────────
    if (action === 'edition' && id) {
      const doc = await db.collection('editions').doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ id: doc.id, ...doc.data() });
    }

    return res.status(400).json({ error: 'action=list 또는 action=get&id=... 필요' });
  } catch (err) {
    console.error('[ARCHIVE]', err.message);
    res.status(500).json({ error: err.message });
  }
}
