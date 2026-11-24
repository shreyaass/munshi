import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { sound } from '../lib/sound';
import { useTheme } from '../lib/theme';

export function Privacy() {
  const navigate = useNavigate();
  const { resolved, setMode } = useTheme();

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between selection:bg-accent/20 transition-colors duration-300">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur-md px-6 sm:px-10 md:px-12 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <button
            type="button"
            onClick={() => {
              sound.play('click');
              navigate('/landing');
            }}
            className="flex items-center gap-2.5 select-none group cursor-pointer"
            title="Return to home"
          >
            <Logo className="h-7 w-7 group-hover:scale-105 transition-transform" />
            <span className="font-display text-xl font-semibold tracking-tight text-text group-hover:text-accent transition-colors">
              Munshi
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode(resolved === 'dark' ? 'light' : 'dark');
              }}
              aria-label="Toggle theme"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface/70 text-text hover:bg-raised transition-all active:scale-95 shadow-sm"
            >
              <Icon
                name={resolved === 'dark' ? 'light_mode' : 'dark_mode'}
                size={18}
                className="text-accent"
              />
            </button>
            <a
              href="https://github.com/shreyaass/munshi"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sound.play('click')}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface/70 px-3.5 text-xs font-semibold text-text hover:bg-raised transition-colors shadow-sm"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-3xl px-6 sm:px-8 py-10 sm:py-16 flex-1">
        {/* Header Hero */}
        <div className="space-y-4 border-b border-line/60 pb-8">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
            <span>LEGAL &amp; SECURITY</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-text">
            Privacy Policy
          </h1>
          <p className="font-mono text-xs text-muted">
            Effective Date: November 2026 · Version 1.1 · Open Source &amp; Client-Side
          </p>
        </div>

        {/* Executive Summary Callout */}
        <div className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-5 sm:p-6 space-y-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-accent font-semibold text-sm font-sans">
            <Icon name="verified_user" size={18} />
            <span>The 10-Second Summary</span>
          </div>
          <p className="text-sm leading-relaxed text-text/90">
            Munshi was architected from line one with zero central servers. When you log transactions, plan budgets, or review your monthly limit, your data travels directly between your web browser and your personal Google Sheet. We do not run tracking cookies, analytics pixels, or telemetry databases. <strong>We cannot see your money because we do not have a server to send it to.</strong>
          </p>
        </div>

        {/* Policy Body */}
        <div className="mt-10 space-y-10 text-sm leading-relaxed text-text/85">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              1. What Information We Collect
            </h2>
            <p>
              <strong>None.</strong> Munshi operates as a pure client-side application (Single-Page Application). We do not collect, harvest, aggregate, sell, or share personal identifiable information (PII), transaction records, bank accounts, or financial metrics.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              2. How Your Data Syncs (Direct Browser-to-Google Architecture)
            </h2>
            <p>
              When you connect Munshi to your Google Sheet, you deploy an open-source Google Apps Script inside your own Google Drive. 
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-muted dark:text-text/80">
              <li>All HTTPS requests execute directly from your device to Google’s servers (<code className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface border border-line">script.google.com</code>).</li>
              <li>No intermediary proxy, proxy-cache, or Munshi cloud server sits between you and Google.</li>
              <li>All financial calculations (running balances, category aggregations, goal water levels) run locally in your browser's JavaScript engine.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              3. Local Storage on Your Device
            </h2>
            <p>
              To provide instant offline speeds and an app-like experience without reloading from Google on every tab switch, Munshi stores temporary operational data locally on your device using standard browser storage (<code className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface border border-line">localStorage</code> and IndexedDB via Dexie.js).
            </p>
            <p className="text-muted dark:text-text/80">
              This data includes your Apps Script URL, your personal connection token, UI theme preference, and a cached copy of your sheet rows. You can wipe this local cache at any moment by disconnecting your sheet in Settings or clearing your browser's site data.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              4. Google API User Data &amp; Limited Use Disclosure
            </h2>
            <p>
              Munshi's use and transfer of information received from Google APIs adheres to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline font-medium hover:brightness-110"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements:
            </p>
            <div className="rounded-xl border border-line bg-surface/60 p-4 space-y-2 text-xs font-sans text-muted">
              <p>• Munshi only requests permissions necessary to read and append rows to your designated spreadsheet.</p>
              <p>• Google user data is never transferred to third parties or data brokers.</p>
              <p>• Google user data is never used to train generalized artificial intelligence (AI) or machine learning (ML) models.</p>
              <p>• Google user data is never used to serve targeted or personalized advertising.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              5. Cookies and Third-Party Tracking
            </h2>
            <p>
              Munshi uses <strong>zero third-party cookies</strong>, zero advertising trackers, and zero behavioral telemetry scripts (no Google Analytics, no Meta Pixel, no Mixpanel). We respect your privacy out of the box.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              6. Open Source Code Verification
            </h2>
            <p>
              You do not have to take our word for it. Munshi is licensed under the OSI-approved <strong>MIT License</strong>. Every line of frontend code and Google Apps Script is publicly visible, verifiable, and auditable on{' '}
              <a
                href="https://github.com/shreyaass/munshi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline font-medium hover:brightness-110"
              >
                GitHub
              </a>.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 border-t border-line/60 pt-6">
            <h2 className="font-display text-xl font-semibold text-text">
              7. Contact &amp; Inquiries
            </h2>
            <p>
              If you have any questions or security disclosures regarding this policy, please open an issue or security advisory directly on the project's repository:{' '}
              <a
                href="https://github.com/shreyaass/munshi/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline font-medium hover:brightness-110"
              >
                github.com/shreyaass/munshi/issues
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line/50 bg-surface/40 py-6 px-6 text-center text-xs text-muted">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Munshi · Built for privacy · Your ledger. Your data. Your rules.</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                sound.play('click');
                navigate('/terms');
              }}
              className="hover:text-text underline"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => {
                sound.play('click');
                navigate('/landing');
              }}
              className="hover:text-text underline"
            >
              Landing Page
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
