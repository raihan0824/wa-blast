# WA Blast

WhatsApp message blaster with web UI. Sends personalized messages using an open-source WhatsApp Web protocol library (Baileys).

## Tech Stack

- **Backend:** Node.js + Express + TypeScript + Socket.IO
- **Frontend:** React (Vite) + Tailwind CSS v4
- **WhatsApp:** @whiskeysockets/baileys v6.17.16 (direct WA Web protocol, no third-party servers)
- **File parsing:** papaparse (CSV) + xlsx (Excel)
- **Structure:** npm workspaces monorepo (`server/` + `client/`)

## Running

```bash
npm install
npm run dev          # starts server (3001) + client (5173)
```

Docker:
```bash
docker compose up --build   # runs on port 3001
```

## Project Structure

- `server/src/index.ts` — Express + Socket.IO entry point, serves client static files in production
- `server/src/whatsapp/session.ts` — Baileys session lifecycle, QR relay, reconnect logic
- `server/src/whatsapp/sender.ts` — Rate-limited message sender (1.5-3s delay, batch cooldown)
- `server/src/routes/` — REST endpoints: upload, template, blast
- `server/src/utils/fileParser.ts` — CSV/Excel parsing, column validation, phone number normalization (ID default: +62)
- `server/src/utils/templateEngine.ts` — `{name}` placeholder substitution
- `client/src/App.tsx` — 5-step wizard: Connect → Upload → Template → Preview → Blast
- `client/src/components/` — Step components (AuthStep, UploadStep, TemplateStep, PreviewStep, BlastStep)
- `client/src/hooks/useSocket.ts` — Socket.IO singleton hook

## Key Notes

- Baileys requires a current WA protocol version — hardcoded in `session.ts` as `WA_VERSION`. If QR stops appearing (405 errors), update this version from https://github.com/WhiskeySockets/Baileys/issues or https://wppconnect.io/whatsapp-versions/
- Auth state persists in `./auth_info` (gitignored). Delete it to force re-authentication.
- CSV/Excel must have `name` and `number` columns (case-insensitive, also accepts Indonesian aliases: nama, nomor, no hp)
- Rate limiting: random 1.5-3s between messages, 12s pause every 20 messages (configurable in `server/src/config.ts`)
