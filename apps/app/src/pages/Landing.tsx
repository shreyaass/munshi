import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { FluidWaterLayer } from '../components/GoalCard';
import { Icon, type IconName } from '../components/Icon';
import { Logo } from '../components/Logo';
import { sound } from '../lib/sound';
import { useTheme } from '../lib/theme';

const CAPABILITIES: { num: string; title: string; desc: string; icon: IconName }[] = [
  {
    num: '01',
    title: 'Monthly limits & daily quotas',
    desc: 'Set a monthly spending ceiling and let Munshi calculate your safe daily spend automatically before you overshoot.',
    icon: 'speed',
  },
  {
    num: '02',
    title: 'Goals that fill up',
    desc: 'Savings goals with animated rising-water levels, deadlines, priority order, and optional linked savings accounts.',
    icon: 'savings',
  },
  {
    num: '03',
    title: 'Multiple accounts, true balances',
    desc: 'Track Bank, Cash, UPI, Credit Cards, and Wallets together. Transfers between your own accounts never count as spending.',
    icon: 'account_balance_wallet',
  },
  {
    num: '04',
    title: 'Quick logging & smart history',
    desc: 'Log income or expenses in seconds with pinned categories, payees, tags, custom dates, instant filters, and CSV export.',
    icon: 'bolt',
  },
  {
    num: '05',
    title: 'Offline-first across devices',
    desc: 'Works seamlessly on Android APK, Phone PWA, and Desktop browsers. Entries save locally right away and sync when online.',
    icon: 'devices',
  },
  {
    num: '06',
    title: 'Kaala Bahi Dark & Light',
    desc: 'Handcrafted Obsidian Brass and Warm Copper themes paired with crisp typography and subtle tactile feedback.',
    icon: 'contrast',
  },
];

const PRIVACY_RULES: { label: string; title: string; desc: string; icon: IconName }[] = [
  {
    label: 'ARCHITECTURE',
    title: 'Zero Munshi servers or accounts',
    desc: 'There is no Munshi login, cloud database, or analytics pixel. Everything runs on your device and talks directly to your spreadsheet.',
    icon: 'dns',
  },
  {
    label: 'DRIVE SCOPE',
    title: 'Access restricted to one spreadsheet',
    desc: 'Our Apps Script manifest uses spreadsheets.currentonly and @OnlyCurrentDoc — it cannot view or open any other file in your Google Drive.',
    icon: 'lock',
  },
  {
    label: 'AUTHENTICATION',
    title: 'Protected by your 256-bit token',
    desc: 'Every sync request must carry your personal Access Token stored in Google ScriptProperties. Rotate it anytime from the sheet menu.',
    icon: 'key',
  },
  {
    label: 'OWNERSHIP',
    title: 'Plain rows, zero lock-in',
    desc: 'Open your Google Sheet directly, filter transactions, build your own charts, or export to Excel/CSV whenever you wish.',
    icon: 'table_chart',
  },
];

const SETUP_STEPS_PREVIEW: { num: string; title: string; detail: string }[] = [
  { num: '1', title: 'Download & save as Sheet', detail: 'Template .xlsx → File → Save as Google Sheets' },
  { num: '2', title: 'Add 3 script files', detail: 'Code.gs, ConnectionInfo.html, appsscript.json' },
  { num: '3', title: 'Run Setup once', detail: 'Munshi → 1. Setup / repair sheet' },
  { num: '4', title: 'Deploy /exec Web App', detail: 'Copy /exec URL & Access Token' },
  { num: '5', title: 'Paste & start tracking', detail: 'Syncs Android, Web & PWA' },
];

const PREVIEW_ACCOUNTS: { name: string; amount: string; toneClass: string }[] = [
  { name: 'HDFC · Salary', amount: '₹1,18,400', toneClass: 'text-income font-semibold' },
  { name: 'UPI · Everyday', amount: '₹14,250', toneClass: 'text-text font-semibold' },
  { name: 'Cash Wallet', amount: '₹3,800', toneClass: 'text-text font-semibold' },
];

function LiveLedgerPreview() {
  const [cycle, setCycle] = useState(0);
  const [filled, setFilled] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFilled(false);
      window.setTimeout(() => {
        setCycle((c) => c + 1);
        setFilled(true);
      }, 220);
    }, 6200);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <figure className="rounded-3xl border border-line/80 bg-surface/80 backdrop-blur-md p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Monthly Limit Card with Animated Fill */}
        <div className="lg:col-span-5 rounded-2xl border border-line bg-bg/70 p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Monthly Limit</span>
            <span className="font-mono text-[11px] text-accent font-semibold bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full">
              ₹1,420 / day safe
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-text">₹24,850</span>
              <span className="text-xs text-muted">left of ₹45,000</span>
            </div>
            <div className="mt-3 h-2.5 w-full rounded-full bg-raised overflow-hidden">
              <motion.div
                key={`limit-${cycle}`}
                initial={{ width: '0%' }}
                animate={{ width: filled ? '45%' : '0%' }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-accent shadow-[0_0_12px_rgba(200,164,92,0.45)]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted border-t border-line/60 pt-3 font-mono">
            <span>Spent: ₹20,150</span>
            <span className="text-income">On track</span>
          </div>
        </div>

        {/* Accounts (One-by-One Stagger) & Goals (Moving SVG Waves) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-line bg-bg/70 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Accounts</span>
              <Icon name="account_balance_wallet" size={16} className="text-accent" />
            </div>
            <div key={`accounts-${cycle}`} className="space-y-2 text-xs font-mono">
              {PREVIEW_ACCOUNTS.map((acc, i) => (
                <motion.div
                  key={acc.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: filled ? 1 : 0, x: filled ? 0 : -8 }}
                  transition={{ duration: 0.35, delay: filled ? 0.25 + i * 0.35 : 0, ease: 'easeOut' }}
                  className="flex justify-between"
                >
                  <span className="text-text font-sans">{acc.name}</span>
                  <span className={acc.toneClass}>{acc.amount}</span>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: filled ? 1 : 0, y: filled ? 0 : 4 }}
                transition={{ duration: 0.35, delay: filled ? 1.35 : 0, ease: 'easeOut' }}
                className="flex justify-between border-t border-line/60 pt-2"
              >
                <span className="text-muted font-sans">Total Liquid</span>
                <span className="text-accent font-bold">₹1,36,450</span>
              </motion.div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-bg/70 p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Savings Goals</span>
              <Icon name="savings" size={16} className="text-accent" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-[96px]">
              <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-3 flex flex-col justify-between">
                <span className="text-xs font-medium text-text relative z-10">Goa Trip</span>
                <span className="font-mono text-sm font-bold text-accent relative z-10">68%</span>
                <FluidWaterLayer percent={filled ? 68 : 22} minHeight={22} tone="accent" />
              </div>
              <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-3 flex flex-col justify-between">
                <span className="text-xs font-medium text-text relative z-10">Emergency</span>
                <span className="font-mono text-sm font-bold text-income relative z-10">40%</span>
                <FluidWaterLayer percent={filled ? 40 : 16} minHeight={16} tone="income" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-xs font-mono text-muted flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/50">
        <span>Monthly limits, multiple accounts, and rising-water goals calculated locally.</span>
        <span className="text-accent">Integer paise precision</span>
      </figcaption>
    </figure>
  );
}

function GetStartedCoinButton({
  onNavigate,
  className,
  label = 'Get started',
  coinSize = 20,
}: {
  onNavigate: () => void;
  className: string;
  label?: string;
  coinSize?: number;
}) {
  const [flipCount, setFlipCount] = useState(1);
  const [isTossing, setIsTossing] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = () => {
    if (isTossing) return;
    sound.play('click');

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onNavigate();
      return;
    }

    setIsTossing(true);
    timerRef.current = window.setTimeout(() => {
      onNavigate();
    }, 480);
  };

  return (
    <button
      type="button"
      onMouseEnter={() => {
        if (!isTossing) setFlipCount((c) => c + 1);
      }}
      onClick={handleClick}
      className={className}
    >
      <span>{label}</span>
      <span
        className="inline-flex items-center justify-center shrink-0"
        style={{ perspective: '420px' }}
        aria-hidden="true"
      >
        <motion.svg
          width={coinSize}
          height={coinSize}
          viewBox="0 0 24 24"
          fill="none"
          initial={{ rotateY: 0, scale: 0.9 }}
          animate={{
            rotateY: isTossing ? flipCount * 360 + 720 : flipCount * 360,
            y: isTossing ? [0, -7, 0] : 0,
            scale: isTossing ? [1, 1.22, 1] : [0.92, 1.1, 1],
          }}
          transition={{
            duration: isTossing ? 0.48 : 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <circle
            cx="12"
            cy="12"
            r="10.2"
            fill="currentColor"
            fillOpacity="0.16"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <circle
            cx="12"
            cy="12"
            r="7.6"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeDasharray="2 1.8"
            opacity="0.65"
          />
          <path
            d="M8.8 8.3H15.2M8.8 11H15.2M12 8.3C13.4 8.3 14.1 9.2 14.1 10.2C14.1 11.5 13 12.4 11.2 12.4H9.6L13.9 16.7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </span>
    </button>
  );
}

function SetupGuideButton({ className }: { className: string }) {
  const [animKey, setAnimKey] = useState(0);

  return (
    <a
      href="https://github.com/shreyaass/munshi#readme"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setAnimKey((k) => k + 1)}
      onClick={() => {
        setAnimKey((k) => k + 1);
        sound.play('click');
      }}
      className={className}
    >
      <motion.svg
        key={animKey}
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        className="text-accent shrink-0"
        aria-hidden="true"
      >
        <motion.path
          d="M2 6.5C2 5.4 2.9 4.5 4 4.5H9.5C10.9 4.5 12 5.6 12 7V19.5C12 18.7 11.3 18 10.5 18H4C2.9 18 2 17.1 2 16V6.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          initial={{ pathLength: 0.2, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
        <motion.path
          d="M22 6.5C22 5.4 21.1 4.5 20 4.5H14.5C13.1 4.5 12 5.6 12 7V19.5C12 18.7 12.7 18 13.5 18H20C21.1 18 22 17.1 22 16V6.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          initial={{ pathLength: 0.2, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
        />
      </motion.svg>
      <span>Setup Guide (GitHub)</span>
      <span className="text-[11px] opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
        ↗
      </span>
    </a>
  );
}

function HowItWorksButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className: string;
}) {
  const [drawCount, setDrawCount] = useState(0);

  return (
    <button
      type="button"
      onMouseEnter={() => setDrawCount((c) => c + 1)}
      onClick={() => {
        setDrawCount((c) => c + 1);
        onClick();
      }}
      className={className}
    >
      <span>How it works</span>
      <motion.svg
        key={drawCount}
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        className="text-accent shrink-0"
        aria-hidden="true"
      >
        <motion.path
          d="M9.1 8.4C9.1 6.5 10.5 5.2 12.3 5.2C14.1 5.2 15.4 6.4 15.4 8C15.4 9.5 14.3 10.3 13 11.1C12.2 11.6 11.9 12.3 11.9 13.6V14.3"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.2 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.52, ease: 'easeOut' }}
        />
        <motion.circle
          cx="12"
          cy="18.3"
          r="1.4"
          fill="currentColor"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22, delay: 0.45, ease: 'backOut' }}
        />
      </motion.svg>
    </button>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const { resolved, setMode } = useTheme();
  const isNative = Capacitor.isNativePlatform();

  // Sticky Scroll-to-Top State (Visible only after scrolling)
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 250);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Native Video Player State (Web/Desktop only)
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      void videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !videoRef.current.muted;
    videoRef.current.muted = next;
    setIsMuted(next);
    if (!next && videoRef.current.paused) {
      void videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      void containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const scrollToSection = (id: string) => {
    sound.play('click');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative min-h-screen bg-bg text-text flex flex-col justify-between selection:bg-accent/20 overflow-x-hidden transition-colors duration-300">
      {/* =========================================================================
          DYNAMIC MOVING GLOWING GRADIENTS
          Dark Mode: Luminous Gold / Brass (#C8A45C, #DFBA6B)
          Light Mode: Luminous Warm Copper (#A95F32, #C46E3A)
          ========================================================================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 select-none" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[950px] xl:w-[1300px] h-[650px] sm:h-[950px] xl:h-[1300px] rounded-full animate-ambient-spin opacity-65 dark:opacity-55 blur-[90px] sm:blur-[130px]">
          <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg_at_50%_50%,rgba(169,95,50,0.48)_0deg,rgba(212,131,62,0.20)_90deg,transparent_180deg,rgba(169,95,50,0.42)_270deg,rgba(169,95,50,0.48)_360deg)] dark:bg-[conic-gradient(from_0deg_at_50%_50%,rgba(200,164,92,0.50)_0deg,rgba(223,186,107,0.22)_90deg,transparent_180deg,rgba(200,164,92,0.44)_270deg,rgba(200,164,92,0.50)_360deg)] transition-all duration-700" />
        </div>

        <div className="absolute top-8 left-1/4 w-[360px] sm:w-[500px] xl:w-[600px] h-[360px] sm:h-[500px] xl:h-[600px] rounded-full animate-ambient-orbit-1 blur-[85px] sm:blur-[115px] opacity-75 dark:opacity-70">
          <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_center,rgba(169,95,50,0.55)_0%,rgba(196,110,58,0.24)_45%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(200,164,92,0.60)_0%,rgba(223,186,107,0.30)_45%,transparent_70%)] transition-all duration-700" />
        </div>

        <div className="absolute bottom-12 right-1/4 w-[340px] sm:w-[460px] xl:w-[550px] h-[340px] sm:h-[460px] xl:h-[550px] rounded-full animate-ambient-orbit-2 blur-[85px] sm:blur-[115px] opacity-70 dark:opacity-65">
          <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_center,rgba(196,110,58,0.48)_0%,rgba(169,95,50,0.20)_50%,transparent_75%)] dark:bg-[radial-gradient(circle_at_center,rgba(223,186,107,0.54)_0%,rgba(200,164,92,0.24)_50%,transparent_75%)] transition-all duration-700" />
        </div>

        <div className="absolute top-2/3 -left-16 w-[300px] sm:w-[420px] h-[300px] sm:h-[420px] rounded-full bg-income/12 dark:bg-income/18 blur-[100px] sm:blur-[130px] transition-all duration-700" />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,transparent_35%,rgba(239,237,232,0.35)_100%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,transparent_35%,rgba(13,15,18,0.55)_100%)] transition-all duration-500" />
      </div>

      {/* =========================================================================
          TOP NAVIGATION BAR (Clean: Logo + Theme Switch & GitHub only)
          ========================================================================= */}
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] px-6 sm:px-10 md:px-12 pb-4 md:py-6">
        <div className="flex items-center gap-2.5 sm:gap-3 select-none">
          <Logo className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
          <span className="font-display text-xl font-semibold tracking-tight text-text">
            Munshi
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
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

          <a
            href="https://github.com/shreyaass/munshi"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sound.play('click')}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface/70 px-3.5 text-xs font-semibold text-text hover:bg-raised transition-colors shadow-sm"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col px-6 sm:px-10 md:px-12">
        {/* =========================================================================
            HERO SECTION
            ========================================================================= */}
        <section className="pt-2 sm:pt-4 pb-10 md:pb-16">
          <div className="grid grid-cols-1 xl:grid-cols-12 items-center gap-10 xl:gap-14 w-full">
            {/* Hero Copy */}
            <div className="flex flex-col items-center text-center space-y-5 sm:space-y-6 xl:items-start xl:text-left xl:col-span-6">
              <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-accent/90 bg-accent/10 px-3.5 py-1 rounded-full border border-accent/20 w-fit">
                <span>&lt;/&gt;</span>
                <span>Open Source · MIT Licensed</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-text leading-[1.08] max-w-2xl xl:max-w-none">
                Your money, kept <br className="hidden sm:inline" />
                like a <span className="font-serif italic text-accent font-normal">ledger.</span>
              </h1>

              <p className="font-serif italic text-lg sm:text-xl text-accent font-medium leading-relaxed">
                Built for privacy — Your ledger. Your data. Your rules.
              </p>

              {/* Clear, concise summary of what Munshi does */}
              <p className="text-sm sm:text-base text-muted leading-relaxed max-w-xl">
                A privacy-first personal finance app to track income, expenses &amp; transfers across all your accounts — stored straight inside your own Google Sheet.
              </p>

              {/* Scannable Highlights */}
              <ul className="space-y-2.5 text-sm text-muted max-w-xl text-left">
                <li className="flex items-start gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2 shrink-0 select-none" />
                  <span>
                    <strong className="text-text font-medium">Multi-account ledger</strong> — Bank, Cash, UPI, Cards &amp; Wallets with true net balances.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2 shrink-0 select-none" />
                  <span>
                    <strong className="text-text font-medium">Limits &amp; saving goals</strong> — Monthly spending caps, daily safe quotas &amp; rising-water targets.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2 shrink-0 select-none" />
                  <span>
                    <strong className="text-text font-medium">Zero lock-in sync</strong> — Works offline on Android APK, Web &amp; PWA; syncs direct to your sheet.
                  </span>
                </li>
              </ul>

              {/* Desktop Primary CTA */}
              <div className="hidden xl:flex flex-col items-start gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <GetStartedCoinButton
                    onNavigate={() => navigate('/tour')}
                    coinSize={22}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-accent px-8 py-4 text-base font-semibold text-on-accent shadow-xl shadow-accent/30 hover:brightness-105 hover:scale-[1.02] transition-all active:scale-[0.98] group cursor-pointer"
                  />

                  <HowItWorksButton
                    onClick={() => scrollToSection('how')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface/70 px-6 py-4 text-sm font-semibold text-text hover:bg-raised hover:border-accent/50 transition-all cursor-pointer"
                  />
                </div>

                <p className="text-xs text-muted pt-0.5">
                  No sign-ups, no logins — just a quick 5-minute guided tour and you&apos;re ready to go.
                </p>
              </div>

              {/* 3 Core Architectural Pillars */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 pt-3 w-full max-w-xl sm:max-w-2xl xl:max-w-none">
                <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-1.5 sm:gap-2.5 p-2 sm:p-0 rounded-2xl border border-line/60 bg-surface/50 backdrop-blur-sm sm:border-0 sm:bg-transparent">
                  <Icon name="devices" size={20} className="text-accent shrink-0 sm:mt-0.5" />
                  <div>
                    <div className="text-text font-semibold text-[11px] sm:text-sm leading-tight whitespace-nowrap">100% Client-side</div>
                    <p className="hidden sm:block text-xs text-muted leading-relaxed mt-0.5 whitespace-nowrap">Zero central servers</p>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-1.5 sm:gap-2.5 p-2 sm:p-0 rounded-2xl border border-line/60 bg-surface/50 backdrop-blur-sm sm:border-0 sm:bg-transparent">
                  <Icon name="shield" size={20} className="text-accent shrink-0 sm:mt-0.5" />
                  <div>
                    <div className="text-text font-semibold text-[11px] sm:text-sm leading-tight whitespace-nowrap">Zero tracking</div>
                    <p className="hidden sm:block text-xs text-muted leading-relaxed mt-0.5 whitespace-nowrap">Your data in your hands</p>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-1.5 sm:gap-2.5 p-2 sm:p-0 rounded-2xl border border-line/60 bg-surface/50 backdrop-blur-sm sm:border-0 sm:bg-transparent">
                  <Icon name="grid_view" size={20} className="text-accent shrink-0 sm:mt-0.5" />
                  <div>
                    <div className="text-text font-semibold text-[11px] sm:text-sm leading-tight whitespace-nowrap">Your Google Sheet</div>
                    <p className="hidden sm:block text-xs text-muted leading-relaxed mt-0.5 whitespace-nowrap">Every entry stays yours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Video Player on Web, Zero-Bloat Bahi Khata Glance on Native APK */}
            <div className="w-full max-w-3xl xl:max-w-none xl:col-span-6 mx-auto flex flex-col items-center">
              <div className="relative w-full">
                <div
                  className="pointer-events-none absolute -inset-4 rounded-[36px] bg-gradient-to-tr from-accent/25 via-transparent to-accent/15 blur-2xl opacity-75 dark:opacity-90 -z-10"
                  aria-hidden="true"
                />

                {isNative ? (
                  <div className="relative w-full rounded-2xl md:rounded-3xl border border-line/80 bg-surface/95 backdrop-blur-xl p-5 sm:p-6 shadow-[0_24px_70px_rgba(169,95,50,0.16)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.75)] transition-all duration-300 space-y-5">
                    <div className="flex items-center justify-between border-b border-line/60 pb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-income shadow-[0_0_8px_var(--income)] animate-pulse" />
                        <span className="font-mono text-[11px] font-semibold tracking-wider text-text uppercase">
                          Offline-First · Direct Sync
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full font-semibold">
                        ZERO DATA BLOAT
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-muted">Monthly Limit</span>
                        <span className="font-mono text-xs text-accent font-semibold">₹1,420 / day safe</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-2xl sm:text-3xl font-bold text-text">₹24,850</span>
                        <span className="font-sans text-xs text-muted">left of ₹45,000</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-raised overflow-hidden">
                        <div className="h-full w-[45%] rounded-full bg-accent transition-all duration-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="relative overflow-hidden rounded-xl border border-line/80 bg-raised/70 p-3.5 min-h-[82px]">
                        <div className="flex items-center justify-between text-xs font-medium text-text relative z-10">
                          <span>Goa Trip</span>
                          <span className="font-mono text-accent">68%</span>
                        </div>
                        <p className="font-mono text-[11px] text-muted mt-1 relative z-10">₹34,000 / ₹50,000</p>
                        <FluidWaterLayer percent={68} minHeight={24} tone="accent" />
                      </div>

                      <div className="relative overflow-hidden rounded-xl border border-line/80 bg-raised/70 p-3.5 min-h-[82px]">
                        <div className="flex items-center justify-between text-xs font-medium text-text relative z-10">
                          <span>Emergency</span>
                          <span className="font-mono text-income">40%</span>
                        </div>
                        <p className="font-mono text-[11px] text-muted mt-1 relative z-10">₹80,000 / ₹2L</p>
                        <FluidWaterLayer percent={40} minHeight={20} tone="income" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-1 border-t border-line/50">
                      <span>Encrypted IndexedDB + Direct Sheet</span>
                      <span className="text-accent font-medium">Instant Startup</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      ref={containerRef}
                      className="group relative aspect-video w-full rounded-2xl md:rounded-3xl border border-line/60 bg-[#0E1116] shadow-[0_30px_90px_rgba(169,95,50,0.2),0_0_50px_rgba(169,95,50,0.12)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(200,164,92,0.2)] overflow-hidden transition-all duration-300"
                    >
                      <video
                        ref={videoRef}
                        src="./promo/Munshi_Promo_GooglsVids.mp4"
                        className="w-full h-full object-cover select-none cursor-pointer"
                        autoPlay
                        muted={isMuted}
                        loop
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onClick={togglePlay}
                      />

                      {isMuted && (
                        <button
                          type="button"
                          onClick={toggleMute}
                          aria-label="Tap for sound"
                          className="absolute bottom-14 left-3.5 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-accent/40 text-accent font-sans text-xs font-semibold shadow-lg hover:bg-black/95 transition-all active:scale-95"
                        >
                          <Icon name="volume_off" size={14} className="text-accent" />
                          <span>Tap for sound</span>
                        </button>
                      )}

                      <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-3 sm:px-4 flex items-center gap-2 sm:gap-3 z-20 opacity-95 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={togglePlay}
                          aria-label={isPlaying ? 'Pause video' : 'Play video'}
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-white/90 hover:text-accent transition-colors active:scale-90"
                        >
                          <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={20} />
                        </button>

                        <span className="font-mono text-[10px] sm:text-[11px] text-white/70 whitespace-nowrap">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>

                        <div className="flex-1 flex items-center relative">
                          <input
                            type="range"
                            min={0}
                            max={duration > 0 ? duration : 100}
                            step={0.1}
                            value={currentTime}
                            onChange={handleSeek}
                            aria-label="Seek video progress"
                            className="w-full h-1.5 sm:h-2 rounded-full cursor-pointer appearance-none outline-none transition-all"
                            style={{
                              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${progressPct}%, rgba(255, 255, 255, 0.25) ${progressPct}%, rgba(255, 255, 255, 0.25) 100%)`,
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            type="button"
                            onClick={toggleMute}
                            aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
                            title={isMuted ? 'Unmute sound' : 'Mute sound'}
                            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white/90 hover:text-accent transition-colors active:scale-90"
                          >
                            <Icon name={isMuted ? 'volume_off' : 'volume_up'} size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={toggleFullscreen}
                            aria-label="Toggle Fullscreen"
                            title="Toggle Fullscreen"
                            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white/90 hover:text-accent transition-colors active:scale-90"
                          >
                            <Icon name="fullscreen" size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted pt-3 px-1 w-full">
                      <span className="font-sans text-[11px] sm:text-xs text-muted">
                        Watch the official product tour
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px]">
                        <button
                          type="button"
                          onClick={toggleMute}
                          className="rounded-full border border-line bg-surface/60 px-2.5 py-0.5 text-text hover:border-accent transition-colors"
                        >
                          {isMuted ? 'Sound off' : 'Sound on'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Tablet & Mobile Primary CTA */}
              <div className="xl:hidden flex flex-col items-center gap-3 pt-7 w-full">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <GetStartedCoinButton
                    onNavigate={() => navigate('/tour')}
                    coinSize={20}
                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-accent px-7 py-3.5 text-sm sm:text-base font-semibold text-on-accent shadow-xl shadow-accent/25 hover:brightness-105 transition-all active:scale-[0.98] group cursor-pointer"
                  />

                  <HowItWorksButton
                    onClick={() => scrollToSection('how')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface/70 px-5 py-3.5 text-sm font-semibold text-text hover:bg-raised transition-all cursor-pointer"
                  />
                </div>

                <p className="text-xs text-muted pt-0.5 text-center">
                  No sign-ups, no logins — just a quick 5-minute guided tour and you&apos;re ready to go.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 1 · WHAT YOU GET (Features + Live Ledger Preview)
            ========================================================================= */}
        <section id="features" className="border-t border-line/60 py-14 sm:py-20 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <p className="font-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-accent">
                What Munshi does
              </p>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-text leading-[1.12]">
                Everything your <span className="font-serif italic text-accent font-normal">ledger</span> needs.
              </h2>
              <p className="text-sm sm:text-base text-muted leading-relaxed">
                Track daily spending, income, transfers, multi-account balances, monthly budgets, and rising-water goals — computed privately on your device from your own sheet.
              </p>
            </div>
            <span className="font-mono text-xs text-muted">Live Ledger &amp; Goals Preview</span>
          </div>

          <LiveLedgerPreview />

          {/* 6 Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {CAPABILITIES.map((c) => (
              <div
                key={c.num}
                className="rounded-2xl border border-line/80 bg-surface/65 backdrop-blur-sm p-6 space-y-3 hover:border-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-accent">{c.num}</span>
                  <Icon name={c.icon} size={20} className="text-accent" />
                </div>
                <h3 className="font-display text-lg font-medium text-text">{c.title}</h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            SECTION 2 · HOW IT WORKS (Ecosystem Architecture Diagram + Fig. 2)
            ========================================================================= */}
        <section id="how" className="border-t border-line/60 py-14 sm:py-20 space-y-10">
          <div className="space-y-3 max-w-2xl">
            <p className="font-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-accent">
              How it works
            </p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-text leading-[1.12]">
              App to Sheet. <span className="font-serif italic text-accent font-normal">Nothing in between.</span>
            </h2>
            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Your data, your rules — what you earn, spend, and save stays strictly between your devices and your personal Google Sheet across Android, Web, and PWA.
            </p>
          </div>

          <figure className="rounded-3xl border border-line/80 bg-surface/75 backdrop-blur-md p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-11 items-center gap-4">
              {/* Node 1: Devices */}
              <div className="lg:col-span-3 rounded-2xl border border-line bg-bg/80 p-5 space-y-2.5 h-full">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent font-semibold">
                    YOUR DEVICES
                  </span>
                  <Icon name="smartphone" size={18} className="text-accent" />
                </div>
                <h3 className="font-display text-xl font-medium text-text">Munshi App</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Native Android APK, Web App &amp; installable PWA. Writes instantly offline to local IndexedDB and syncs smoothly.
                </p>
              </div>

              <div className="lg:col-span-1 flex lg:flex-col items-center justify-center gap-1 py-1 text-accent font-mono text-[10px] text-center">
                <span className="hidden lg:inline">HTTPS + Token</span>
                <Icon name="sync_alt" size={20} className="rotate-90 lg:rotate-0" />
                <span className="lg:hidden">Direct HTTPS + Token</span>
              </div>

              {/* Node 2: Script */}
              <div className="lg:col-span-3 rounded-2xl border-2 border-accent/50 bg-accent/5 p-5 space-y-2.5 h-full">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent font-semibold">
                    YOUR SHEET API
                  </span>
                  <Icon name="terminal" size={18} className="text-accent" />
                </div>
                <h3 className="font-display text-xl font-medium text-text">Apps Script</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Lives inside your Google Sheet. Verifies your token, locks concurrent writes, and keeps formulas safe.
                </p>
              </div>

              <div className="lg:col-span-1 flex lg:flex-col items-center justify-center gap-1 py-1 text-accent font-mono text-[10px] text-center">
                <span className="hidden lg:inline">Two-Way Sync</span>
                <Icon name="sync_alt" size={20} className="rotate-90 lg:rotate-0" />
                <span className="lg:hidden">Reads &amp; Writes Rows</span>
              </div>

              {/* Node 3: Sheet */}
              <div className="lg:col-span-3 rounded-2xl border border-line bg-bg/80 p-5 space-y-2.5 h-full">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-income font-semibold">
                    YOUR DATABASE
                  </span>
                  <Icon name="table_chart" size={18} className="text-income" />
                </div>
                <h3 className="font-display text-xl font-medium text-text">Google Sheet</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Clean spreadsheets inside your own Google Drive. Inspect rows, build charts, or export to Excel anytime.
                </p>
              </div>
            </div>

            <figcaption className="text-xs font-mono text-muted flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line/50">
              <span>Direct peer-to-sheet flow across Android APK, Web &amp; PWA.</span>
              <span>Zero middleman servers</span>
            </figcaption>
          </figure>
        </section>

        {/* =========================================================================
            SECTION 3 · PRIVACY BY DESIGN (Original Munshi Architecture Rules)
            ========================================================================= */}
        <section id="privacy" className="border-t border-line/60 py-14 sm:py-20 space-y-10">
          <div className="space-y-3 max-w-2xl">
            <p className="font-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-accent">
              Privacy by design
            </p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-text leading-[1.12]">
              Built so no one sees your numbers except you.
            </h2>
            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Your financial records stay in your own Google Drive from day one — backed by verifiable, open-source code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PRIVACY_RULES.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-line/80 bg-surface/65 backdrop-blur-sm p-6 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
                    {item.label}
                  </span>
                  <Icon name={item.icon} size={18} className="text-accent" />
                </div>
                <h3 className="font-display text-xl font-medium text-text">{item.title}</h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            SECTION 4 · SETUP PREVIEW (Original Munshi 5-Step Flow Figure + CTA)
            ========================================================================= */}
        <section className="border-t border-line/60 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center rounded-3xl border border-line/80 bg-surface/65 backdrop-blur-md p-6 sm:p-10">
            <div className="lg:col-span-6 space-y-5">
              <p className="font-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-accent">
                Guided setup
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-text leading-[1.12]">
                Set up once, <br className="hidden sm:inline" />
                <span className="font-serif italic text-accent font-normal">use on every device.</span>
              </h2>
              <p className="text-sm sm:text-base text-muted leading-relaxed max-w-xl">
                Our guided tour includes 1-click copy buttons for all three Apps Script files (<code className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg border border-line">Code.gs</code>, <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg border border-line">ConnectionInfo.html</code>, and <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg border border-line">appsscript.json</code>) plus live connection testing.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <GetStartedCoinButton
                  label="Start the tour"
                  onNavigate={() => navigate('/tour')}
                  coinSize={20}
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-accent px-8 py-4 text-sm sm:text-base font-semibold text-on-accent shadow-lg shadow-accent/25 hover:brightness-105 transition-all active:scale-[0.98] group cursor-pointer"
                />

                <SetupGuideButton className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-bg/80 px-5 py-4 text-xs sm:text-sm font-semibold text-text hover:border-accent/50 transition-colors" />
              </div>

              <p className="text-xs text-muted">
                No sign-ups, no logins — just a quick 5-minute guided tour and you&apos;re ready to go.
              </p>
            </div>

            {/* Fig. 3 — Clean 5-Step Munshi Flow Card */}
            <figure className="lg:col-span-6">
              <div className="rounded-2xl border border-line bg-bg/85 p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between border-b border-line/60 pb-3 font-mono text-[11px] uppercase tracking-wider text-muted">
                  <span>5-STEP CONNECTION FLOW</span>
                  <span className="text-accent font-semibold">1 SHEET ONLY</span>
                </div>

                <div className="space-y-2.5">
                  {SETUP_STEPS_PREVIEW.map((item) => (
                    <div
                      key={item.num}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-surface/70 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 border border-accent/30 font-mono text-[11px] font-bold text-accent">
                          {item.num}
                        </span>
                        <span className="font-medium text-text truncate">{item.title}</span>
                      </div>
                      <span className="hidden sm:inline font-mono text-[11px] text-muted shrink-0">
                        {item.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <figcaption className="mt-2.5 text-center font-mono text-[11px] text-muted">
                Guided setup flow — connect Android APK, Web &amp; PWA to one sheet.
              </figcaption>
            </figure>
          </div>
        </section>
      </main>

      {/* =========================================================================
          MINIMAL SINGLE-LINE FOOTER (Links on top in mobile, single-line in tablet/desktop)
          ========================================================================= */}
      <footer className="mt-4 w-full border-t border-line/60 bg-surface/30 backdrop-blur-md py-5 sm:py-6 px-4 sm:px-6 md:px-10 transition-colors duration-300">
        <div className="mx-auto flex w-full max-w-7xl flex-col-reverse md:flex-row items-center justify-between gap-3 text-center md:text-left font-mono text-[11px] sm:text-xs text-muted">
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
            <button
              type="button"
              onClick={() => {
                sound.play('click');
                navigate('/terms');
              }}
              className="hover:text-text transition-colors"
            >
              Terms
            </button>
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

      {/* Sticky Floating Back to Top Icon Button */}
      <button
        type="button"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          sound.play('click');
        }}
        aria-label="Back to top"
        title="Back to top"
        className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-line bg-surface/90 text-text shadow-xl backdrop-blur-md transition-all duration-300 hover:bg-raised hover:border-accent hover:text-accent hover:-translate-y-0.5 active:scale-95 ${
          showScrollTop
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <Icon name="arrow_upward" size={18} />
      </button>
    </div>
  );
}
