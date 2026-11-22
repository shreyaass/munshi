import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { sound } from '../lib/sound';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between selection:bg-accent/20">
      {/* =========================================================================
          TOP NAVIGATION BAR
          ========================================================================= */}
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-12">
        {/* Brand Logo - Official Logo, Non-clickable */}
        <div className="flex items-center gap-3 select-none">
          <img src="./icons/logo.svg" alt="Munshi" className="h-9 w-9 rounded-xl shadow-sm" />
          <span className="font-display text-xl font-semibold tracking-tight text-text">
            Munshi
          </span>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-3">
          {/* GitHub Link */}
          <a
            href="https://github.com/shreyaass/munshi"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sound.play('click')}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-line bg-surface/60 px-3.5 py-2 text-xs font-semibold text-text hover:bg-raised transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>GitHub</span>
          </a>

          {/* Start Tour */}
          <button
            type="button"
            onClick={() => {
              sound.play('click');
              navigate('/tour');
            }}
            className="hidden sm:inline-flex rounded-xl border border-line bg-surface/60 px-4 py-2 text-xs font-semibold text-text hover:bg-raised transition-colors"
          >
            Start the tour
          </button>

          {/* Connect / Get Started */}
          <button
            type="button"
            onClick={() => {
              sound.play('click');
              navigate('/connect');
            }}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-on-accent hover:brightness-105 shadow-sm transition-all active:scale-[0.98]"
          >
            Get started
          </button>
        </div>
      </header>

      {/* =========================================================================
          HERO & MOCKUP SECTION
          ========================================================================= */}
      <main className="mx-auto my-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 py-8 md:px-12 lg:py-16">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Headline, Value Props & CTAs */}
          <div className="space-y-8 lg:col-span-7">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-accent/90">
              <span>&lt;/&gt;</span>
              <span>Open Source · MIT Licensed</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-text leading-[1.08]">
              Your money, kept <br className="hidden sm:inline" />
              like a <span className="font-serif italic text-accent font-normal">ledger.</span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-muted">
              Track spending, stay under a monthly limit and fill your goals. Every entry lives in your own Google Sheet.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.play('click');
                  navigate('/connect');
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-on-accent shadow-md hover:brightness-105 transition-all active:scale-[0.99]"
              >
                <span>Get started</span>
                <Icon name="arrow_forward" size={16} />
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.play('click');
                  navigate('/tour');
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface/60 px-6 py-3.5 text-sm font-semibold text-text hover:bg-raised transition-colors active:scale-[0.99]"
              >
                <Icon name="play_arrow" size={17} className="text-accent" />
                <span>Start the tour</span>
              </button>
            </div>

            {/* 3 Core Value Props in Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-line/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text font-semibold text-sm">
                  <Icon name="speed" size={18} className="text-accent" />
                  <span>Monthly limit</span>
                </div>
                <p className="text-xs text-muted leading-snug">
                  See what is left, every day
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text font-semibold text-sm">
                  <Icon name="water_drop" size={18} className="text-accent" />
                  <span>Goals that fill up</span>
                </div>
                <p className="text-xs text-muted leading-snug">
                  Watch the water rise
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text font-semibold text-sm">
                  <Icon name="grid_view" size={18} className="text-accent" />
                  <span>Your Google Sheet</span>
                </div>
                <p className="text-xs text-muted leading-snug">
                  Every entry stays yours
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Smartphone Chassis Mockup */}
          <div className="flex justify-center lg:col-span-5 lg:justify-end">
            <div className="relative w-full max-w-[340px] rounded-[42px] border-[5px] border-[#222731] bg-[#0E1116] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_40px_rgba(200,164,92,0.12)]">
              {/* Phone Speaker Notch */}
              <div className="mx-auto mb-4 h-4 w-28 rounded-full bg-[#181C24] flex items-center justify-center">
                <div className="h-1.5 w-10 rounded-full bg-[#272E3B]" />
              </div>

              {/* In-Phone App Mockup Header */}
              <div className="flex items-center justify-between pb-3 px-1">
                <span className="font-display font-semibold text-lg text-text">Munshi</span>
                <Icon name="settings" size={18} className="text-muted" />
              </div>

              {/* Monthly Limit Card */}
              <div className="rounded-[18px] border border-expense/30 bg-surface/70 p-3.5 mb-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono font-semibold uppercase tracking-wider text-muted mb-1">
                  <span>MONTHLY LIMIT</span>
                  <span className="rounded-full bg-expense/15 px-2 py-0.5 text-expense text-[9px]">
                    Close to limit
                  </span>
                </div>
                <div className="font-mono text-2xl font-semibold text-text">
                  ₹1,580
                </div>
                <p className="text-[11px] text-muted mt-0.5 mb-2.5">
                  left of ₹20,000 · 8 days to go
                </p>
                <div className="h-1.5 w-full rounded-full bg-raised overflow-hidden">
                  <div className="h-full w-[92%] rounded-full bg-expense" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-muted mt-2">
                  <span>Spent ₹18,420 · 92%</span>
                  <span className="text-accent">₹197 a day safe</span>
                </div>
              </div>

              {/* Saving This Month Card */}
              <div className="rounded-[18px] border border-line bg-surface/70 p-3.5 mb-2.5">
                <div className="flex justify-between text-[10px] font-mono font-semibold uppercase tracking-wider text-muted mb-1">
                  <span>SAVING THIS MONTH</span>
                  <span className="text-accent font-bold">23%</span>
                </div>
                <div className="font-mono text-lg font-semibold text-text">
                  ₹6,200 <span className="text-xs text-muted font-normal">of ₹26,800</span>
                </div>
                <p className="text-[10px] text-muted mt-0.5">
                  Needed to stay on pace for 3 goals
                </p>
              </div>

              {/* Goals Card with Fluid Waves */}
              <div className="rounded-[18px] border border-line bg-surface/70 p-3.5 mb-2.5">
                <div className="flex justify-between text-[10px] font-mono font-semibold uppercase tracking-wider text-muted mb-2">
                  <span>GOALS</span>
                  <span className="text-accent">All</span>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-line bg-raised/70 p-3">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-semibold text-text">✈ #1 Goa trip</span>
                    <span className="font-mono text-xs font-bold text-accent">40%</span>
                  </div>
                  <p className="font-mono text-[11px] text-muted">
                    ₹12,000 saved of ₹30,000
                  </p>
                  {/* Subtle Wave Animation Mock */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-line overflow-hidden">
                    <div className="h-full w-[40%] bg-accent rounded-full" />
                  </div>
                </div>
              </div>

              {/* Recent Transaction Item */}
              <div className="rounded-[16px] border border-line/60 bg-surface/50 p-2.5 mb-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised text-muted">
                    <Icon name="restaurant" size={13} />
                  </span>
                  <div>
                    <p className="font-medium text-text text-[11px]">Swiggy</p>
                    <p className="text-[9px] text-muted">Food · Today</p>
                  </div>
                </div>
                <span className="font-mono font-semibold text-expense text-xs">- ₹420</span>
              </div>

              {/* Bottom Phone Nav Bar */}
              <div className="relative mt-3 flex items-center justify-around border-t border-line/60 pt-2 pb-1 text-[10px] text-muted">
                <div className="flex flex-col items-center text-accent">
                  <Icon name="bar_chart" size={16} />
                  <span className="text-[8px] mt-0.5">Dashboard</span>
                </div>
                <div className="flex flex-col items-center">
                  <Icon name="history" size={16} />
                  <span className="text-[8px] mt-0.5">History</span>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm">
                  <Icon name="add" size={16} />
                </div>
                <div className="flex flex-col items-center">
                  <Icon name="savings" size={16} />
                  <span className="text-[8px] mt-0.5">Goals</span>
                </div>
                <div className="flex flex-col items-center">
                  <Icon name="account_balance_wallet" size={16} />
                  <span className="text-[8px] mt-0.5">Accounts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          FOOTER BAR
          ========================================================================= */}
      <footer className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 border-t border-line/40 px-6 py-6 font-sans text-xs text-muted sm:flex-row md:px-12">
        <p>
          Your entries live in your Google Sheet. Munshi keeps only a local cache.
        </p>
        <p>
          MIT License · <a href="https://github.com/shreyaass/munshi" target="_blank" rel="noopener noreferrer" className="hover:text-text underline">github.com/shreyaass/munshi</a>
        </p>
      </footer>
    </div>
  );
}
