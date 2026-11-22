# Munshi (मुंशी) — The Private Ledger & Goal Tracker

> **Your money. Your rules. Your private Google Sheet as the database.**  
> Zero subscriptions · Zero server costs · 100% Data Ownership · Offline-First PWA & Android App.

[![Download APK](https://img.shields.io/badge/Download%20APK-Android-brightgreen?style=for-the-badge&logo=android)](https://github.com/shreyaass/munshi/releases/latest/download/munshi-app-debug.apk)
[![Launch Web App](https://img.shields.io/badge/Launch%20App-Web%20%2F%20PWA-C8A45C?style=for-the-badge&logo=googlechrome)](https://shreyaass.github.io/munshi/)
[![Explore Landing](https://img.shields.io/badge/Landing%20Page-Explore%20Munshi-161A21?style=for-the-badge)](https://shreyaass.github.io/munshi/#/landing)
[![Watch Promo](https://img.shields.io/badge/Watch%20Promo-Interactive%203D-99732B?style=for-the-badge&logo=youtube)](https://shreyaass.github.io/munshi/promo/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF.svg)](https://capacitorjs.com/)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/shreyaass/munshi/build-apk.yml?branch=main&label=Build%20APK)](https://github.com/shreyaass/munshi/actions)
[![Downloads](https://img.shields.io/github/downloads/shreyaass/munshi/total.svg)](https://github.com/shreyaass/munshi/releases)

---

### Quick Links & Downloads

| Resource | Link | Description |
|---|---|---|
| **Android App** | [**Download Munshi APK (`munshi-app-debug.apk`)**](https://github.com/shreyaass/munshi/releases/latest/download/munshi-app-debug.apk) | Native Android APK with offline IndexedDB cache, timid haptic clicks, and instant startup. |
| **Web App / PWA** | [**Launch Live Web App (shreyaass.github.io/munshi)**](https://shreyaass.github.io/munshi/) | Instant in Chrome, Safari, Edge. Installable as PWA on desktop & iOS. |
| **Landing Page** | [**View Landing Showcase (`#/landing`)**](https://shreyaass.github.io/munshi/#/landing) | Editorial showcase with phone preview, value cards, and setup triggers. |
| **Interactive Tour** | [**5-Step Guided Setup Tour (`#/tour`)**](https://shreyaass.github.io/munshi/#/tour) | Walkthrough with direct GitHub template and script links. |
| **Excel Template** | [**Download `ExpenseManager-template.xlsx`**](https://github.com/shreyaass/munshi/raw/main/sheet/ExpenseManager-template.xlsx) | Ready-to-use spreadsheet template with all schemas and columns pre-built. |
| **Apps Script Code** | [**View `sheet/AppsScript.gs`**](https://github.com/shreyaass/munshi/blob/main/sheet/AppsScript.gs) | Bundled backend code that runs privately inside your Google Sheet. |
| **Cinematic Promo** | [**Watch Interactive Promo Video**](https://shreyaass.github.io/munshi/promo/) | 26-second 3D promotional ad trailer running GSAP 3 and Web Audio engine. |
| **Releases & Checksums** | [**All GitHub Releases**](https://github.com/shreyaass/munshi/releases/latest) | View changelogs, build artifacts, and release notes. |

---

## Cinematic Promo Ad

Watch Munshi's features in action through our 26-second interactive promotional motion experience built with GSAP 3 and Web Audio API:

[![Watch Interactive Promo](https://img.shields.io/badge/Launch_Interactive_Promo-1080p_60fps-C8A45C?style=for-the-badge)](https://shreyaass.github.io/munshi/)

> **[Open Promo Video Player (shreyaass.github.io/munshi)](https://shreyaass.github.io/munshi/)**  
> *Live in browser · Space to pause / resume · R to restart.*

### Video Scenes:
1. **Act 1: The Sovereign Aperture (0:00 - 0:03)** — The Munshi emblem emerges; the inner ledger drops through 3D space and the camera dives through the portal.
2. **Act 2: The Digital Bahi Khata (0:03 - 0:08)** — Concentric golden impact ripples expand as the 3D ledger swings open; credit and debit entries appear with typewriter register chimes.
3. **Act 3: Disciplined Wealth Control (0:08 - 0:15)** — Fluid liquid bucket rises with authentic water filling sound; external master theme toggle flips the screen into Warm Sand light mode with mechanical switch snap.
4. **Act 4: Peer-to-Sheet Architecture (0:15 - 0:20)** — Direct local-first device sync to your personal Google Sheet with high-speed telemetry audio stream.
5. **Act 5: Grand Finale (0:20 - 0:26)** — Triumphant conclusion track, emblem corona, and launch CTA.

---

## For Everyday Users (The Layman's Guide)

### What is Munshi?
Most expense tracker apps force you to store your private bank details, transactions, and life savings on someone else's company servers. If they go out of business or change their pricing, your data is locked behind a paywall.

**Munshi** (Hindi for *Accountant / Bookkeeper*) changes that. It is a handcrafted, dark-brass themed personal ledger (*Kaala Bahi*) that runs directly in your browser or on your Android phone as a native app — but **stores everything inside your own personal Google Sheet**.

### Why you'll love it:
- **100% Private**: Nobody else ever sees your financial numbers — not even us. It talks directly to your private Google account.
- **Works Offline**: Add expenses or transfer money anywhere, even on a plane. The app syncs seamlessly once you're back online.
- **Refined Sound & Haptics**: Subtle, timid mechanical clicks and chimes for transaction logs, theme toggles, and sync operations.
- **Fluid Saving Goals**: Visual animated water cards show exactly how close you are to buying that new phone, laptop, or dream vacation.
- **Monthly Spending Guardrails**: Dynamic daily-safe pacing bar keeps you disciplined before you overspend.
- **Dual Themes**: Obsidian Dark & Warm Sand Light crafted with Fraunces serif and IBM Plex Mono typography.
- **Zero Cost Forever**: Built on free Google Drive and Apps Script quotas (more than enough for a lifetime of expenses).

---

## 5-Minute Setup Guide

Connecting your private Google Sheet takes less than two minutes:

1. **Copy the Sheet**: Open the [Excel / Google Sheet Template](https://github.com/shreyaass/munshi/raw/main/sheet/ExpenseManager-template.xlsx) and save a copy in your Google Drive.
2. **Open Extensions**: In your spreadsheet menu, click **Extensions → Apps Script**. (Code is already inside the template, or copy from [AppsScript.gs](https://github.com/shreyaass/munshi/blob/main/sheet/AppsScript.gs)).
3. **Deploy as Web App**:
   - Click **Deploy → New deployment → Web app**.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Authorize with your Google account.
4. **Copy URL & Token**:
   - Reload your Google Sheet.
   - Click menu **Munshi → Show Connection Info**.
   - Copy the **Web App URL** and the **Access Token**.
5. **Paste and Track**:
   - Open [Munshi Web App](https://shreyaass.github.io/munshi/) or the [Android APK](https://github.com/shreyaass/munshi/releases/latest/download/munshi-app-debug.apk).
   - Paste both values into the Connect screen. You're done!

---

## Technical Architecture

Munshi is engineered as a **local-first peer-to-cloud reactive system**:

```text
┌────────────────────────────────────────────────────────┐
│             Munshi Client (Web / Android)              │
│                                                        │
│  React 19 · Vite · Tailwind CSS · Web Audio Engine     │
│  Dexie.js (Encrypted IndexedDB Offline-First Outbox)   │
└───────────────────────────┬────────────────────────────┘
                            │
               Direct HTTPS POST (No Middleman)
               Simple CORS POST to avoid preflight
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Google Apps Script Web App (API)            │
│                                                        │
│  doPost() · Bearer Token Auth · LockService (Mutex)    │
│  Formula Injection Sanitizer · Schema Validator        │
└───────────────────────────┬────────────────────────────┘
                            │ Sheet Service API
                            ▼
┌────────────────────────────────────────────────────────┐
│               User's Private Google Sheet              │
│                                                        │
│  Accounts · Entries · Goals · Categories · MonthlyCaps │
└────────────────────────────────────────────────────────┘
```

### Key Engineering Principles
- **Integer Arithmetic Everywhere**: Floating-point math is banned. All currency values are strictly stored and computed in integer paise (₹1 = 100 paise) via `@em/core`.
- **CRDT / Outbox Sync Engine**: Every record contains `{ id, updated_at, device_id, deleted }`. Local changes write instantly to IndexedDB with `dirty=1`. Background sync resolves conflicts with deterministic last-write-wins.
- **Web Audio & Haptic Feedback**: Embedded base64 synthesis for near-zero tap latency and offline operation across Web and Android WebView.
- **Mock Backend for Fast Iteration**: Run `npm run dev` and connect with URL `http://localhost:5173/__mock` and token `dev-token` to develop full features without touching Google APIs.

### Project Structure

```text
├── apps/
│   ├── app/               # React 19 + Vite PWA + Capacitor Android wrapper
│   │   ├── android/       # Native Android Studio project (Capacitor)
│   │   ├── public/promo/  # Deployed cinematic promo trailer
│   │   ├── src/           # UI components, pages, hooks, sound engine
│   │   └── capacitor.config.ts
│   └── script/            # Modular Apps Script source files (.gs)
├── packages/
│   └── core/              # Shared platform-agnostic business logic & unit tests
├── promo/                 # Standalone full-motion promotional ad source
├── sheet/                 # Bundled AppsScript.gs & Excel template generator
├── scripts/               # Icon & asset generation pipelines
└── LICENSE                # MIT Open Source License
```

---

## Developer Quickstart

### Prerequisites
- Node.js 22+ and npm
- Java OpenJDK 21 (only required if compiling Android APK locally)

### Installation & Local Development

```bash
# Clone the repository
git clone https://github.com/shreyaass/munshi.git
cd munshi

# Install dependencies across all workspaces
npm install

# Start development server with built-in mock backend
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Run Tests & Quality Checks

```bash
npm run typecheck    # Strict TypeScript checks across packages
npm test             # Vitest unit test suite (core calculations & sync)
npm run build        # Production PWA build in apps/app/dist
```

### Automated Cloud Builds (GitHub Actions)

Any commit pushed to `main` automatically runs `.github/workflows/build-apk.yml`, which:
1. Builds the production bundle and syncs Capacitor Android assets.
2. Compiles `munshi-app-debug.apk` using Gradle.
3. Automatically publishes the APK as a direct download on the **[Latest GitHub Release](https://github.com/shreyaass/munshi/releases/latest)**.
4. Deploys the interactive 3D promo to **[GitHub Pages](https://shreyaass.github.io/munshi/)**.

---

## Security & Privacy Audited
- No analytics trackers or spyware embedded in application code.
- No third-party servers: direct peer-to-cloud communication between your device and Google's servers.
- Stored credentials and tokens are kept in secure client storage and never broadcasted.

---

## License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more details.

Crafted by [shreyaass](https://github.com/shreyaass).
