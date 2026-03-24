# WA Blast

WhatsApp message blaster with web UI. Sends personalized messages using an open-source WhatsApp Web protocol library (Baileys).

## Tech Stack

- **Backend:** Node.js + Express + TypeScript + Socket.IO
- **Frontend:** React (Vite) + Tailwind CSS v4
- **Database:** SQLite (better-sqlite3) — users, templates, blast history, WA auth state
- **WhatsApp:** @whiskeysockets/baileys v6.17.16 (direct WA Web protocol, no third-party servers)
- **File parsing:** papaparse (CSV) + xlsx (Excel)
- **Auth:** JWT (jsonwebtoken) + bcryptjs for password hashing
- **Structure:** npm workspaces monorepo (`server/` + `client/`)

## Running

```bash
npm install
npm run dev          # starts server (3001) + client (5173)
```

Docker:
```bash
docker compose up --build   # runs on port 8543
```

## Project Structure

- `server/src/index.ts` — Express + Socket.IO entry point, serves client static files in production
- `server/src/db.ts` — SQLite database init (users, wa_auth, templates, blast_history, blast_recipients, wa_contacts tables)
- `server/src/middleware/auth.ts` — JWT auth middleware (`requireAuth`, `verifySocketToken`)
- `server/src/routes/auth.ts` — Registration & login endpoints
- `server/src/whatsapp/session.ts` — Baileys session lifecycle, QR relay, reconnect logic, manual contact sync via `resyncAppState`
- `server/src/whatsapp/authState.ts` — Custom Baileys auth state adapter backed by SQLite
- `server/src/whatsapp/contactStore.ts` — SQLite-backed WA contact store with buffer/flush pattern, search, and Socket.IO count broadcasting
- `server/src/whatsapp/sender.ts` — Rate-limited message sender with per-recipient DB tracking
- `server/src/routes/waContacts.ts` — WA contact search endpoint (GET /api/wa-contacts?q=)
- `server/src/routes/upload.ts` — File upload endpoint (multer, 5MB limit)
- `server/src/routes/template.ts` — Saved template CRUD (per-user, SQLite-backed)
- `server/src/routes/blast.ts` — Blast trigger endpoint, creates history/recipient records
- `server/src/routes/history.ts` — Blast history list & detail endpoints
- `server/src/utils/fileParser.ts` — CSV/Excel parsing, all-column extraction, phone normalization (ID default: +62)
- `server/src/utils/templateEngine.ts` — `{variable}` placeholder substitution (any key)
- `server/src/config.ts` — Server port, JWT config, blast rate-limit settings
- `client/src/App.tsx` — Page-based navigation: Connect → Upload → Template → Preview → Send + History
- `client/src/components/Sidebar.tsx` — Sidebar with WA status, collapsible Blast dropdown, History, Settings
- `client/src/components/ContactAutocomplete.tsx` — WA contact search autocomplete for number input fields
- `client/src/components/` — Page components (LoginPage, AuthStep, UploadStep, TemplateStep, PreviewStep, BlastStep, HistoryPage)
- `client/src/hooks/useSocket.ts` — Socket.IO singleton hook (passes JWT token)
- `client/src/lib/api.ts` — REST fetch helpers with auth headers
- `client/src/lib/auth.ts` — Token/user management in localStorage

## Key Notes

- Baileys requires a current WA protocol version — hardcoded in `session.ts` as `WA_VERSION`. If QR stops appearing (405 errors), update this version from https://github.com/WhiskeySockets/Baileys/issues or https://wppconnect.io/whatsapp-versions/
- Auth state persists in SQLite `wa_auth` table. Clear the table (or delete the .db file) to force re-authentication.
- `Contact` type is `{ number: string; [key: string]: string }` — open-ended variables. Only `number` is required; all other fields are template variables.
- CSV/Excel `number` column is required. All other columns automatically become template variables. Accepts Indonesian aliases: nama, nomor, no hp.
- Rate limiting: random 1.5-3s between messages, 12s pause every 20 messages (configurable in `server/src/config.ts`)
- Blast history tracks per-recipient status (pending/sent/failed) with rendered message and error details
- WA contacts are stored in SQLite `wa_contacts` table with a buffer/flush pattern: Baileys events write contacts as `synced=0` (buffered), manual "Sync Contacts" button flushes them to `synced=1` (searchable). `resyncAppState()` is called during sync to fetch saved contact names from the phone's address book.
- `sock.end()` is used for disconnect (not `sock.logout()`) to avoid Baileys background task crashes
- Global `uncaughtException`/`unhandledRejection` handlers in `index.ts` prevent Baileys from crashing the process
