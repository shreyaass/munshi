import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../components/Icon';
import { sound } from '../lib/sound';

interface StepData {
  stepNum: number;
  sidebarTitle: string;
  badge: string;
  heading: string;
  subtext: string;
  badges: { label: string; url?: string; isExternal?: boolean }[];
  iconType: 'sheet' | 'code' | 'rocket' | 'key' | 'check';
}

const STEPS: StepData[] = [
  {
    stepNum: 1,
    sidebarTitle: 'Copy the template',
    badge: 'STEP 1 OF 5',
    heading: 'Copy the template',
    subtext:
      'Make a copy of the official Munshi spreadsheet directly into your Google Drive, or download the offline Excel template. That copy is 100% yours — zero company servers ever see your numbers.',
    badges: [
      {
        label: 'Make a Copy in Google Drive ↗',
        url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/copy',
        isExternal: true,
      },
      {
        label: 'Download Excel Template (.xlsx) ↗',
        url: 'https://github.com/shreyaass/munshi/raw/main/sheet/ExpenseManager-template.xlsx',
        isExternal: true,
      },
      {
        label: 'GitHub Repo ↗',
        url: 'https://github.com/shreyaass/munshi',
        isExternal: true,
      },
    ],
    iconType: 'sheet',
  },
  {
    stepNum: 2,
    sidebarTitle: 'Open the script',
    badge: 'STEP 2 OF 5',
    heading: 'Open the script',
    subtext:
      'Inside your sheet: navigate to Extensions → Apps Script. The synchronization code is already bundled directly inside your copy, or inspect the source on GitHub.',
    badges: [
      { label: 'Extensions › Apps Script' },
      {
        label: 'View AppsScript.gs on GitHub ↗',
        url: 'https://github.com/shreyaass/munshi/blob/main/sheet/AppsScript.gs',
        isExternal: true,
      },
    ],
    iconType: 'code',
  },
  {
    stepNum: 3,
    sidebarTitle: 'Deploy it',
    badge: 'STEP 3 OF 5',
    heading: 'Deploy it',
    subtext:
      'Click Deploy → New deployment → Web app. Set "Execute as: Me" and "Who has access: Anyone". Then Authorize with your personal Google account.',
    badges: [
      { label: 'Deploy › New deployment › Web app' },
      { label: 'Execute as: Me' },
      { label: 'Access: Anyone' },
    ],
    iconType: 'rocket',
  },
  {
    stepNum: 4,
    sidebarTitle: 'Copy two values',
    badge: 'STEP 4 OF 5',
    heading: 'Copy two values',
    subtext:
      'Back in the sheet, open the menu Munshi (or Expense Tracker) → Show connection info. Copy your unique Web App URL and 256-bit access token.',
    badges: [
      { label: 'Munshi › Show connection info' },
      { label: 'Web App URL' },
      { label: 'Token' },
    ],
    iconType: 'key',
  },
  {
    stepNum: 5,
    sidebarTitle: 'Paste and go',
    badge: 'STEP 5 OF 5',
    heading: 'Paste and go',
    subtext:
      'Paste both into the connect screen. The app verifies the sheet schemas and opens your offline-first private bahi khata.',
    badges: [
      { label: 'Web App URL' },
      { label: 'Token' },
    ],
    iconType: 'check',
  },
];

function StepSquircleIcon({ type }: { type: StepData['iconType'] }) {
  return (
    <div className="relative flex h-36 w-36 items-center justify-center rounded-[32px] border border-line bg-surface/90 shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_30px_rgba(200,164,92,0.14)] md:h-44 md:w-44">
      <svg width="78" height="78" viewBox="0 0 100 100" fill="none" className="text-accent">
        {/* Outer Arch Dome Silhouette */}
        <path
          d="M26 80V45C26 33 36 26 43 22C46 20 48 18 50 12C52 18 54 20 57 22C64 26 74 33 74 45V80"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="opacity-35"
        />

        {/* Dynamic Center Vector Glyphs */}
        {type === 'sheet' && (
          <g transform="translate(13, 10)">
            <rect x="25" y="24" width="26" height="34" rx="4" stroke="currentColor" strokeWidth="3" />
            <line x1="25" y1="35" x2="51" y2="35" stroke="currentColor" strokeWidth="2.5" />
            <line x1="38" y1="24" x2="38" y2="58" stroke="currentColor" strokeWidth="2.5" />
            <line x1="25" y1="46" x2="51" y2="46" stroke="currentColor" strokeWidth="2.5" />
          </g>
        )}

        {type === 'code' && (
          <g transform="translate(0, 5)">
            <path d="M38 42L28 50L38 58" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M62 42L72 50L62 58" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="53" y1="38" x2="47" y2="62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {type === 'rocket' && (
          <g transform="translate(0, 4)">
            <path
              d="M50 30C43 36 41 47 43 57L50 63L57 57C59 47 57 36 50 30Z"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="44" r="3.5" fill="currentColor" />
            <path d="M41 53L34 57L37 63L44 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M59 53L66 57L63 63L56 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M47 66L50 71L53 66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {type === 'key' && (
          <g transform="translate(0, 4)">
            <circle cx="42" cy="56" r="10" stroke="currentColor" strokeWidth="3.5" />
            <line x1="49" y1="49" x2="67" y2="31" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="62" y1="36" x2="66" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="67" y1="31" x2="71" y2="35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {type === 'check' && (
          <g transform="translate(0, 4)">
            <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="3.5" />
            <path d="M43 50L48 55L58 45" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>
    </div>
  );
}

export function Tour() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  function handleNext() {
    sound.play('click');
    if (isLast) {
      navigate('/connect');
    } else {
      setIndex((prev) => prev + 1);
    }
  }

  function handleBack() {
    sound.play('click');
    if (index > 0) {
      setIndex((prev) => prev - 1);
    }
  }

  function handleSkip() {
    sound.play('click');
    navigate('/connect');
  }

  return (
    <div className="flex min-h-dvh w-full overflow-hidden bg-bg text-text">
      {/* =========================================================================
          DESKTOP / TABLET SIDEBAR (Matches Mockup)
          ========================================================================= */}
      <aside className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col justify-between border-r border-line bg-surface/40 p-8 select-none">
        <div>
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 pb-10 select-none">
            <img src="./icons/logo.svg" alt="Munshi" className="h-9 w-9 rounded-xl shadow-sm" />
            <span className="font-display text-xl font-semibold tracking-tight text-text">
              Munshi
            </span>
          </div>

          {/* Section Heading */}
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent/80 pb-6">
            Connect your sheet
          </p>

          {/* Stepper Vertical List */}
          <nav className="space-y-4" aria-label="Tour steps">
            {STEPS.map((s, i) => {
              const isCurrent = i === index;
              const isPast = i < index;
              return (
                <button
                  key={s.stepNum}
                  type="button"
                  onClick={() => {
                    sound.play('click');
                    setIndex(i);
                  }}
                  className="flex w-full items-center gap-3.5 text-left transition group outline-none"
                >
                  {/* Step Status Indicator Ring / Checkmark */}
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono font-bold transition-all duration-200 ${
                      isPast
                        ? 'bg-accent text-on-accent'
                        : isCurrent
                          ? 'border-2 border-accent text-accent bg-accent/15'
                          : 'border border-line text-muted group-hover:border-muted'
                    }`}
                  >
                    {isPast ? (
                      <Icon name="check" size={14} className="stroke-[3]" />
                    ) : (
                      s.stepNum
                    )}
                  </span>

                  {/* Step Label */}
                  <span
                    className={`text-sm transition-colors duration-200 ${
                      isCurrent
                        ? 'font-medium text-text'
                        : isPast
                          ? 'text-text/80'
                          : 'text-muted group-hover:text-text'
                    }`}
                  >
                    {s.sidebarTitle}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Time Note */}
        <p className="font-sans text-xs text-muted">
          Takes about two minutes.
        </p>
      </aside>

      {/* =========================================================================
          MAIN CONTENT AREA (Responsive Desktop, Tablet & Mobile)
          ========================================================================= */}
      <div className="flex flex-1 flex-col justify-between p-6 md:p-10 lg:p-14">
        {/* Top Header: Step Counter & Skip */}
        <header className="flex items-center justify-between pb-4">
          {/* Mobile-only Skip button */}
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs uppercase tracking-[0.14em] font-mono text-muted hover:text-text transition-colors md:hidden"
          >
            Skip
          </button>

          {/* Mobile-only Progress Pills */}
          <div className="flex items-center gap-1.5 md:hidden">
            {STEPS.map((s, i) => (
              <span
                key={s.stepNum}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === index ? 'w-7 bg-accent' : 'w-2 bg-line'
                }`}
              />
            ))}
          </div>

          {/* Desktop Right Header: Step Counter & Skip */}
          <div className="hidden md:flex ml-auto items-center gap-6">
            <span className="font-mono text-xs tracking-wider text-muted">
              {index + 1} / 5
            </span>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs uppercase tracking-[0.12em] font-mono text-muted hover:text-text transition-colors"
            >
              Skip the tour
            </button>
          </div>

          {/* Mobile Step Counter on Right */}
          <span className="font-mono text-xs text-muted md:hidden">
            {index + 1}/5
          </span>
        </header>

        {/* Center Stage Card Content */}
        <main className="flex flex-1 flex-col items-center justify-center text-center my-auto py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.stepNum}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="flex w-full max-w-xl flex-col items-center"
            >
              {/* Center Squircle Icon */}
              <StepSquircleIcon type={step.iconType} />

              {/* Step Sub-label */}
              <p className="mt-8 mb-2 font-mono text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                {step.badge}
              </p>

              {/* Title */}
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-text">
                {step.heading}
              </h1>

              {/* Explanatory Body */}
              <p className="mt-4 max-w-md text-sm md:text-base leading-relaxed text-muted">
                {step.subtext}
              </p>

              {/* Action Badges / Direct Links */}
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                {step.badges.map((b) =>
                  b.url ? (
                    <a
                      key={b.label}
                      href={b.url}
                      target={b.isExternal ? '_blank' : undefined}
                      rel={b.isExternal ? 'noopener noreferrer' : undefined}
                      onClick={() => sound.play('click')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-4 py-2 font-mono text-xs text-text shadow-sm hover:border-accent/60 hover:text-accent transition-colors"
                    >
                      <span>{b.label}</span>
                    </a>
                  ) : (
                    <span
                      key={b.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-4 py-2 font-mono text-xs text-muted"
                    >
                      <span>{b.label}</span>
                    </span>
                  ),
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Actions Bar */}
        <footer className="flex items-center justify-between pt-6">
          {index > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-raised/60 px-6 py-3 text-xs md:text-sm font-semibold text-text hover:bg-line transition-all active:scale-[0.99]"
            >
              <Icon name="arrow_back" size={15} />
              <span>Back</span>
            </button>
          ) : (
            <div className="w-20" />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-xs md:text-sm font-semibold text-on-accent shadow-md hover:brightness-105 transition-all active:scale-[0.99]"
          >
            <span>{isLast ? 'Connect now' : 'Next'}</span>
            <Icon name="arrow_forward" size={15} />
          </button>
        </footer>
      </div>
    </div>
  );
}
