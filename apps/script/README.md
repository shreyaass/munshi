# Expense Manager — Apps Script backend

This folder is the **entire backend**. It runs inside the user's own Google Sheet,
as the user, with no server and no OAuth app review.

## Files

| File | Role |
|---|---|
| `Code.gs` | `doPost` router, token check, JSON envelope |
| `Api.gs` | `ping` / `readAll` / `batch` handlers and row validation |
| `Sheet.gs` | Sheet reads/writes, header validation, formula-injection escaping |
| `Setup.gs` | Menu, tab creation, seed data, token generation |
| `ConnectionInfo.html` | The "copy these two values" dialog |
| `appsscript.json` | Web app config (`Execute as: Me`, `Access: Anyone`) |

## Installing it into the template sheet

1. Open the template spreadsheet.
2. **Extensions → Apps Script**.
3. Create files matching the names above and paste the contents.
   (Or use `clasp push` — see below.)
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Back in the sheet, reload and use **Munshi → 1. Setup / repair sheet**.
6. Deploy as Web app (`Execute as: Me`, `Who has access: Anyone`) and copy the `/exec` URL.
7. **Munshi → 2. Show connection info** → paste & Save the `/exec` URL and copy the token.

## With clasp (for development)

```bash
npm i -g @google/clasp
clasp login
clasp create --type sheets --title "Expense Manager" --rootDir .
clasp push
```

`appsscript.json` must be included in the push (`clasp push` does this by default).

## API contract (v1)

```http
POST <web-app-url>
Content-Type: text/plain

{ "token": "…", "action": "ping" | "readAll" | "batch", "payload": { … } }
```

| action | payload | result |
|---|---|---|
| `ping` | — | `{ ok, version, currency, locale, problems }` |
| `readAll` | `{ tabs? }` | `{ ok, version, data: { Tab: row[] }, serverTime }` |
| `batch` | `{ upserts: [{tab,row}], deletes: [{tab,id}] }` | `{ ok, applied, rejected }` |

`Content-Type: text/plain` is deliberate: it makes the browser treat the request
as a CORS "simple request", so no `OPTIONS` preflight is sent — Apps Script
cannot answer one.

## Rules baked into this code

- Writes take `LockService` — two phones can never interleave rows.
- Deletes are tombstones (`deleted=TRUE`), so they propagate to other devices.
- Every cell passes through `escapeFormula_` — `=`, `+`, `-`, `@` prefixes are neutralised.
- Headers are validated on every call; a renamed column becomes a clear error, not corruption.
- `id` is the only identity. Row numbers are never used.

## Quotas (consumer accounts)

| Limit | Value |
|---|---|
| URL fetches / day | 20,000 |
| Script runtime | 6 min / execution |
| Simultaneous executions | 30 |

A family ledger uses a small fraction of these.
