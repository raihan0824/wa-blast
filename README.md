# WA Blast

WhatsApp message blaster with web UI. Send personalized messages to contacts from a CSV/Excel file or manual entry using an open-source WhatsApp Web protocol — no official API or third-party servers needed.

## Features

- QR code authentication (same as WhatsApp Web)
- User registration & login (JWT + SQLite)
- CSV/Excel upload with automatic column detection
- Manual contact editor (add/edit/delete rows & custom columns)
- WhatsApp contact search — autocomplete number fields with synced WA contacts
- Manual contact sync with buffered count display
- Dynamic template variables — any CSV column becomes a `{variable}` placeholder
- Saved templates (per-user, reusable across blasts)
- Preview all messages before sending
- Real-time progress tracking via Socket.IO
- Blast history with per-recipient detail (status, rendered message, errors)
- Rate limiting to avoid bans
- Sidebar navigation with collapsible menu

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, Socket.IO
- **Frontend:** React, Vite, Tailwind CSS v4
- **Database:** SQLite (better-sqlite3) — users, templates, blast history, WA auth state
- **WhatsApp:** [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) (direct WA Web protocol)
- **File parsing:** papaparse (CSV), xlsx (Excel)

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Local Development

```bash
npm install
npm run dev
```

Opens at http://localhost:5173 (client) with API on http://localhost:3001 (server).

### Docker

```bash
docker compose up --build
```

Opens at http://localhost:8543. Set `JWT_SECRET` in your environment for production.

## Usage

1. **Register/Login** — Create an account or log in
2. **Connect** — Scan the QR code with your WhatsApp, then sync contacts
3. **Upload** — Drop a CSV/Excel file or add contacts manually (with WA contact autocomplete)
4. **Template** — Write your message using `{name}`, `{company}`, or any column as placeholder. Save templates for reuse.
5. **Preview** — Review all personalized messages
6. **Blast** — Confirm and send
7. **History** — View past blasts with per-recipient delivery status

### CSV Format

```csv
name,number,company
John,+62 812-3456-7890,Acme Corp
Jane,08123456789,Globex
```

- Only `number` column is required. All other columns become template variables.
- Column names are case-insensitive. Accepts Indonesian aliases: `nama`, `nomor`, `no hp`.
- Phone numbers are auto-normalized (leading `0` becomes `62` for Indonesia).

## Configuration

Edit `server/src/config.ts` to adjust:

| Setting | Default | Description |
|---------|---------|-------------|
| `SERVER_PORT` | 3001 | Server port |
| `JWT_SECRET` | dev fallback | JWT signing secret (set in production!) |
| `DEFAULT_COUNTRY_CODE` | 62 | Phone number prefix |
| `BLAST_CONFIG.minDelay` | 1500ms | Min delay between messages |
| `BLAST_CONFIG.maxDelay` | 3000ms | Max delay between messages |
| `BLAST_CONFIG.batchSize` | 20 | Messages per batch |
| `BLAST_CONFIG.batchCooldown` | 12000ms | Pause between batches |

## Troubleshooting

**QR code not appearing (405 error)**
The WhatsApp protocol version in `server/src/whatsapp/session.ts` (`WA_VERSION`) may be outdated. Update it from:
- https://github.com/WhiskeySockets/Baileys/issues
- https://wppconnect.io/whatsapp-versions/

**Need to re-authenticate**
Delete the `wa-blast.db` file (or clear the `wa_auth` table) and restart the server.

## Author

Created by Raihan Afiandi
