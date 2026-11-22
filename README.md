# Munshi (मुंशी) — The Private Ledger & Goal Tracker

> **Your money. Your rules. Your private Google Sheet as the database.**  
> Zero subscriptions · Zero server costs · 100% Data Ownership · Offline-First PWA & Android App.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF.svg)](https://capacitorjs.com/)
[![Downloads](https://img.shields.io/github/downloads/shreyaass/munshi/total.svg)](https://github.com/shreyaass/munshi/releases)

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
│  React 18 + Tailwind + Framer Motion + Lucide Icons    │
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
│   │   ├── src/           # UI components, pages, hooks, state
│   │   └── capacitor.config.ts
│   └── script/            # Apps Script source files (modular .gs files)
├── packages/
│   └── core/              # Shared platform-agnostic business logic & unit tests
├── sheet/                 # Bundled AppsScript.gs & Excel template generator
├── scripts/               # Icon & asset generation pipelines
└── LICENSE                # MIT Open Source License
```

---

## 💻 Developer Quickstart

### Prerequisites
- Node.js 18+ and npm
- Java OpenJDK 17 (only required for compiling Android APK)

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

### Building the Android APK

```bash
# Sync production web assets into Android project
npx cap sync android

# Build debug APK
cd apps/app/android
./gradlew assembleDebug
```
The output APK will be generated at `apps/app/android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🔒 Security & Privacy Audited
- No analytics trackers or spyware embedded in application code.
- No third-party servers: direct peer-to-cloud communication between your device and Google's servers.
- Stored credentials and tokens are kept in secure client storage and never broadcasted.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more details.

Crafted by [shreyaass](https://github.com/shreyaass).
