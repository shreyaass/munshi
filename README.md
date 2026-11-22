# Munshi (मुंशी) — The Private Ledger & Goal Tracker

> **Your money. Your rules. Your private Google Sheet as the database.**  
> Zero subscriptions · Zero server costs · 100% Data Ownership · Offline-First PWA & Android App.

[![Download APK](https://img.shields.io/badge/Download%20APK-Android-brightgreen?style=for-the-badge&logo=android)](https://github.com/shreyaass/munshi/releases/latest/download/munshi-app-debug.apk)
[![Launch Web App](https://img.shields.io/badge/Launch%20App-Web%20%2F%20PWA-C8A45C?style=for-the-badge&logo=googlechrome)](https://munshi.shreyaas.workers.dev)
[![Watch Promo](https://img.shields.io/badge/Watch%20Promo-Interactive%203D-99732B?style=for-the-badge&logo=youtube)](https://shreyaass.github.io/munshi/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF.svg)](https://capacitorjs.com/)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/shreyaass/munshi/build-apk.yml?branch=main&label=Build%20APK)](https://github.com/shreyaass/munshi/actions)
[![Downloads](https://img.shields.io/github/downloads/shreyaass/munshi/total.svg)](https://github.com/shreyaass/munshi/releases)

---

### 📲 Quick Links & Downloads

| Platform | Link | Description |
|---|---|---|
| **Android App** | [**⬇️ Download Munshi APK (`munshi-app-debug.apk`)**](https://github.com/shreyaass/munshi/releases/latest/download/munshi-app-debug.apk) | Native Android application with offline IndexedDB cache and fast launch. |
| **Web App / PWA** | [**🌐 Launch Live Web App (munshi.shreyaas.workers.dev)**](https://munshi.shreyaas.workers.dev) | Runs instantly in Chrome, Safari, or Edge. Can be installed directly to home screen as a PWA. |
| **Cinematic Promo** | [**🎬 Watch Interactive Promo Video**](https://shreyaass.github.io/munshi/) | 26-second 3D promotional ad trailer running GSAP 3 and Three.js 3D WebGL. |
| **Latest Releases** | [**📦 All GitHub Releases & Checksums**](https://github.com/shreyaass/munshi/releases/latest) | View changelogs, build artifacts, and release notes. |

---

## 🎬 Cinematic Promo Ad

Watch Munshi's features in action through our 26-second interactive promotional motion experience built with GSAP 3 and Three.js:

[![Watch Interactive Promo](https://img.shields.io/badge/▶_Launch_Interactive_Promo-1080p_60fps-C8A45C?style=for-the-badge)](https://shreyaass.github.io/munshi/)

> 🍿 **[Open Promo Video Player (shreyaass.github.io/munshi)](https://shreyaass.github.io/munshi/)**  
> *Live in browser · Space to pause / resume · R to restart.*

### Video Scenes:
1. **Act 1: The Sovereign Aperture (0:00 - 0:03)** — The Munshi emblem emerges; the inner ledger drops through 3D space and the camera dives right through the portal hole.
2. **Act 2: The Digital Bahi Khata (0:03 - 0:08)** — Concentric golden impact ripples expand as the 3D ledger swings open to reveal dual-spread credit/debit pages and a verified net surplus seal.
3. **Act 3: Disciplined Wealth Control (0:08 - 0:15)** — Visual liquid wave bucket rising to 75% savings target; external master theme toggle flips the entire screen into Warm Sand light mode.
4. **Act 4: Peer-to-Sheet Architecture (0:15 - 0:20)** — Direct local-first device sync to your personal Google Sheet via a strictly confined laser conduit.
5. **Act 5: Grand Finale (0:20 - 0:26)** — Emblem corona, privacy guarantees, and instant launch CTA.

---

## 🌟 For Everyday Users (The Layman's Guide)

### What is Munshi?
Most expense tracker apps force you to store your private bank details, transactions, and life savings on someone else's company servers. If they go out of business or change their pricing, your data is locked behind a paywall.

**Munshi** (Hindi for *Accountant / Bookkeeper*) changes that. It is a handcrafted, dark-brass themed personal ledger (*Kaala Bahi*) that runs directly in your browser or on your Android phone as a native app — but **stores everything inside your own personal Google Sheet**.

### Why you'll love it:
- 🔒 **100% Private**: Nobody else ever sees your financial numbers — not even us. It talks directly to your private Google account.
- ⚡ **Works Offline**: Add expenses or transfer money anywhere, even on a plane. The app syncs seamlessly once you're back online.
- 🌊 **Fluid Saving Goals**: Visual animated water cards show exactly how close you are to buying that new phone, laptop, or dream vacation.
- 🛡️ **Pace & Limit Guardrails**: Keep your monthly spending under control with live pace indicators that warn you before you overshoot.
- 💰 **Zero Cost**: Completely free forever. No ads, no monthly in-app purchases.

---

### 📱 Installing the Android APK

1. Tap **[Download Munshi APK](https://github.com/shreyaass/munshi/releases/latest/download/munshi-app-debug.apk)** on your Android phone (or download from the [v1.0.0 Release page](https://github.com/shreyaass/munshi/releases/tag/v1.0.0)).
2. Open the downloaded file (`munshi-app-debug.apk`).
3. If prompted by Android, tap **Settings** and enable **Allow from this source** (standard for APKs installed outside Google Play).
4. If Google Play Protect shows an "Unrecognized app" prompt, tap **Install anyway**.
5. Launch **Munshi** and connect your private Google Sheet!

---

## 🚀 Getting Started in 3 Steps

You only need a Google account and 3 minutes to set up.

> 📖 **Need a complete walkthrough?**  
> Check out the **[Complete Google Sheet Setup & Connection Guide (sheet/SETUP.md)](sheet/SETUP.md)** for detailed step-by-step instructions with troubleshooting tips.

1. **Make a Copy of the Ledger Sheet**
   - Download the template **[sheet/ExpenseManager-template.xlsx](sheet/ExpenseManager-template.xlsx)** and upload it to your [Google Drive](https://drive.google.com), then click **File → Save as Google Sheets**.
2. **Deploy the Private Script**
   - In your Google Sheet, go to **Extensions → Apps Script**.
   - Copy the ready-to-paste backend code from **[sheet/AppsScript.gs](sheet/AppsScript.gs)**, click **Deploy → New deployment → Web app**.
   - Select **Execute as: Me** and **Who has access: Anyone**.
3. **Connect & Track**
   - Open the **Expense Tracker** menu in your Sheet → **Show connection info**.
   - Open Munshi, paste your connection URL and security token, and you are ready to track!

---

## 🛠️ For Developers & Builders

Munshi is structured as an enterprise-grade TypeScript monorepo with an offline-first, local-first architecture.

### Architecture Overview

```text
┌────────────────────────────────────────────────────────┐
│               Munshi Client (PWA / Android)           │
│                                                        │
│  React 18 + Tailwind + Framer Motion + Material Icons  │
│  IndexedDB Cache (Dexie / Local-first Outbox)          │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (Encrypted JSON envelope)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Apps Script Web App Backend             │
│                                                        │
│  Runs inside user's private Google account             │
│  LockService mutex serialization · Token validation    │
└───────────────────────────┬────────────────────────────┘
                            │ Sheet Service API
                            ▼
┌────────────────────────────────────────────────────────┐
│               User's Private Google Sheet             │
│                                                        │
│  Accounts · Entries · Goals · Categories · MonthlyCaps │
└────────────────────────────────────────────────────────┘
```

### Key Engineering Principles
- **Integer Arithmetic Everywhere**: Floating-point math is banned. All currency values are strictly stored and computed in integer paise ($1 = 100 \text{ paise}$) via `@em/core`.
- **CRDT / Outbox Sync Engine**: Every record contains `{ id, updated_at, device_id, deleted }`. Local changes write instantly to IndexedDB with `dirty=1`. Background sync resolves conflicts with deterministic last-write-wins.
- **Mock Backend for Fast Iteration**: Run `npm run dev` and connect with URL `http://localhost:5173/__mock` and token `dev-token` to develop full features without touching Google APIs.

### Project Structure

```text
├── apps/
│   ├── app/               # React 18 + Vite PWA + Capacitor Android wrapper
│   │   ├── android/       # Native Android Studio project (Capacitor)
│   │   ├── public/promo/  # Deployed cinematic promo trailer
│   │   ├── src/           # UI components, pages, hooks, state
│   │   └── capacitor.config.ts
│   └── script/            # Apps Script source files (modular .gs files)
├── packages/
│   └── core/              # Shared platform-agnostic business logic & unit tests
├── promo/                 # Standalone full-motion promotional ad source
├── sheet/                 # Bundled AppsScript.gs & Excel template generator
├── scripts/               # Icon & asset generation pipelines
└── LICENSE                # MIT Open Source License
```

---

## 💻 Developer Quickstart

### Prerequisites
- Node.js 22+ and npm
- Java OpenJDK 17 (only required if compiling Android APK locally)

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

---

## 🔒 Security & Privacy Audited
- No analytics trackers or spyware embedded in application code.
- No third-party servers: direct peer-to-cloud communication between your device and Google's servers.
- Stored credentials and tokens are kept in secure client storage and never broadcasted.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more details.

Crafted by [shreyaass](https://github.com/shreyaass).
