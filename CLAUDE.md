# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## On Every Session Start

1. Ask: **"PC인가요, 랩탑인가요?"**
   - **PC**: `cd /c/Users/dodoh/Downloads/ShawnDev/Project1/ecobrief`
   - **Laptop**: `cd /c/Users/dodoh/OneDrive/Desktop/Project101/ecobrief`
2. Run `git pull` to sync the latest changes. If there are updates, summarize which files changed. If already up to date, confirm briefly.
3. Report the current `CACHE_VERSION` value from `index.html` (search for `const CACHE_VERSION`).

Use the selected device path for all git commands, including the end-of-task push command.

## Architecture

**EcoBrief (Econ.SOOP / 경제숲)** is a zero-dependency, vanilla JS single-page web app that generates AI-powered Korean economic news briefings. No build tools — all HTML/JS/CSS is inline in `index.html`.

### Request Flow

```
Browser (index.html)
  → /api/news.js      (Naver Search API → headlines)
  → /api/briefing.js   (Claude Sonnet 4.6 → 3-line summary + footnotes)
  → /api/insight.js    (Claude Sonnet 4.6 → background 3-point analysis)
  → /api/column.js     (Claude Sonnet 4.6 → newsletter column)
```

All `/api/*.js` files are **Vercel serverless functions** (60s max duration each, configured in `vercel.json`).

### Key Files

| File | Purpose |
|---|---|
| `index.html` | Entire SPA (~2500 lines): UI, state, all client logic |
| `api/briefing.js` | Claude API — generates summary + footnotes |
| `api/insight.js` | Claude API — generates oneliner (Why/So What/Next Move) |
| `api/column.js` | Claude API — generates newsletter column |
| `api/news.js` | Naver Search API proxy |
| `sw.js` | Service worker (cache name: `econsoop-v20`) |
| `manifest.json` | PWA manifest |
| `devstory/index.html` | Standalone dev documentation page |

### Tab System (8 tabs)

`breaking` · `front` · `economy` · `industry` · `global` · `stocks` · `fx` · `settings`

The `economy`, `industry`, and `global` tabs each have sub-category chips. Each chip maps to specific Naver search queries. The `front` tab renders summaries from the other three briefing tabs.

### Caching Strategy

- **Schedule-based invalidation**: Cache refreshes at 6 fixed KST times (07:30, 11:30, 14:00, 16:30, 20:00, 22:30) via `getLastScheduleTime()`. Within a schedule window, cached data is reused.
- **Version-based invalidation**: `CACHE_VERSION` change clears all localStorage except `eco_api_key`, `eco_font_size`, `eco_start_tab`.
- **localStorage keys**: `eco_summary_{tab}`, `eco_summary_time_{tab}`, `eco_font_size`, `eco_start_tab`, `eco_cache_version`.

### Prompt Engineering Patterns

All Claude prompts in `/api/*.js` follow strict rules:
- Markdown is **forbidden** in output (`**`, `#`, `---`, `___` all banned)
- Structured labels for parsing: `[SUMMARY]...[/SUMMARY]`, `[FOOTNOTES]...[/FOOTNOTES]`, `줄1:` / `줄2:` / `줄3:`
- Anti-hallucination: prompts explicitly forbid inventing information not in the source headlines
- Insight (oneliner) must **never repeat** content from the summary — it adds background, 2nd/3rd-order effects, and specific dates/numbers

### Parsing Fallbacks

Briefing response parsing has a cascade: tag-based (`[SUMMARY]`) → label-based (`줄1:`) → Korean sentence-end splitting. Always maintain this fallback chain.

## Development

### Dev Mode

Append `?dev=true` to the URL. This disables all API calls, uses `DEV_DUMMY` data, and shows a red dev banner + watermark. Use this to test UI changes without incurring API costs.

### Deployment

Push to `main` → Vercel auto-deploys. No build step needed.

### Versioning Rules

- **`CACHE_VERSION`** in `index.html` (~line 1023): Bump on every user-facing change (e.g., `'v102'` → `'v103'`). This forces localStorage cache clear for all users.
- **Service worker cache** in `sw.js` (`econsoop-v20`): Bump when static asset caching behavior changes.

### Rate Limiting

News fetching uses `fetchInBatches(items, fn, batchSize=3, delay=250)` to avoid Naver API 429 errors. Do not remove or bypass this batching.

### API Timeouts

- News fetch: 5s per query
- Briefing generation: 55s (user can cancel via "브리핑 건너뛰기")
- All serverless functions: 60s max (Vercel limit)

## Workflow Rules

### After Every Task

Always provide a ready-to-run git push command at the end of each task:
```
git add -A && git commit -m "<concise summary of changes>" && git push
```
The commit message should summarize what was changed in that session. The user will decide whether to actually run it.

### Important Decisions

When making a significant decision during work (tech choice, structural change, new rule, convention change, etc.), ask: "이거 CLAUDE.md에 기록할까요?"
