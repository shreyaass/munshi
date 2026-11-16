import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Step {
  title: string;
  body: string;
  art: string;
}

const STEPS: Step[] = [
  {
    title: 'Copy the template',
    body: 'Tap the link we send you, then “Make a copy”. A version of the sheet lands in your own Google Drive — that copy is yours, we never see it.',
    art: '📄',
  },
  {
    title: 'Open the script',
    body: 'In your sheet: Extensions → Apps Script. The code is already inside the copy, so nothing needs pasting.',
    art: '🧩',
  },
  {
    title: 'Deploy it',
    body: 'Deploy → New deployment → Web app. Choose “Execute as: Me” and “Who has access: Anyone”. Then Authorize.',
    art: '🚀',
  },
  {
    title: 'Copy two values',
    body: 'Back in the sheet, open the menu Expense Tracker → Show connection info. Copy the Web App URL and the token.',
    art: '🔑',
  },
  {
    title: 'Paste and go',
    body: 'Paste both into the connect screen. The app checks the sheet and takes you straight to the dashboard.',
    art: '✅',
  },
];

export function Tour() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white px-6 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/connect')}
          className="text-sm font-medium text-slate-400"
        >
          Skip
        </button>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
        <span className="w-8 text-right text-xs font-medium text-slate-400">
          {index + 1}/{STEPS.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          key={step.title}
          className="animate-pop mb-8 flex h-32 w-32 items-center justify-center rounded-[2rem] bg-gradient-to-br from-indigo-50 to-sky-50 text-6xl shadow-inner dark:from-indigo-950/40 dark:to-sky-950/40"
        >
          {step.art}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{step.title}</h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">{step.body}</p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => (isLast ? navigate('/connect') : setIndex(index + 1))}
          className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]"
        >
          {isLast ? 'Connect now' : 'Next'}
        </button>
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="w-full py-2 text-sm font-medium text-slate-500"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
