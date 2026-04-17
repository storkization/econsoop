// 공지사항 Notion 페이지에서 "활성 공지" 섹션 첫 줄만 읽어서 반환
// 형식: [속보] 텍스트 | URL  또는  [공지] 텍스트 | URL  (| URL 부분 선택)
// 페이지 ID: 3450bdd69a5781739b50db71d6e4a7bc

const NOTION_PAGE_ID = '3450bdd69a5781739b50db71d6e4a7bc';
const NOTION_VERSION = '2022-06-28';

function extractText(block) {
  const t = block.type;
  const rt = block[t]?.rich_text;
  if (!Array.isArray(rt)) return '';
  return rt.map(r => r.plain_text || '').join('').trim();
}

function parseLine(raw) {
  if (!raw) return null;
  // [타입] 텍스트 | URL
  const m = raw.match(/^\s*\[(속보|공지)\]\s*(.+?)\s*(?:\|\s*(https?:\/\/\S+))?\s*$/);
  if (!m) return null;
  const type = m[1] === '속보' ? 'breaking' : 'notice';
  return { type, text: m[2].trim(), url: m[3] || '' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 5분 CDN 캐시 (공지는 자주 안 바뀌고, Notion API rate-limit 방어)
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const key = process.env.NOTION_API_KEY;
  if (!key) return res.status(200).json({ type: null });

  try {
    const r = await fetch(
      `https://api.notion.com/v1/blocks/${NOTION_PAGE_ID}/children?page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Notion-Version': NOTION_VERSION,
        },
      }
    );
    const j = await r.json();
    if (j.object === 'error' || !Array.isArray(j.results)) {
      console.error('[ANNOUNCEMENT] Notion error:', j.code, j.message);
      return res.status(200).json({ type: null });
    }

    // "활성 공지" heading_2 찾고, 그 다음부터 divider/heading_2 전까지 첫 내용 블록
    let inActive = false;
    for (const b of j.results) {
      const txt = extractText(b);
      if (b.type === 'heading_2') {
        if (txt === '활성 공지') { inActive = true; continue; }
        if (inActive) break; // 다음 heading_2 만나면 종료
      }
      if (!inActive) continue;
      if (b.type === 'divider') break;
      if (!txt) continue;
      const parsed = parseLine(txt);
      if (parsed) return res.status(200).json(parsed);
    }
    return res.status(200).json({ type: null });
  } catch (err) {
    console.error('[ANNOUNCEMENT] error:', err.message);
    return res.status(200).json({ type: null });
  }
}
