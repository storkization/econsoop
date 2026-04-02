import crypto from 'crypto';

async function getFirebaseToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const sig = sign.sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${sig}`;

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Firebase token 발급 실패');
  return d.access_token;
}

// 크론 슬롯 기준: 07:00 / 16:00 / 20:00 KST
function getLastSlotTime() {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hm = kst.getHours() * 100 + kst.getMinutes();
  const slots = [700, 1600, 2000];
  let lastHm = null;
  for (const s of slots) {
    if (hm >= s) lastHm = s;
  }
  if (lastHm === null) {
    // 전날 20:00 KST
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
  if (!tab || !['economy', 'industry', 'global'].includes(tab)) {
    return res.status(400).json({ error: 'Invalid tab' });
  }

  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const token = await getFirebaseToken(sa);
    const url = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/briefings/${tab}`;

    const r = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!r.ok) return res.status(404).json({ error: 'Not found' });

    const doc = await r.json();
    const fields = doc.fields || {};
    const summary    = fields.summary?.stringValue    || '';
    const footnotes  = fields.footnotes?.stringValue  || '';
    const created_at = parseInt(fields.created_at?.stringValue || '0');

    if (!summary) return res.status(404).json({ error: 'No data' });

    const fresh = created_at >= getLastSlotTime();
    console.log(`[CACHED] ${tab} created_at=${new Date(created_at).toISOString()} fresh=${fresh}`);

    res.status(200).json({ summary, footnotes, created_at, fresh });
  } catch(err) {
    console.error('[CACHED] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
