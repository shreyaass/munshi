import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { sound } from '../lib/sound';
import { useTheme } from '../lib/theme';

export function Terms() {
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
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-3xl px-6 sm:px-8 py-10 sm:py-16 flex-1">
        {/* Header Hero */}
        <div className="space-y-4 border-b border-line/60 pb-8">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
            <span>LEGAL &amp; COMPLIANCE</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-text">
            Terms of Service
          </h1>
          <p className="font-mono text-xs text-muted">
            Effective Date: November 2026 · Version 1.1 · Open Source under the MIT License
          </p>
        </div>

        {/* Highlight Callout */}
        <div className="mt-8 rounded-2xl border border-line bg-surface/70 p-5 sm:p-6 space-y-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-text font-semibold text-sm font-sans">
            <Icon name="gavel" size={18} className="text-accent" />
            <span>Open Source Software Agreement</span>
          </div>
          <p className="text-sm leading-relaxed text-muted dark:text-text/80">
            Munshi is free, open-source software provided under the terms of the MIT License. By using the Munshi application or connecting your Google Sheet, you agree to these Terms. Because Munshi is client-side, you retain 100% control, custody, and responsibility over your Google Account and financial spreadsheets.
          </p>
        </div>

        {/* Terms Body */}
        <div className="mt-10 space-y-10 text-sm leading-relaxed text-text/85">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              1. The MIT License Grant
            </h2>
            <p>
              Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.
            </p>
            <p className="text-xs font-mono text-muted border-l-2 border-accent pl-3 my-2">
              The full MIT license text is bundled with the source code and available at github.com/shreyaass/munshi/blob/main/LICENSE.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              2. Self-Hosted Infrastructure &amp; Security Responsibility
            </h2>
            <p>
              Munshi provides the interface; your personal Google Account provides the database. You are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-muted dark:text-text/80">
              <li>Maintaining the security of your Google account, password, two-factor authentication, and Apps Script deployment tokens.</li>
              <li>Backing up or versioning your Google Sheets spreadsheet.</li>
              <li>Ensuring that unauthorized individuals do not access your unlocked device or local browser storage.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              3. No Financial Advisory or Banking Services
            </h2>
            <p>
              Munshi is a personal bookkeeping ledger designed to help you track spending habits and budget goals. Munshi is <strong>not</strong> a bank, financial planner, investment advisor, tax consultant, or certified accounting firm.
            </p>
            <p className="text-muted dark:text-text/80">
              Any computations, monthly limits, and goal trajectories displayed by the app are provided for informational and planning purposes only. Always consult a certified financial professional for tax, investment, or legal financial decisions.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              4. Disclaimer of Warranty
            </h2>
            <div className="rounded-xl border border-line bg-surface/50 p-4 font-mono text-xs text-muted leading-relaxed uppercase">
              THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY.
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-text">
              5. Third-Party Services (Google Ecosystem)
            </h2>
            <p>
              Munshi interfaces with Google Sheets and Google Apps Script. Your use of Google services remains subject to{' '}
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline font-medium hover:brightness-110"
              >
                Google’s Terms of Service
              </a>{' '}
              and Google’s service availability. Munshi cannot guarantee continuous uninterrupted uptime of third-party cloud infrastructure.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 border-t border-line/60 pt-6">
            <h2 className="font-display text-xl font-semibold text-text">
              6. Modifications &amp; Community Contributions
            </h2>
            <p>
              As an open-source project, improvements and terms may evolve to reflect technical changes. Community members can submit pull requests or review changes in the public repository:{' '}
              <a
                href="https://github.com/shreyaass/munshi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline font-medium hover:brightness-110"
              >
                github.com/shreyaass/munshi
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Unified Minimal Footer */}
      <footer className="mt-8 sm:mt-12 w-full border-t border-line/60 bg-surface/30 backdrop-blur-md py-5 sm:py-6 px-4 sm:px-6 md:px-10 transition-colors duration-300">
        <div className="mx-auto flex w-full max-w-5xl flex-col-reverse md:flex-row items-center justify-between gap-3 text-center md:text-left font-mono text-[11px] sm:text-xs text-muted">
          {/* Copyright & Hyperlinked MIT License */}
          <p className="whitespace-normal sm:whitespace-nowrap">
            © {new Date().getFullYear()} Munshi · Open source under{' '}
            <a
              href="https://github.com/shreyaass/munshi/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text hover:text-accent underline underline-offset-2 transition-colors font-medium whitespace-nowrap"
            >
              MIT License
            </a>.
          </p>

          {/* Privacy Policy, Terms, Report an issue */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-nowrap shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={() => {
                sound.play('click');
                navigate('/privacy');
              }}
              className="hover:text-text transition-colors"
            >
              Privacy Policy
            </button>
            <span className="opacity-40 select-none">·</span>
            <span className="text-text font-medium">Terms</span>
            <span className="opacity-40 select-none">·</span>
            <a
              href="https://github.com/shreyaass/munshi/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text transition-colors inline-flex items-center gap-1"
            >
              <span>Report an issue</span>
              <span className="text-[10px] opacity-70">↗</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
