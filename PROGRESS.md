# PROGRESS

Continuity file. Start here when resuming; it is written so a fresh session can
pick up without re-deriving anything.

---

## Start here

1. Read this file end to end.
2. Read `expense-manager-plan.md` §3 (decisions) and §8 (phases).
3. Run `npm run dev`, connect with the mock (`http://localhost:5173/__mock`,
   token `dev-token`) and click around before changing anything.
4. Do not start Phase 1+ work until the gate below is cleared.

---

## Snapshot

- **Now:** Session A (refinements A1–A6) — complete and committed (`latest commit`).
- **Phase:** still Phase 0/1 boundary. Phase 1 gate (real Google deploy) is not
  done because it needs the user's Google account.
- **App state:** PWA runs fully against the dev mock. No real sheet has been
  exercised yet.
- **Schema:** v2 (`Categories.pinned`, `Categories.sort_order`), additive
  migration, header matching by name.

---

## Done log

### Phase 0 — scaffold (committed `727f33c`)
- npm workspaces: `apps/app`, `apps/script`, `packages/core`.
- `packages/core`: types, schema, money, id, sheet client, sync engine.
- Apps Script: `Code.gs`, `Api.gs`, `Sheet.gs`, `Setup.gs`, `appsscript.json`.
- App shell: HashRouter, Tailwind v4, Connect/Add/History/Dashboard/Settings.
- Dev mock at `POST /__mock` (token `dev-token`, `apply: 'serve'`).
- Verified: add → local write → push → sheet row; pull into dashboard/history.

### Session A — refinements (committed `latest commit`)
- **A0 schema v2:** core `schema.ts` bumped to v2 with `pinned` + `sort_order`
  on Categories and name-based header matching (`headerIndex`, `rowFromValues`,
  `valuesFromRow`). Extra user columns tolerated; migrations only append.
  Fixed a v2 bug where `BASE` re-listed `id` and duplicated the column.
- **Apps Script v2:** `Code.gs` headers/booleans/numerics updated,
  `Sheet.gs` rewritten for name-based reads/writes and `ensureHeaders_`
  additive migration, `Setup.gs` seeds pinned categories, `Api.gs` `ping_`
  validates every tab.
- **Quick picks:** `packages/core/src/quick.ts` —
  `pickQuickCategories` (pinned by `sort_order`, then usage, then name),
  `categoryUsage`, `daysAgoISO`. Tests cover ordering, limits, deleted rows
  and the usage window.
- **Theme:** `lib/theme.tsx` + `ThemeProvider` mounted in `main.tsx`,
  pre-paint inline script in `index.html`, class-based dark variant in
  `index.css`, System/Light/Dark control in Settings.
- **Nav:** `components/Layout.tsx` rewritten — glass capsule, sliding pill
  (`layoutId`), raised centre FAB that rotates to × on the Add screen.
- **Sheet + Accounts:** `components/Sheet.tsx`, `pages/Accounts.tsx` with
  balances, add/edit/archive account and transfers; `/accounts` routed.
- **Add screen:** rewritten to never scroll (`h-full flex flex-col
  overflow-hidden`, keypad is `flex-1`). 6 expense / 2 income quick chips,
  "+ New" chip (name + emoji box + suggestions), Edit sheet to pin/reorder
  categories, details sheet for payee/date/note.
- **Mock:** now reports schema v2 and seeds `pinned`/`sort_order`.
- **Sheet format finalized:** Budgets gained an explicit `kind` column
  (`total | daily | category`; `month = *` for a standing target), and Setup
  now generates two non-synced tabs: `View` (formula-only expense view in
  rupees with category/account names resolved) and `Read me` (conventions,
  paise, tombstones, budget cheat sheet).
- **Verified:** `npm run typecheck`, `npm test` (14 passing), `npm run build`.

---

## Decisions log

- Sheet is the source of truth; Dexie is a disposable cache. Two-way
  last-write-wins with tombstones, not a push-only outbox.
- Connection is a pasted Apps Script Web App URL + token. No OAuth, no client
  secret, no expiry, sheet stays private. `LockService` serialises writes.
- The script is a frozen dumb store: `ping` / `readAll` / `batch`. All logic
  lives in the app.
- Amounts are integer paise. Dates are `YYYY-MM-DD` strings. Deletes are
  tombstones (`deleted: true` + new `updated_at`).
- Sheet schema is matched **by name**, extra columns preserved, migrations
  append only. Never reorder user columns.
- Budgets use an explicit `kind` (`total` / `daily` / `category`) plus
  `month = *` for standing targets. No sentinel ids.
- `View` and `Read me` are generated tabs, rebuilt by Setup, never synced.
- HashRouter for PWA/APK safety. Manifest shortcuts use `/#/?type=...`.
- Hosting: Cloudflare Pages (static). A Worker proxy only if browser CORS
  fails at the Phase 1 gate; CapacitorHttp bypasses CORS for the APK.
- Audience is <100 people (user + family/friends): no Play Store, no Google
  verification.
- Add screen must never scroll vertically; anything extra lives in sheets.
- Insight page = dashboard (one merged page).

---

## Next up

1. Clear the **Phase 1 gate**: deploy `apps/script` from a real sheet, run
   Setup, verify `ping` from the browser (CORS) and write/read/delete a row.
   If CORS blocks, add a ~30-line Cloudflare Worker proxy.
2. Session B:
   - Budgets as rows: `kind = total | daily | category` with `month = *`,
     replacing the current "sum of category budgets" safe-to-spend.
   - History filters: date range, amount `>`/`=`/`<`, repeated entries.
   - Dashboard budget card on the new Budgets model.
3. Session C: PWA polish (offline banner, install prompt), then Phase 5
   Android shell.

---

## Env

- Windows, PowerShell. npm workspaces (no pnpm).
- Commands: `npm run dev` (5173), `npm run typecheck`, `npm test`,
  `npm run build`.
- Dev mock: URL `http://localhost:5173/__mock`, token `dev-token`. Mock data
  resets when the dev server restarts.
- Obsidian vault root is `C:\Users\Shreyas\Desktop\Projects\My Projects`, so
  this file is already indexed.
- Browser tooling: focus the tab before screenshots; inside page scripts use
  `setTimeout` (an unfocused tab can stall `requestAnimationFrame`).

---

## File map

```
expense-manager-plan.md        authoritative plan (phases, risks, criteria)
README.md                      run instructions + mock credentials
packages/core/src/
  schema.ts                    v2 headers, name matching, budgets sentinels
  types.ts                     record types (Category has pinned/sort_order)
  quick.ts                     quick-chip selection + usage window
  money.ts  date.ts  id.ts
  client.ts                    Apps Script client (ping/readAll/batch)
  sync.ts                      two-way reconcile, LWW, tombstones
  __tests__/core.test.ts
apps/script/
  Code.gs                      schema constants, router, response helpers
  Sheet.gs                     name-based read/write, additive migration
  Api.gs                       ping / readAll / batch
  Setup.gs                     menu, seeding, token, connection dialog
apps/app/src/
  main.tsx                     ThemeProvider + StrictMode
  App.tsx                      HashRouter, lazy Dashboard, /accounts
  index.css                    Tailwind v4, class-based dark variant
  components/
    Layout.tsx                 glass nav capsule + sliding pill + FAB
    Sheet.tsx                  animated bottom sheet
    AmountPad.tsx              fills available height (no scroll)
    Icon.tsx  Toast.tsx ...
  lib/
    theme.tsx                  ThemeProvider / useTheme (system|light|dark)
    repo.ts                    Dexie reads/writes, live hooks, CSV export
    analytics.ts               totals, balances, safe-to-spend
    db.ts  connection.tsx  SyncProvider.tsx
  pages/
    Add.tsx                    no-scroll entry screen + quick chips
    Accounts.tsx               balances, accounts, transfers
    History.tsx  Dashboard.tsx  Settings.tsx  Connect.tsx  Tour.tsx
apps/app/dev/mockSheetPlugin.ts  dev-only fake Apps Script (v2)
```
