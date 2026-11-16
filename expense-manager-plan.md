---
title: Expense Manager - Project Plan
status: building
phase: 0
tags: [project, expense-manager, apps-script, pwa, capacitor, local-first]
---

# Expense Manager

> **For OpenCode:** Read this whole file before writing code. Build in the order given in [[#8 Build phases]]. Do not add features outside the current phase. If something is ambiguous, check [[#3 Decisions already made]] first, then ask.
>
> **For the human:** Update this note as decisions change. Obsidian vault root is `My Projects`, so this file is already indexed.

## 1. What this is

A personal expense/income tracker where **the user's own Google Sheet is the database**. No accounts, no server to run, no cost.

- A user copies a template Sheet into their Drive and deploys the tiny bundled Apps Script once. That deployment URL *is* the API.
- Same codebase ships as an installable PWA **and** an Android APK (Capacitor).
- Primary use case: **log a debit or credit in under 5 seconds**, ideally with zero typing via notification capture.
- Data lives in the user's Drive. They can open the sheet, chart it, print it, share it — forever.
- Audience: me + family/friends (<100 people), so no Play Store, no Google verification.

## 2. The core idea, and why it holds

`Sheet = source of truth` is a great ownership story and a terrible database story (slow, no offline, corrupts on concurrent writes). Resolution:

```
React app (PWA + Capacitor APK)
   |  local-first: Dexie/IndexedDB = instant UI, offline, outbox
   v
Apps Script Web App URL   <- pasted once by the user
   |  runs as the sheet owner, LockService mutex, sheet stays PRIVATE
   v
Their Google Sheet (one file, 8 tabs)
```

The local DB is **disposable** — it rehydrates from the sheet on launch. Only unsynced writes are ever at risk, a window of seconds.

**Why Apps Script instead of OAuth login:**
| | OAuth + Picker | Apps Script URL |
|---|---|---|
| Sheet visibility | must be shared with the app | **stays private** |
| Write safety | no mutex, races possible | `LockService` = real mutex |
| Backend needed | yes (client secret) | none |
| Google verification | required for friends | none |
| Token expiry | ~7 days while in Testing | no tokens |
| Setup cost | login + picker | ~8 clicks, once |

**The script is a dumb, frozen storage API.** All logic lives in the app. Bug fixes ship through an app update; the script never needs redeploying. This also neutralises version drift across family members.

## 3. Decisions already made

1. **Backend** = Google Apps Script bound to the template Sheet. User deploys it as a Web App (`Execute as: Me`, `Access: Anyone`). No server, no OAuth.
2. **Auth** = a random secret token in Script Properties, sent with every request. The deployment URL alone is not enough.
3. **Frontend** = React + TypeScript + Vite + Tailwind. Static output → Cloudflare Pages/GitHub Pages, and the same `dist/` → Capacitor APK.
4. **Data layer** = local-first two-way sync (Dexie), not a bare offline push queue.
5. **Entry form is the home page.** `start_url` opens the Add screen with the amount field focused.
6. **Android extras** = notification capture (GPay/PhonePe/Paytm/SMS), deep links, app shortcuts. Sideloaded APK only — Play Store restricts `NotificationListenerService`.
7. **No Bixby/Gemini integration.** Assistants cannot pass an amount to the sheet; do not build on it. Voice = an in-app mic button using the Web Speech API.

## 4. Architecture

```
apps/app        React + Vite + TS + Tailwind   -> PWA, and Capacitor webDir
apps/script     Apps Script source (.gs)       -> pasted/deployed into the template sheet
packages/core   types, money, schema, sync     -> platform-free, unit tested
```

`packages/core` is the only place sync logic lives; it must not import React or DOM.

### Sync model

Every row carries `id`, `updated_at`, `device_id`, `deleted`.

- **Write** → local row immediately (`dirty=1`) + outbox. UI never waits on network.
- **Push** → one `batch` call: `{upserts: [...], deletes: [...]}`. Server dedupes by `id`.
- **Pull** → one `readAll`, diff by `id`, apply where `remote.updated_at > local.updated_at`.
- **Deletes** = tombstones (`deleted=TRUE`), never row removal, so a delete can propagate to other devices.
- **Conflict** = last-write-wins per row on `updated_at`; surface a count in Settings, never fail silently.
- **Triggers** = app launch, foreground, pull-to-refresh, and a timer while open.

## 5. Sheet template

One spreadsheet, **8 tabs**. Row 1 is a frozen header. Tab names and header order are fixed; the script validates them. Amounts are **integer paise** (never floats).

| Tab | Columns |
|---|---|
| `Expenses` | id, date, amount_paise, category_id, account_id, payee, notes, tags, created_at, updated_at, device_id, deleted |
| `Income` | same shape (category_id → income categories) |
| `Transfers` | id, date, amount_paise, from_account_id, to_account_id, notes, created_at, updated_at, device_id, deleted |
| `Accounts` | id, name, type, opening_balance_paise, active, updated_at, device_id, deleted |
| `Categories` | id, name, type, parent_id, icon, color, monthly_budget_paise, active, updated_at, device_id, deleted |
| `Budgets` | id, month, category_id, amount_paise, updated_at, device_id, deleted |
| `Recurring` | id, amount_paise, type, category_id, account_id, payee, rule, next_date, active, updated_at, device_id, deleted |
| `Meta` | key, value |

`Accounts.type` ∈ `cash | bank | upi | credit | wallet`.
`Meta` seeds: `schema_version=1`, `currency=INR`, `locale=en-IN`, `week_start=1`.

**Rule:** the app writes only to these 8 tabs. Any summary/dashboard tab uses formulas only and is never touched by the app — that is what stops sync from destroying user formatting and stops the app choking on merged cells.

## 6. Apps Script API (contract v1)

Single endpoint (the Web App URL). Requests are `POST` with `Content-Type: text/plain` (avoids the CORS preflight Apps Script cannot answer). Body:

```json
{ "token": "...", "action": "ping|readAll|batch", "payload": { } }
```

| action | payload | returns |
|---|---|---|
| `ping` | — | `{ok, version, currency, locale, problems[]}` |
| `readAll` | `{tabs?: string[]}` | `{ok, version, data: {Tab: row[]}, serverTime}` |
| `batch` | `{upserts: [{tab,row}], deletes: [{tab,id}]}` | `{ok, applied, rejected: []}` |

### Script rules

- Wrap every write in `LockService.getScriptLock()`; give up after ~20 s.
- Validate server-side: amount is a finite integer > 0, date is `YYYY-MM-DD`, type is valid, tab exists, headers match.
- Escape formula injection: any cell starting with `=`, `+`, `-`, `@`, tab or CR gets an apostrophe prefix.
- Set `updated_at`/`created_at` server-side; never trust the client clock for ordering.
- Unknown category → `Other`, never an error.
- Always return JSON via `ContentService`.
- `onOpen` menu: **Setup / Show connection info**, **Validate sheet**, **Rotate token**.

## 7. Screens

1. **Connect (first run only)** — paste Web App URL, paste token, `ping`, show write test result. Green tick or a readable problem list.
2. **Onboarding tour** — 5 steps with screenshots/vector art, skippable at every step, ends at Connect.
3. **Add (home)** — Debit/Credit toggle, big amount pad (integer paise, no keyboard needed), category chips, account select, date (default today), note. Save → toast + haptic, form clears, focus stays on amount.
4. **History** — current month, search, filter by category/account/type, tap to edit, swipe/undo delete.
5. **Dashboard** — spent/earned/saved, daily average, safe-to-spend, category donut, month-over-month trend.
6. **Budgets** — per-category monthly limits with carryover, progress bars.
7. **Settings** — reconnect, currency, export CSV, sync status, conflict count, disconnect.

## 8. Build phases

### Phase 0 — Scaffold *(done)*
- [x] Merged plan note
- [x] npm workspaces: `apps/app`, `apps/script`, `packages/core`
- [x] `packages/core`: types, schema, money, id, sheet client, sync engine, Dexie store
- [x] Apps Script source: `Code.gs`, `Api.gs`, `Sheet.gs`, `Setup.gs`, `appsscript.json`
- [x] App shell: router, Tailwind, Connect + Add + History + Dashboard + Settings
- [x] Dev mock backend (`POST /__mock`) so the whole app runs without a Google account
- [x] Verified: add → local write → push → sheet row, plus pull into dashboard/history

### Phase 1 — Prove the loop *(gate — do this before more UI)*
- [ ] Deploy script from the template sheet, run Setup, copy URL + token
- [ ] `ping` from the browser (verify CORS) and from the APK (`CapacitorHttp` bypasses CORS)
- [ ] Write a row → read it back → delete it (tombstone propagates)
- [ ] Two-device concurrent write under `LockService` — no corruption
- [ ] If browser CORS blocks: add a ~30-line Cloudflare Worker proxy (no login, stores nothing)

### Phase 2 — Sync hardening
- [ ] Outbox retry with backoff, `dirty` flag clearing
- [ ] Full reconcile on launch, conflict surfacing
- [ ] Header/tab validation errors shown as "your sheet was modified", never silent

### Phase 3 — P0 features
- [ ] Accounts + Transfers (balances must be right from day one)
- [ ] Categories + subcategories, custom icon/colour
- [ ] Quick templates ("Chai ₹20"), search, filters, undo
- [ ] Monthly dashboard, offline queue badge
- [ ] Biometric lock (Capacitor plugin), dark mode, `Intl.NumberFormat`

### Phase 4 — P1 features
- [ ] Budgets with carryover, safe-to-spend today
- [ ] Category donut, month-over-month, top merchants, subscription detector
- [ ] Recurring rules auto-post
- [ ] Receipt photos → Drive folder
- [ ] Split expense + settle up, CSV/PDF export

### Phase 5 — Android
- [ ] Capacitor shell, signed APK, deep link `expensemanager://add?amount=`, app shortcuts
- [ ] Notification capture plugin (Kotlin `NotificationListenerService`) + confirm queue

### Later (do not build yet)
- Widget, Quick Settings tile
- Read-only dashboard link for a partner
- Multiple profiles (personal/business)
- Loans/EMI, goals, yearly heatmap

## 9. Security

- Token ≥ 32 random chars. Never log it. Never place it in a URL query.
- `sendBeacon`/`keepalive` must not leak the token into server logs — it is in the body, so fine.
- Escape all values written to cells (formula injection).
- All validation is server-side. The client is untrusted.
- Sheet stays private; the script acts as the owner.
- APK signing keystore must be backed up, or app updates become impossible.

## 10. Acceptance criteria

1. A new user can copy the template, run Setup, deploy, and connect in under 5 minutes using only the README.
2. Saving a debit adds exactly one row to `Expenses` within a few seconds.
3. Saving the same entry twice (same `id`) never creates a duplicate.
4. Saving offline queues the entry and syncs automatically on reconnect.
5. A wrong token is rejected with a readable "reconnect" prompt.
6. Renaming a tab or header is caught by `ping`/Validate with a clear message.
7. Opening the installed app lands on Add with the amount field ready.
8. Editing a row on the phone appears on the web dashboard after sync, and vice versa.
9. Deleting on one device does not resurrect on another.

## 11. Risks

1. **CORS** — Apps Script web apps do not reliably send CORS headers. Android is solved via `CapacitorHttp`; browser is proven in Phase 1, with a Worker proxy as fallback.
2. **Setup friction** — ~8 clicks + a Google consent screen. Mitigated by the tour, a pre-built sheet menu ("Expense Tracker → Show connection info"), and a `/copy` template link.
3. **Apps Script quotas** — 20k requests/day, 6 min/run, ~30 concurrent. A family ledger uses a tiny fraction.
4. **Hand-edited sheets** — header validation + explicit error, never silent corruption.
5. **WebView storage eviction** — acceptable: the sheet is the truth, local is a cache.

## 12. Open questions

- App name — must be short and easy to say aloud. Candidates: ____
- Currency/locale default: `INR` / `en-IN` *(assumed)*
- Delete semantics: tombstone only *(decided)*, but should the sheet hide them? *(v1: keep rows, add an AutoFilter)*
- PWA hosting: Cloudflare Pages or GitHub Pages *(v1: whichever is fastest)*
