import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from '../components/Icon';
import { sound } from '../lib/sound';

interface Step {
  stepNum: string;
  badge: string;
  title: string;
  body: string;
  icon: IconName;
  tip?: string;
}

const STEPS: Step[] = [
  {
    stepNum: '01',
    badge: 'PRIVATE TEMPLATE',
    title: 'Copy the Sheet to Drive',
    body: 'Make a personal copy of the Munshi template directly to your Google Drive. You own every formula and row. Zero company servers in between.',
    icon: 'description',
    tip: 'Your financial data never leaves your personal Google account.',
  },
  {
    stepNum: '02',
    badge: 'NATIVE APPS SCRIPT',
    title: 'Open Extensions & Code',
    body: 'Inside your sheet copy, navigate to Extensions → Apps Script. The synchronization API code is already bundled inside your spreadsheet.',
    icon: 'code',
    tip: 'No external code or package installs needed.',
  },
  {
    stepNum: '03',
    badge: '1-CLICK API DEPLOY',
    title: 'Deploy Private Web App',
    body: 'Click Deploy → New deployment → Web app. Set "Execute as: Me" and "Who has access: Anyone". Authorize with your Google account.',
    icon: 'rocket_launch',
    tip: 'This creates your direct peer-to-sheet encrypted gateway.',
  },
  {
    stepNum: '04',
    badge: 'ENCRYPTED HANDSHAKE',
    title: 'Copy URL & Access Token',
    body: 'In your spreadsheet menu, open Munshi → Show Connection Info. Copy the Web App URL and your private 256-bit token.',
    icon: 'key',
    tip: 'Keep your secret token secure — only your devices need it.',
  },
  {
    stepNum: '05',
    badge: 'READY TO TRACK',
    title: 'Connect & Experience Munshi',
    body: 'Paste the URL and token into the connect screen. Munshi verifies sheet schemas and unlocks your offline-first private bahi khata.',
    icon: 'check_circle',
    tip: 'Works seamlessly offline with instant local cache.',
  },
];

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
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between px-5 py-6 md:py-10 max-w-lg mx-auto">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs uppercase tracking-[0.14em] font-mono text-muted hover:text-text transition-colors py-1.5 px-3 rounded-lg hover:bg-raised"
        >
          Skip Tour
        </button>

        {/* Step Progress Dots */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Tour progress">
          {STEPS.map((s, i) => (
            <button
              key={s.stepNum}
              type="button"
              onClick={() => {
                sound.play('click');
                setIndex(i);
              }}
              aria-label={`Go to step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-8 bg-accent shadow-[0_0_10px_rgba(200,164,92,0.4)]' : 'w-2 bg-line hover:bg-muted/40'
              }`}
            />
          ))}
        </div>

        <span className="font-mono text-xs tracking-wider text-muted">
          {step.stepNum}<span className="text-line">/</span>05
        </span>
      </header>

      {/* Main Editorial Card */}
      <main className="flex-1 flex flex-col items-center justify-center py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.stepNum}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex flex-col items-center text-center"
          >
            {/* Step Category Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent font-mono text-[11px] font-semibold tracking-[0.15em] uppercase mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>{step.badge}</span>
            </div>

            {/* Glowing Icon Frame */}
            <div className="relative mb-7">
              <div className="w-24 h-24 rounded-3xl bg-surface border border-accent/40 flex items-center justify-center shadow-[0_20px_45px_rgba(0,0,0,0.5),0_0_30px_rgba(200,164,92,0.18)]">
                <Icon name={step.icon} size={42} className="text-accent" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-raised border border-line flex items-center justify-center font-mono text-[10px] font-bold text-accent">
                {step.stepNum}
              </div>
            </div>

            {/* Typography */}
            <h1 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-text mb-3 px-2">
              {step.title}
            </h1>

            <p className="text-sm md:text-base text-muted leading-relaxed max-w-sm mb-6 px-3">
              {step.body}
            </p>

            {/* Micro Tip Card */}
            {step.tip && (
              <div className="w-full max-w-xs px-3.5 py-2.5 rounded-xl border border-line bg-raised/70 flex items-center gap-2.5 text-left">
                <Icon name="info" size={16} className="text-accent shrink-0" />
                <span className="text-[11px] text-muted leading-tight font-sans">
                  {step.tip}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Actions */}
      <footer className="space-y-3 pt-4">
        <button
          type="button"
          onClick={handleNext}
          className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-on-accent transition hover:brightness-105 active:scale-[0.99] shadow-md flex items-center justify-center gap-2"
        >
          <span>{isLast ? 'Begin Connection' : 'Continue'}</span>
          <Icon name="arrow_forward" size={16} />
        </button>

        {index > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="w-full py-2.5 text-xs uppercase tracking-[0.12em] font-mono font-medium text-muted hover:text-text transition-colors flex items-center justify-center gap-1.5"
          >
            <Icon name="arrow_back" size={14} />
            <span>Previous Step</span>
          </button>
        ) : (
          <div className="h-9" />
        )}
      </footer>
    </div>
  );
}
