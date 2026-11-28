import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SheetClient, SheetError, syncOnce, type Connection } from '@em/core';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { db } from '../lib/db';
import { getDeviceId, loadConnection, useConnectionState } from '../lib/connection';
import { setLocalMeta, store } from '../lib/repo';
import { sound } from '../lib/sound';
import { useTheme } from '../lib/theme';

import appsScriptRaw from '../../../../sheet/AppsScript.gs?raw';
import connectionInfoRaw from '../../../script/ConnectionInfo.html?raw';
import appsscriptManifestRaw from '../../../script/appsscript.json?raw';

interface TourStepMeta {
  stepNum: number;
  sidebarTitle: string;
  heading: string;
}

const TOUR_STEPS: TourStepMeta[] = [
  { stepNum: 1, sidebarTitle: 'Get the template', heading: 'Get the official template' },
  { stepNum: 2, sidebarTitle: 'Add the 3 script files', heading: 'Add the 3 script files' },
  { stepNum: 3, sidebarTitle: 'Run Setup in the sheet', heading: 'Run Setup in the sheet' },
  { stepNum: 4, sidebarTitle: 'Deploy /exec Web App', heading: 'Deploy Web App & Token' },
  { stepNum: 5, sidebarTitle: 'Connect & start tracking', heading: 'Connect & start tracking' },
];

interface ScriptFileSpec {
  id: 'code' | 'html' | 'manifest';
  filename: string;
  instruction: string;
  content: string;
  githubUrl: string;
}

const SCRIPT_FILES: ScriptFileSpec[] = [
  {
    id: 'code',
    filename: 'Code.gs',
    instruction: 'Select everything already in Code.gs, remove it, and paste this bundled script.',
    content: appsScriptRaw,
    githubUrl: 'https://github.com/shreyaass/munshi/blob/main/sheet/AppsScript.gs',
  },
  {
    id: 'html',
    filename: 'ConnectionInfo.html',
    instruction: 'Click + next to Files → HTML, name it ConnectionInfo (exact spelling), and paste this.',
    content: connectionInfoRaw,
    githubUrl: 'https://github.com/shreyaass/munshi/blob/main/apps/script/ConnectionInfo.html',
  },
  {
    id: 'manifest',
    filename: 'appsscript.json',
    instruction:
      'Open Project Settings (gear icon) → tick Show "appsscript.json" manifest file in editor → return to Editor (< >), open appsscript.json in the sidebar, and replace its contents.',
    content: appsscriptManifestRaw,
    githubUrl: 'https://github.com/shreyaass/munshi/blob/main/apps/script/appsscript.json',
  },
];

const EXEC_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/;
const DEV_MOCK_RE = /^http:\/\/(?:localhost|127\.0\.0\.1):\d+\/__mock\/?$/;

function CopyCodeCard({ file }: { file: ScriptFileSpec }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lineCount = file.content.split(/\r?\n/).length;

  async function handleCopy() {
    sound.play('click');
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setExpanded(true);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-bg/70 overflow-hidden text-left">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon name="description" size={16} className="text-accent shrink-0" />
            <span className="font-mono text-sm font-semibold text-text">{file.filename}</span>
            <span className="font-mono text-[10px] text-muted bg-surface px-2 py-0.5 rounded-full border border-line">
              {lineCount} lines
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">{file.instruction}</p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-semibold shrink-0 transition-all cursor-pointer ${
            copied ? 'bg-income text-white' : 'bg-accent text-on-accent hover:brightness-105'
          }`}
        >
          <Icon name={copied ? 'check' : 'content_copy'} size={14} />
          <span>{copied ? 'Copied' : `Copy ${lineCount} lines`}</span>
        </button>
      </div>

      <div className="border-t border-line/60 bg-surface/50 px-4 py-2 flex items-center justify-between text-[11px] font-mono">
        <button
          type="button"
          onClick={() => {
            sound.play('click');
            setExpanded((v) => !v);
          }}
          className="inline-flex items-center gap-1 text-muted hover:text-text transition-colors cursor-pointer"
        >
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={15} />
          <span>{expanded ? 'Hide file' : 'Inspect file'}</span>
        </button>

        <a
          href={file.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline inline-flex items-center gap-1"
        >
          <span>GitHub</span>
          <span className="text-[10px]">↗</span>
        </a>
      </div>

      {expanded && (
        <pre className="max-h-56 overflow-auto border-t border-line/60 bg-[#0D0F12] text-[#EAE6DF] p-3.5 text-[11px] font-mono leading-relaxed select-all">
          <code>{file.content}</code>
        </pre>
      )}
    </div>
  );
}

/* ============================================================================
   Visual Previews defining each setup step
   ============================================================================ */
function StepFigure({ stepIndex }: { stepIndex: number }) {
  if (stepIndex === 0) {
    return (
      <figure className="rounded-2xl border border-line bg-bg/70 p-4 space-y-2.5 text-left">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted">
          <span>Tabs created in your Google Sheet</span>
          <span className="text-income">Schema v3</span>
        </div>
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          {['Expenses', 'Income', 'Transfers', 'Accounts', 'Goals', 'Budgets', 'View', 'Read me'].map((tab) => (
            <span key={tab} className="rounded-lg border border-line bg-surface px-2.5 py-1 text-text">
              {tab}
            </span>
          ))}
        </div>
      </figure>
    );
  }

  if (stepIndex === 1) {
    return (
      <figure className="rounded-2xl border border-line bg-bg/70 p-4 space-y-2.5 text-left">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted">
          <span>Files inside Apps Script</span>
          <span className="text-accent">All 3 files needed</span>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3 space-y-1.5 font-mono text-xs">
          <div className="flex items-center gap-2 text-text py-0.5">
            <span className="text-accent w-6">GS</span>
            <span>Code.gs</span>
          </div>
          <div className="flex items-center gap-2 text-text py-0.5 bg-accent/10 rounded px-1.5">
            <span className="text-income w-6">&lt;&gt;</span>
            <span className="font-semibold">ConnectionInfo.html</span>
            <span className="ml-auto text-[10px] text-accent">Powers token dialog</span>
          </div>
          <div className="flex items-center gap-2 text-text py-0.5">
            <span className="text-muted w-6">{'{}'}</span>
            <span>appsscript.json</span>
            <span className="ml-auto text-[10px] text-muted">Enables 1-sheet scope</span>
          </div>
        </div>
      </figure>
    );
  }

  if (stepIndex === 2) {
    return (
      <figure className="rounded-2xl border border-line bg-bg/70 p-4 space-y-2.5 text-left">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted">
          <span>Sheet Menu &amp; Drive Permission Scope</span>
          <span className="text-income inline-flex items-center gap-1">
            <Icon name="lock" size={12} /> Single Sheet Only
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
          <div className="rounded-xl border border-line bg-surface p-3 space-y-1">
            <div className="font-semibold text-accent border-b border-line/60 pb-1">Munshi ▾</div>
            <div className="rounded bg-accent/15 text-text px-2 py-1 font-medium">1. Setup / repair sheet</div>
            <div className="px-2 py-0.5 text-muted">2. Show connection info</div>
          </div>
          <div className="rounded-xl border border-income/30 bg-income/5 p-3 space-y-1 text-[11px] font-sans">
            <div className="font-semibold text-income flex items-center gap-1.5">
              <Icon name="verified_user" size={14} />
              <span>@OnlyCurrentDoc</span>
            </div>
            <p className="text-muted leading-relaxed">
              The script can read and update <strong>this one spreadsheet only</strong> — nothing else in your Google Drive.
            </p>
          </div>
        </div>
      </figure>
    );
  }

  if (stepIndex === 3) {
    return (
      <figure className="rounded-2xl border border-line bg-bg/70 p-4 space-y-2.5 text-left">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted">
          <span>Copy the /exec Web App URL</span>
          <span className="text-accent">Deploy → Web app</span>
        </div>
        <div className="space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between rounded-xl border border-income/40 bg-income/10 px-3 py-2 text-text">
            <span className="truncate">https://script.google.com/macros/s/AKfy.../exec</span>
            <span className="text-income font-bold shrink-0 ml-2">✓ Valid URL</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-expense/40 bg-expense/10 px-3 py-2 text-muted">
            <span className="truncate line-through">https://script.google.com/macros/s/AKfy.../dev</span>
            <span className="text-expense font-bold shrink-0 ml-2">✗ Test URL (skip)</span>
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure className="rounded-2xl border border-line bg-bg/70 p-4 space-y-2 text-left">
      <div className="flex items-center justify-between text-[11px] font-mono text-muted">
        <span>One sheet across all your devices</span>
        <Icon name="devices" size={15} className="text-accent" />
      </div>
      <p className="text-xs text-muted leading-relaxed">
        Use the same <code className="font-mono text-[11px] text-text">/exec</code> Web App URL and Access Token on your{' '}
        <strong className="text-text">Android APK</strong>, <strong className="text-text">Phone PWA</strong>, and{' '}
        <strong className="text-text">Desktop Browser</strong> so every device shares one live ledger.
      </p>
    </figure>
  );
}

export function Tour() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { resolved, setMode } = useTheme();
  const { connect } = useConnectionState();

  const parseStepParam = (raw: string | null) => {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= TOUR_STEPS.length) return n - 1;
    return 0;
  };

  const [index, setIndex] = useState<number>(() => parseStepParam(searchParams.get('step')));

  useEffect(() => {
    const paramStep = searchParams.get('step');
    if (paramStep !== null) {
      setIndex(parseStepParam(paramStep));
    }
  }, [searchParams]);

  // Step 5 inline connect state
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const stepMeta = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  function goToStep(nextIndex: number) {
    setIndex(nextIndex);
    setSearchParams({ step: String(nextIndex + 1) }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNext() {
    sound.play('click');
    if (!isLast) {
      goToStep(index + 1);
    }
  }

  function handleBack() {
    sound.play('click');
    if (index > 0) {
      goToStep(index - 1);
    }
  }

  function handleSkip() {
    sound.play('click');
    goToStep(TOUR_STEPS.length - 1);
  }

  async function handleTestAndConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProblems([]);

    const cleanUrl = url.trim();
    const cleanToken = token.trim();

    if (!cleanUrl || !cleanToken) {
      setError('Both the Web App URL (/exec) and the Access Token are required.');
      return;
    }

    if (!EXEC_RE.test(cleanUrl) && !(import.meta.env.DEV && DEV_MOCK_RE.test(cleanUrl))) {
      if (/\/dev(\?.*)?$/.test(cleanUrl)) {
        setError(
          'That is a /dev test URL, which Google blocks for apps. Copy the production URL ending in /exec from Deploy → Manage deployments.',
        );
      } else {
        setError(
          'That does not look like a Web App URL. It must end in /exec (https://script.google.com/macros/s/XXXX/exec).',
        );
      }
      return;
    }

    setBusy(true);
    try {
      const client = new SheetClient({ url: cleanUrl, token: cleanToken });
      const ping = await client.ping();

      if (ping.problems.length > 0) {
        setProblems(ping.problems);
      }
      if (!ping.ok && ping.problems.length === 0) {
        setError('The sheet responded, but Setup has not been run yet. Run Munshi → 1. Setup / repair sheet first.');
        return;
      }

      const previous = loadConnection();
      if (previous && previous.url !== cleanUrl) {
        await db.rows.clear();
        await db.meta.clear();
      }

      sound.play('sync');
      await syncOnce(store, client, getDeviceId());

      const syncedAccounts = (await db.rows.where('tab').equals('Accounts').toArray()).filter(
        (r) => !r.deleted,
      );
      await setLocalMeta('onboarded', syncedAccounts.length === 0 ? '0' : '1');
      connect({ url: cleanUrl, token: cleanToken } satisfies Connection);

      if (syncedAccounts.length === 0) {
        navigate('/welcome', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      if (err instanceof SheetError) {
        setError(
          err.kind === 'auth'
            ? 'The token was rejected. Open Munshi → 2. Show connection info in your sheet and copy the token again.'
            : err.message,
        );
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full bg-bg text-text transition-colors duration-300">
      {/* =========================================================================
          DESKTOP / TABLET SIDEBAR (Munshi Vertical Stepper)
          ========================================================================= */}
      <aside className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col justify-between border-r border-line bg-surface/40 p-8 select-none">
        <div>
          <button
            type="button"
            onClick={() => {
              sound.play('click');
              navigate('/landing');
            }}
            className="flex items-center gap-3 pb-10 select-none group text-left cursor-pointer"
            title="Return to landing page"
          >
            <Logo className="h-9 w-9 shrink-0 group-hover:scale-105 transition-transform" />
            <span className="font-display text-xl font-semibold tracking-tight text-text group-hover:text-accent transition-colors">
              Munshi
            </span>
          </button>

          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent/80 pb-6">
            Connect your sheet
          </p>

          <nav className="space-y-4" aria-label="Tour steps">
            {TOUR_STEPS.map((s, i) => {
              const isCurrent = i === index;
              const isPast = i < index;
              return (
                <button
                  key={s.stepNum}
                  type="button"
                  onClick={() => {
                    sound.play('click');
                    goToStep(i);
                  }}
                  className="flex w-full items-center gap-3.5 text-left transition group outline-none cursor-pointer"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono font-bold transition-all duration-200 ${
                      isPast
                        ? 'bg-accent text-on-accent'
                        : isCurrent
                          ? 'border-2 border-accent text-accent bg-accent/15'
                          : 'border border-line text-muted group-hover:border-muted'
                    }`}
                  >
                    {isPast ? <Icon name="check" size={14} className="stroke-[3]" /> : s.stepNum}
                  </span>

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

        <div className="space-y-2 text-xs text-muted">
          <p>Your ledger stays in your own Google Drive.</p>
          <a
            href="https://github.com/shreyaass/munshi/blob/main/sheet/SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline"
          >
            <span>Full Sheet Setup Guide</span>
            <span>↗</span>
          </a>
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTENT AREA
          ========================================================================= */}
      <div className="flex flex-1 flex-col justify-between pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] px-5 sm:px-8 md:p-10 lg:p-14 overflow-y-auto">
        <header className="flex items-center justify-between pb-4 gap-3">
          {/* Mobile Logo */}
          <button
            type="button"
            onClick={() => {
              sound.play('click');
              navigate('/landing');
            }}
            className="flex items-center gap-2 select-none md:hidden"
            title="Return to landing page"
          >
            <Logo className="h-7 w-7" />
            <span className="font-display text-base font-semibold text-text">Munshi</span>
          </button>

          {/* Mobile Progress Pills */}
          <div className="flex items-center gap-1.5 md:hidden">
            {TOUR_STEPS.map((s, i) => (
              <button
                key={s.stepNum}
                type="button"
                aria-label={`Go to step ${s.stepNum}`}
                onClick={() => goToStep(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-7 bg-accent' : i < index ? 'w-3 bg-accent/50' : 'w-2 bg-line'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <span className="hidden md:inline font-mono text-xs tracking-wider text-muted">
              {index + 1} / {TOUR_STEPS.length}
            </span>

            <button
              type="button"
              onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-surface/70 text-text hover:bg-raised transition-colors cursor-pointer"
            >
              <Icon name={resolved === 'dark' ? 'light_mode' : 'dark_mode'} size={16} className="text-accent" />
            </button>

            {!isLast && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs uppercase tracking-[0.12em] font-mono text-muted hover:text-text transition-colors cursor-pointer"
              >
                Skip to connect
              </button>
            )}
          </div>
        </header>

        {/* Center Step Card */}
        <main className="mx-auto w-full max-w-2xl my-auto py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepMeta.stepNum}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="rounded-3xl border border-line bg-surface/75 backdrop-blur-md p-6 sm:p-8 shadow-xl space-y-6"
            >
              <div className="space-y-2">
                <p className="font-mono text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                  STEP {stepMeta.stepNum} OF {TOUR_STEPS.length}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-text">
                  {stepMeta.heading}
                </h1>
              </div>

              <div className="border-t border-line/60 pt-5 space-y-5">
                {/* ==================== STEP 1 ==================== */}
                {index === 0 && (
                  <>
                    <p className="text-sm sm:text-base text-muted leading-relaxed">
                      Munshi stores your transactions, accounts, budgets, and goals inside your own Google Sheet using our pre-formatted template:
                    </p>

                    <ol className="space-y-2.5 text-sm text-text/90">
                      <li className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-accent mt-0.5">1.</span>
                        <span>
                          Download{' '}
                          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg border border-line text-text">
                            ExpenseManager-template.xlsx
                          </code>{' '}
                          with all columns, number formats, and dropdown validations pre-built.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-accent mt-0.5">2.</span>
                        <span>
                          Upload it to your <strong>Google Drive</strong> and double-click to open it.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-accent mt-0.5">3.</span>
                        <span>
                          Because it starts as an <code className="font-mono text-xs px-1 py-0.5 rounded bg-bg border border-line">.xlsx</code> file, convert it to a native Google Spreadsheet first: on the top bar click{' '}
                          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg border border-line text-text">
                            File → Save as Google Sheets
                          </code>{' '}
                          — then you&apos;ll see <strong>Extensions → Apps Script</strong> inside the new tab.
                        </span>
                      </li>
                    </ol>

                    <div>
                      <a
                        href="https://github.com/shreyaass/munshi/raw/main/sheet/ExpenseManager-template.xlsx"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => sound.play('click')}
                        className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-xs sm:text-sm font-semibold text-on-accent shadow-sm hover:brightness-105 transition-all"
                      >
                        <Icon name="download" size={17} />
                        <span>Download ExpenseManager-template.xlsx</span>
                      </a>
                    </div>

                    <StepFigure stepIndex={0} />
                  </>
                )}

                {/* ==================== STEP 2 ==================== */}
                {index === 1 && (
                  <>
                    <p className="text-sm sm:text-base text-muted leading-relaxed">
                      Inside your spreadsheet, open{' '}
                      <code className="font-mono text-xs px-2 py-0.5 rounded bg-bg border border-line text-text">
                        Extensions → Apps Script
                      </code>{' '}
                      on the top bar and add all <strong className="text-text">3 files</strong> below (including <strong className="text-text">ConnectionInfo.html</strong> and <strong className="text-text">appsscript.json</strong>):
                    </p>

                    <div className="space-y-3">
                      {SCRIPT_FILES.map((f) => (
                        <CopyCodeCard key={f.id} file={f} />
                      ))}
                    </div>

                    <p className="text-xs text-muted leading-relaxed">
                      Save with <code className="font-mono px-1.5 py-0.5 rounded bg-bg border border-line">Ctrl+S</code> (<code className="font-mono px-1.5 py-0.5 rounded bg-bg border border-line">⌘S</code> on Mac). Adjust <code className="font-mono">timeZone</code> inside <code className="font-mono">appsscript.json</code> if needed.
                    </p>

                    <StepFigure stepIndex={1} />
                  </>
                )}

                {/* ==================== STEP 3 ==================== */}
                {index === 2 && (
                  <>
                    <p className="text-sm sm:text-base text-muted leading-relaxed">
                      Switch back to your Google Sheet tab, <strong className="text-text">reload the page</strong>, and run Setup from the top menu:
                    </p>

                    <ol className="space-y-2.5 text-sm text-text/90">
                      <li className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-accent mt-0.5">1.</span>
                        <span>
                          Click{' '}
                          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg border border-line text-text">
                            Munshi → 1. Setup / repair sheet
                          </code>{' '}
                          in the spreadsheet toolbar.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-accent mt-0.5">2.</span>
                        <span>
                          Approve Google&apos;s one-time script permission for your sheet (<em>Advanced → Go to ... (unsafe) → Allow</em>, since the script lives inside your own account).
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-accent mt-0.5">3.</span>
                        <span>
                          Setup creates any missing tabs, formulas (<code className="font-mono text-xs">View</code> &amp; <code className="font-mono text-xs">Read me</code>), and your 256-bit Access Token.
                        </span>
                      </li>
                    </ol>

                    <div className="rounded-2xl border border-income/30 bg-income/5 p-4 space-y-1 text-xs leading-relaxed">
                      <p className="font-semibold text-income flex items-center gap-1.5">
                        <Icon name="lock" size={15} />
                        <span>Single-sheet access only</span>
                      </p>
                      <p className="text-muted">
                        With <code className="font-mono text-text">@OnlyCurrentDoc</code> and <code className="font-mono text-text">spreadsheets.currentonly</code>, the script can access <strong>this spreadsheet alone</strong> — nothing else in your Google Drive.
                      </p>
                    </div>

                    <StepFigure stepIndex={2} />
                  </>
                )}

                {/* ==================== STEP 4 ==================== */}
                {index === 3 && (
                  <>
                    <p className="text-sm sm:text-base text-muted leading-relaxed">
                      Publish your script as a Web App so Munshi can sync directly over HTTPS:
                    </p>

                    <ol className="space-y-2.5 text-sm text-text/90">
                      <li className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-accent mt-0.5">1.</span>
                        <span>
                          In Apps Script, click{' '}
                          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg border border-line text-text">
                            Deploy → New deployment
                          </code>{' '}
                          → select type <strong>Web app</strong>.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-accent mt-0.5">2.</span>
                        <span>
                          Set <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong>, then click <strong>Deploy</strong>.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-accent mt-0.5">3.</span>
                        <span>
                          Copy the <strong>Web app URL</strong> right from the deployment dialog — verify it ends in{' '}
                          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-income/10 text-income font-semibold">/exec</code>{' '}
                          (do not use a <code className="font-mono text-xs text-expense">/dev</code> test URL).
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-accent mt-0.5">4.</span>
                        <span>
                          Back in the sheet, open{' '}
                          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg border border-line text-text">
                            Munshi → 2. Show connection info
                          </code>{' '}
                          to copy your <strong>Access Token</strong> (you can also paste &amp; Save your <code className="font-mono">/exec</code> URL there for later devices).
                        </span>
                      </li>
                    </ol>

                    <div className="rounded-2xl border border-accent/50 bg-accent/10 p-4 space-y-1.5 text-xs leading-relaxed">
                      <p className="flex items-center gap-1.5 font-semibold text-accent">
                        <Icon name="warning" size={16} />
                        <span>Important: Complete Step 5 immediately while both values are open</span>
                      </p>
                      <p className="text-text/90">
                        You now have both your <code className="font-mono text-text">/exec</code> Web App URL and your <strong>Access Token</strong>. Click <strong>Next</strong> below and finish <strong>Step 5 strictly right now</strong> so Munshi can pair with your sheet before you close those dialogs.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-line bg-bg/60 p-4 space-y-1 text-xs leading-relaxed">
                      <p className="font-semibold text-accent">Why &quot;Who has access: Anyone&quot;?</p>
                      <p className="text-muted">
                        It only allows the app to reach your endpoint without OAuth app review. Every request without your private 256-bit Access Token is rejected immediately.
                      </p>
                    </div>

                    <StepFigure stepIndex={3} />
                  </>
                )}

                {/* ==================== STEP 5 ==================== */}
                {index === 4 && (
                  <>
                    <p className="text-sm sm:text-base text-muted leading-relaxed">
                      Paste your <code className="font-mono text-xs text-text">/exec</code> Web App URL and Access Token below to verify your sheet and open Munshi:
                    </p>

                    <form onSubmit={handleTestAndConnect} className="space-y-4">
                      <label className="block space-y-1.5">
                        <span className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Web App URL (/exec)
                        </span>
                        <input
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://script.google.com/macros/s/…/exec"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          inputMode="url"
                          className="w-full rounded-xl border border-line bg-bg px-3.5 py-3 font-mono text-xs sm:text-[13px] outline-none ring-accent focus:ring-2"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Access Token
                        </span>
                        <input
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="256-bit token from Munshi → 2. Show connection info"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          className="w-full rounded-xl border border-line bg-bg px-3.5 py-3 font-mono text-xs sm:text-[13px] outline-none ring-accent focus:ring-2"
                        />
                      </label>

                      {error && (
                        <div className="flex gap-2 rounded-xl border border-expense/40 bg-expense/10 px-3.5 py-3 text-xs sm:text-sm text-expense">
                          <Icon name="info" size={18} className="shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}

                      {problems.length > 0 && (
                        <div className="rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-3 text-xs text-text">
                          <p className="font-semibold mb-1 text-accent">The sheet needs attention:</p>
                          <ul className="list-disc pl-4 space-y-1">
                            {problems.map((p) => (
                              <li key={p}>{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-on-accent shadow-md hover:brightness-105 disabled:opacity-60 transition-all cursor-pointer"
                      >
                        <span>{busy ? 'Testing connection…' : 'Connect & open Munshi'}</span>
                        <Icon name="arrow_forward" size={16} />
                      </button>
                    </form>

                    <StepFigure stepIndex={4} />
                  </>
                )}
              </div>

              {/* Card Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-line/60">
                {index > 0 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-raised/60 px-6 py-3 text-xs md:text-sm font-semibold text-text hover:bg-line transition-all cursor-pointer"
                  >
                    <Icon name="arrow_back" size={15} />
                    <span>Back</span>
                  </button>
                ) : (
                  <div className="w-20" />
                )}

                {!isLast ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-xs md:text-sm font-semibold text-on-accent shadow-md hover:brightness-105 transition-all cursor-pointer"
                  >
                    <span>Next</span>
                    <Icon name="arrow_forward" size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      sound.play('click');
                      goToStep(0);
                    }}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-muted hover:text-accent transition-colors cursor-pointer"
                  >
                    <Icon name="replay" size={14} />
                    <span>Start setup from Step 1</span>
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <p className="mt-5 text-center font-mono text-[11px] text-muted">
            Need help? Open the{' '}
            <a
              href="https://github.com/shreyaass/munshi/blob/main/sheet/SETUP.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:brightness-110"
            >
              Sheet Setup Guide ↗
            </a>{' '}
            or view{' '}
            <a
              href="https://github.com/shreyaass/munshi#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:brightness-110"
            >
              README on GitHub ↗
            </a>
            .
          </p>
        </main>
      </div>
    </div>
  );
}
