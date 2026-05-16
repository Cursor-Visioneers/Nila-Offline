# Nila — Sri Lanka GIC Assistant

**Nila** is a kiosk-friendly Government Information Centre (GIC) chat assistant for Sri Lanka. Citizens can ask about civil documents, agriculture, taxes, and education — with **offline support** via a pre-warmed cache and built-in answers.

Built for the GIC / buildathon stack: **Next.js**, **Google Gemini**, keyword **RAG** over local markdown, and **PWA** offline caching.

## Features

- **Chat UI** — Quick prompts, Sinhala / English / Tamil language selector (UI), timestamps, mobile-first layout
- **RAG knowledge base** — 14 English topic files under `content/en/` (no vector DB; fast keyword retrieval)
- **Gemini API** — `gemini-2.0-flash` with fallbacks; answers grounded in retrieved knowledge
- **Plain-text replies** — No raw markdown in bubbles; clickable links, numbered steps, contacts
- **Offline mode** — 87 pre-cacheable questions, IndexedDB storage, rich built-in fallbacks (`lib/knowledgeReplies.ts`)
- **PWA** — Service worker + installable app (enabled in production builds only)
- **Kiosk mode** — `?kiosk=true` with session reset after 5 minutes of inactivity
- **Test offline** — Toggle or `?offline=true` to demo without network

### Topics covered

| Area | Examples |
|------|----------|
| Civil documents | Birth certificate, NIC, passport, driving licence, marriage |
| Agriculture | Ministry policy, DOA, **1920** helpline, Agrarian subsidies, export crops, NRMC/CROPIX, livestock stats |
| Tax | IRD, TIN, e-filing |
| Education | School enrollment, G.C.E. O/L & A/L, UGC |

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, `--webpack` for PWA compatibility)
- [React 19](https://react.dev) + [Tailwind CSS v4](https://tailwindcss.com)
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) — Gemini chat
- [next-pwa](https://www.npmjs.com/package/next-pwa) + [idb](https://www.npmjs.com/package/idb) — offline cache
- Optional 3D avatar components in `components/` (not wired into the main chat UI)

## Project structure

```
nila-avatar/
├── app/
│   ├── page.tsx              # Chat UI, cache warm-up, offline toggle
│   ├── layout.tsx
│   └── api/chat/route.ts     # Gemini + RAG endpoint
├── components/
│   ├── AssistantMessage.tsx  # Renders links, bullets, sections
│   └── …                     # Avatar components (optional)
├── content/en/*.md           # Knowledge base (edit to add topics)
├── lib/
│   ├── rag.ts                # Keyword search over markdown
│   ├── offlineCache.ts       # IndexedDB + built-in answers
│   ├── knowledgeReplies.ts     # Rich offline plain-text replies
│   └── formatMessage.ts        # Strips markdown, orders sections
├── hooks/useOnlineStatus.ts
└── public/                   # PWA assets, sw.js (generated on build)
```

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
cd nila-avatar
npm install
```

### Environment variables

Create `.env.local` in the project root:

```env
# Required for full AI replies (free tier: https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_key_here

# Optional — Beyond Presence live avatar (not used in default chat-only UI)
BEYOND_PRESENCE_API_KEY=
BP_PERSONA_ID=
NEXT_PUBLIC_BP_PERSONA_ID=

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
ELEVENLABS_API_KEY=
N8N_WEBHOOK_SECRET=
```

Without a valid `GEMINI_API_KEY`, the API falls back to the **knowledge base** only (still useful for demos).

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> PWA is **disabled in development**. Use a production build to test full offline PWA behaviour.

### Production build

```bash
npm run build
npm start
```

Webpack is required because `next-pwa` does not support Turbopack for this project.

## Using offline mode

1. Run the app **online** with a valid API key (or built-ins only).
2. Click **Warm up cache (87 questions)** — fetches answers into IndexedDB.
3. Enable **Test offline** or add `?offline=true` to the URL.
4. Ask questions — cached or built-in answers load without the network.

Built-in answers include step-by-step guides, phone numbers, and official URLs even when the cache is empty.

**Cache version:** IndexedDB is reset when `DB_VERSION` in `lib/offlineCache.ts` changes (currently `3`).

## URL parameters

| Parameter | Effect |
|-----------|--------|
| `?kiosk=true` | Larger touch targets, 5-minute idle reset |
| `?offline=true` | Force offline mode on load |

## Extending the knowledge base

1. Add or edit markdown under `content/en/` using `##` sections (How to apply, Contact, Resources, etc.).
2. Add matching queries to `OFFLINE_QUERIES` in `lib/offlineCache.ts`.
3. Optionally add a rich offline reply in `lib/knowledgeReplies.ts`.
4. Add intent rules in `lib/rag.ts` (`FILE_INTENT` / `PHRASE_HINTS`) if retrieval picks the wrong file.
5. Bump `DB_VERSION` in `lib/offlineCache.ts` and re-warm the cache.

## Deploy on Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set environment variables (`GEMINI_API_KEY` at minimum).
4. Deploy; open the production URL and **warm the offline cache** once for kiosk demos.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (webpack) |
| `npm run build` | Production build + service worker |
| `npm start` | Run production server |
| `npm run lint` | ESLint |

## License

Private / buildathon project — adjust as needed for your team.
