# WA Blast

WhatsApp message blaster with web UI. Send personalized messages to contacts from a CSV/Excel file using an open-source WhatsApp Web protocol — no official API or third-party servers needed.

## Features

- QR code authentication (same as WhatsApp Web)
- CSV/Excel upload with column validation
- Message template with `{name}` personalization
- Preview all messages before sending
- Confirmation dialog before blast
- Real-time progress tracking
- Rate limiting to avoid bans

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, Socket.IO
- **Frontend:** React, Vite, Tailwind CSS v4
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

Opens at http://localhost:3001.

## Usage

1. **Connect** — Scan the QR code with your WhatsApp
2. **Upload** — Drop a CSV or Excel file with `name` and `number` columns
3. **Template** — Write your message using `{name}` as placeholder
4. **Preview** — Review all personalized messages
5. **Blast** — Confirm and send

### CSV Format

```csv
name,number
John,+62 812-3456-7890
Jane,08123456789
```

Column names are case-insensitive. Also accepts Indonesian aliases: `nama`, `nomor`, `no hp`.

Phone numbers are auto-normalized (leading `0` becomes `62` for Indonesia).

## Configuration

Edit `server/src/config.ts` to adjust:

| Setting | Default | Description |
|---------|---------|-------------|
| `SERVER_PORT` | 3001 | Server port |
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
Delete the `auth_info/` directory and restart the server.

## Author

Created by Raihan Afiandi
