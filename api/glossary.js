import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}
const db = admin.firestore();

function parseFootnotes(footnotes, tab) {
  if (!footnotes) return [];
  return footnotes.split('\n')
    .map(line => { const m = line.match(/※\s*(.+?)\s*[—–]\s*(.+)/); return m ? { term: m[1].trim(), definition: m[2].trim(), tab } : null; })
    .filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  try {
    const snap = await db.collection('glossary').get();
    let terms = snap.docs.map(doc => doc.data()).sort((a, b) => a.term.localeCompare(b.term, 'ko'));

    if (!terms.length) {
      const host = req.headers.host;
      const base = `https://${host}`;
      const tabs = ['economy', 'industry', 'global', 'stocks'];
      const fetched = await Promise.all(tabs.map(async tab => {
        try { const r = await fetch(`${base}/api/cached?tab=${tab}`); const d = await r.json(); return parseFootnotes(d.footnotes || '', tab); }
        catch { return []; }
      }));
      const seen = new Set();
      terms = fetched.flat().filter(t => { if (seen.has(t.term)) return false; seen.add(t.term); return true; });
      terms.sort((a, b) => a.term.localeCompare(b.term, 'ko'));
    }

    res.status(200).json({ terms });
  } catch (err) {
    console.error('[GLOSSARY]', err.message);
    res.status(500).json({ error: err.message });
  }
}
