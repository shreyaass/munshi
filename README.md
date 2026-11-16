# Expense Manager

A private expense tracker where **your own Google Sheet is the database**.
No accounts, no server to run, no cost. Works as an installable PWA and (later) an Android APK
from the same codebase.

```
React app (PWA / Capacitor)
   │  local-first: IndexedDB = instant UI, offline, outbox
   ▼
Apps Script Web App URL   ← pasted once
   │  runs as the sheet owner · LockService mutex · sheet stays private
   ▼
Your Google Sheet (one file, 8 data tabs + 2 generated)
```

The local database is a **disposable cache**. It rehydrates from the sheet on launch, so only
unsynced writes are ever at risk.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production PWA in apps/app/dist
npm run typecheck
npm test
```

### Develop without touching Google

`npm run dev` also serves a fake Apps Script endpoint at `POST /__mock`
(see `apps/app/dev/mockSheetPlugin.ts`), pre-seeded with accounts, categories
and a month of transactions. Connect with:

| Field | Value |
|---|---|
| Web App URL | `http://localhost:5173/__mock` |
| Token | `dev-token` |

That exercises the real transport, sync engine, dashboard and history with no
Google account. The mock is dev-only (`apply: 'serve'`) and never ships.

## Real sheet

Everything needed to stand up the private backend is in `sheet/`:

| File | What it is |
|---|---|
| `ExpenseManager-template.xlsx` | Upload to Drive → Save as Google Sheets. |
| `AppsScript.gs` | The whole backend as one paste-ready file. |
| `SETUP.md` | Step-by-step install, deploy and verification. |

`AppsScript.gs` is generated (`node sheet/bundle.mjs`) from `apps/script/*.gs`.
The `.xlsx` is generated (`python sheet/build_template.py`, needs `openpyxl`)
from `packages/core/src/schema.ts` + `apps/script/Setup.gs`.

## Repo layout

| Path | What it is |
|---|---|
| `apps/app` | React + Vite + Tailwind. Builds the PWA, later wrapped by Capacitor. |
| `apps/script` | The Apps Script backend (`ping` / `readAll` / `batch`). See its README. |
| `packages/core` | Platform-free domain: schema, money, dates, sheet client, sync engine, tests. |
| `expense-manager-plan.md` | The authoritative plan. Read this before changing scope. |
| `sheet` | Uploadable `.xlsx` template, paste-ready script, and setup guide. |

## How sync works

Every row has `id`, `updated_at`, `device_id`, `deleted`.

1. **Write** → local row (`dirty=1`) immediately. The UI never waits on the network.
2. **Push** → one `batch` call with `{upserts, deletes}`. The server dedupes by `id`.
3. **Pull** → one `readAll`, applied only where `remote.updated_at > local.updated_at`.
4. **Delete** → tombstone, never a row removal, so it can travel to other devices.
5. **Conflict** → last-write-wins per row; counted in Settings, never silent.

## Money rules

Amounts are **integer paise** everywhere. `packages/core/src/money.ts` is the only place that
parses or formats money. Floating point never touches a stored amount.

## Setup checklist (Phase 1)

1. Open the template sheet → **Extensions → Apps Script** → paste `apps/script/*`.
2. **Deploy → New deployment → Web app** · Execute as **Me** · Access **Anyone**.
3. Sheet menu → **Expense Tracker → Setup / repair sheet**.
4. **Expense Tracker → Show connection info** → copy URL + token.
5. Paste both into the app's connect screen.

Status of each phase lives in `expense-manager-plan.md` → *Build phases*.
