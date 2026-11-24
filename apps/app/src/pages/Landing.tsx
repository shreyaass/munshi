import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { sound } from '../lib/sound';
import { useTheme } from '../lib/theme';

export function Landing() {
  const navigate = useNavigate();
  const { resolved, setMode } = useTheme();

  return (
    <div className="relative min-h-screen bg-bg text-text flex flex-col justify-between selection:bg-accent/20 overflow-x-hidden transition-colors duration-300">
      {/* =========================================================================
          DYNAMIC MOVING GLOWING GRADIENTS (Vibrant, Kinetic, Throughout All Viewports)
          Dark Mode: Luminous Gold / Brass (#C8A45C, #DFBA6B)
          Light Mode: Luminous Warm Copper (#A95F32, #C46E3A)
          ========================================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10 select-none" aria-hidden="true">
        {/* Central Rotating Conic Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[950px] xl:w-[1300px] h-[650px] sm:h-[950px] xl:h-[1300px] rounded-full animate-ambient-spin opacity-70 dark:opacity-60 blur-[90px] sm:blur-[130px]">
          <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg_at_50%_50%,rgba(169,95,50,0.50)_0deg,rgba(212,131,62,0.22)_90deg,transparent_180deg,rgba(169,95,50,0.45)_270deg,rgba(169,95,50,0.50)_360deg)] dark:bg-[conic-gradient(from_0deg_at_50%_50%,rgba(200,164,92,0.55)_0deg,rgba(223,186,107,0.25)_90deg,transparent_180deg,rgba(200,164,92,0.48)_270deg,rgba(200,164,92,0.55)_360deg)] transition-all duration-700" />
        </div>

        {/* Orbiting Radiant Orb 1 (Orbits around top/right & center) */}
        <div className="absolute top-8 left-1/4 w-[360px] sm:w-[500px] xl:w-[600px] h-[360px] sm:h-[500px] xl:h-[600px] rounded-full animate-ambient-orbit-1 blur-[85px] sm:blur-[115px] opacity-80 dark:opacity-75">
          <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_center,rgba(169,95,50,0.58)_0%,rgba(196,110,58,0.28)_45%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(200,164,92,0.65)_0%,rgba(223,186,107,0.35)_45%,transparent_70%)] transition-all duration-700" />
        </div>

        {/* Orbiting Radiant Orb 2 (Orbits around bottom/left & phone chassis) */}
        <div className="absolute bottom-12 right-1/4 w-[340px] sm:w-[460px] xl:w-[550px] h-[340px] sm:h-[460px] xl:h-[550px] rounded-full animate-ambient-orbit-2 blur-[85px] sm:blur-[115px] opacity-75 dark:opacity-70">
          <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_center,rgba(196,110,58,0.50)_0%,rgba(169,95,50,0.22)_50%,transparent_75%)] dark:bg-[radial-gradient(circle_at_center,rgba(223,186,107,0.58)_0%,rgba(200,164,92,0.28)_50%,transparent_75%)] transition-all duration-700" />
        </div>

        {/* Secondary Income emerald highlight for financial ledger depth */}
        <div className="absolute top-2/3 -left-16 w-[300px] sm:w-[420px] h-[300px] sm:h-[420px] rounded-full bg-income/15 dark:bg-income/20 blur-[100px] sm:blur-[130px] transition-all duration-700" />

        {/* Subtle center vignette to maintain 100% crisp text readability */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,transparent_35%,rgba(239,237,232,0.35)_100%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,transparent_35%,rgba(13,15,18,0.55)_100%)] transition-all duration-500" />
      </div>

      {/* =========================================================================
          TOP NAVIGATION BAR (With safe area clearance)
          ========================================================================= */}
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] px-6 sm:px-10 md:px-12 pb-4 md:py-6">
        {/* Brand Logo - Official Logo, Non-clickable */}
        <div className="flex items-center gap-2.5 sm:gap-3 select-none">
          <Logo className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
          <span className="font-display text-xl font-semibold tracking-tight text-text">
            Munshi
          </span>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Light / Dark Theme Switch (Active throughout all viewports) */}
          <button
            type="button"
            onClick={() => {
              setMode(resolved === 'dark' ? 'light' : 'dark');
            }}
            aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface/70 text-text hover:bg-raised transition-all active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Icon
              name={resolved === 'dark' ? 'light_mode' : 'dark_mode'}
              size={18}
              className="text-accent transition-transform duration-300 hover:rotate-12"
            />
          </button>

          {/* GitHub Link (Tablet & Desktop pill) */}
          <a
            href="https://github.com/shreyaass/munshi"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sound.play('click')}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-3.5 py-2 text-xs font-semibold text-text hover:bg-raised transition-colors shadow-sm"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>

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
          HERO & CONTENT SECTION
          Tablet & Mobile (iPad, Surface Pro, iPad Mini): Centered flow matching mockup
          Desktop (xl:): 2-column side-by-side matching desktop mockup
          ========================================================================= */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-between px-6 sm:px-10 md:px-12 pt-4 sm:pt-8 md:pt-10 pb-0 xl:py-14">
        <div className="grid grid-cols-1 xl:grid-cols-12 items-center gap-10 xl:gap-14 w-full">
          {/* Hero Copy (Centered on Tablet/Mobile per mockup, Left-aligned on Desktop) */}
          <div className="flex flex-col items-center text-center space-y-6 sm:space-y-7 xl:items-start xl:text-left xl:col-span-7">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-accent/90 bg-accent/10 px-3.5 py-1 rounded-full border border-accent/20 w-fit">
              <span>&lt;/&gt;</span>
              <span>Open Source · MIT Licensed</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl xl:text-6xl font-medium tracking-tight text-text leading-[1.1] max-w-2xl xl:max-w-none">
              Your money, kept <br className="hidden sm:inline" />
              like a <span className="font-serif italic text-accent font-normal">ledger.</span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-muted">
              Track spending, stay under a monthly limit and fill your goals. Every entry lives in your own Google Sheet.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-row items-center justify-center xl:justify-start gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.play('click');
                  navigate('/connect');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-on-accent shadow-md hover:brightness-105 transition-all active:scale-[0.98]"
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
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface/70 px-6 py-3.5 text-sm font-semibold text-text hover:bg-raised transition-colors active:scale-[0.98] shadow-sm"
              >
                <Icon name="play_arrow" size={17} className="text-accent" />
                <span>Start the tour</span>
              </button>
            </div>

            {/* 3 Core Features (Row layout matching Tablet & Desktop mockups) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-6 md:gap-8 pt-4 w-full max-w-xl sm:max-w-2xl xl:max-w-none text-left">
              <div className="flex items-start gap-3">
                <Icon name="speed" size={20} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <div className="text-text font-semibold text-sm">Monthly limit</div>
                  <p className="text-xs text-muted leading-relaxed">See what is left, every day</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Icon name="water_drop" size={20} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <div className="text-text font-semibold text-sm">Goals that fill up</div>
                  <p className="text-xs text-muted leading-relaxed">Watch the water rise</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Icon name="grid_view" size={20} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <div className="text-text font-semibold text-sm">Your Google Sheet</div>
                  <p className="text-xs text-muted leading-relaxed">Every entry stays yours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Smartphone Chassis Mockup (Centered at bottom on Tablet/Mobile, Right column on Desktop) */}
          <div className="mt-8 sm:mt-10 xl:mt-0 w-full flex justify-center xl:col-span-5 xl:justify-end select-none">
            <div className="relative w-full max-w-[315px] sm:max-w-[340px] md:max-w-[360px] xl:max-w-[340px]">
              {/* Focused Pulsing Glowing Aura Behind Chassis */}
              <div
                className="absolute -inset-4 sm:-inset-6 md:-inset-8 rounded-[52px] bg-gradient-to-tr from-accent/45 via-accent/20 to-transparent blur-2xl md:blur-3xl animate-ambient-pulse pointer-events-none -z-10"
                aria-hidden="true"
              />

              {/* Phone Chassis Frame */}
              <div className="relative w-full rounded-[44px] border-[5px] border-[#D8D4C8] bg-[#FAF8F5] dark:border-[#222731] dark:bg-[#0E1116] p-4 shadow-[0_24px_70px_rgba(169,95,50,0.18),0_10px_30px_rgba(0,0,0,0.06),0_0_50px_rgba(169,95,50,0.12)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(200,164,92,0.22)] transition-all duration-300">
                {/* Phone Speaker Notch */}
                <div className="mx-auto mb-4 h-4 w-28 rounded-full bg-[#E5E0D5] dark:bg-[#181C24] flex items-center justify-center transition-colors">
                  <div className="h-1.5 w-10 rounded-full bg-[#CEC8BA] dark:bg-[#272E3B] transition-colors" />
                </div>

                {/* In-Phone App Mockup Header */}
                <div className="flex items-center justify-between pb-3 px-1">
                  <span className="font-display font-semibold text-lg text-text">Munshi</span>
                  <Icon name="settings" size={18} className="text-muted" />
                </div>

                {/* Monthly Limit Card */}
                <div className="rounded-[18px] border border-expense/30 bg-surface/85 p-3.5 mb-2.5 shadow-sm transition-colors">
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
                  <div className="relative h-1.5 w-full rounded-full bg-raised overflow-hidden">
                    <div className="h-full w-[92%] rounded-full bg-expense" />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-muted mt-2">
                    <span>Spent ₹18,420 · 92%</span>
                    <span className="text-accent font-medium">₹197 a day safe</span>
                  </div>
                </div>

                {/* Saving This Month Card */}
                <div className="rounded-[18px] border border-line bg-surface/85 p-3.5 mb-2.5 shadow-sm transition-colors">
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

                {/* Goals Card */}
                <div className="rounded-[18px] border border-line bg-surface/85 p-3.5 mb-2.5 shadow-sm transition-colors">
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
                    <div className="mt-2 h-1.5 w-full rounded-full bg-line overflow-hidden">
                      <div className="h-full w-[40%] bg-accent rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Transactions (Swiggy & Freelance per Mockup) */}
                <div className="space-y-1.5 mb-2">
                  <div className="rounded-[14px] border border-line/60 bg-surface/60 p-2 flex items-center justify-between text-xs transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-raised text-muted">
                        <Icon name="restaurant" size={12} />
                      </span>
                      <div>
                        <p className="font-medium text-text text-[11px] leading-tight">Swiggy</p>
                        <p className="text-[9px] text-muted leading-tight">Food · Today</p>
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-expense text-xs">- ₹420</span>
                  </div>

                  <div className="rounded-[14px] border border-line/60 bg-surface/60 p-2 flex items-center justify-between text-xs transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-raised text-muted">
                        <Icon name="work" size={12} />
                      </span>
                      <div>
                        <p className="font-medium text-text text-[11px] leading-tight">Freelance</p>
                        <p className="text-[9px] text-muted leading-tight">Income · Yesterday</p>
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-income text-xs">+ ₹6,000</span>
                  </div>
                </div>

                {/* Bottom Phone Nav Bar */}
                <div className="relative mt-2 flex items-center justify-around border-t border-line/60 pt-2 pb-0.5 text-[10px] text-muted">
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
        </div>
      </main>

      {/* =========================================================================
          FOOTER BAR (With safe area bottom inset)
          ========================================================================= */}
      <footer className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 border-t border-line/40 px-6 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] font-sans text-xs text-muted sm:flex-row md:px-12 mt-6">
        <p className="text-center sm:text-left">
          Your entries live in your Google Sheet. Munshi keeps only a local cache.
        </p>
        <p className="text-center sm:text-right">
          MIT License · <a href="https://github.com/shreyaass/munshi" target="_blank" rel="noopener noreferrer" className="hover:text-text underline">github.com/shreyaass/munshi</a>
        </p>
      </footer>
    </div>
  );
}
