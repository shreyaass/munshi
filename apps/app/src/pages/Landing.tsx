import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { sound } from '../lib/sound';
import { useTheme } from '../lib/theme';

export function Landing() {
  const navigate = useNavigate();
  const { resolved, setMode } = useTheme();

  // Native Video Player State
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

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

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

        {/* Orbiting Radiant Orb 2 (Orbits around bottom/left & player area) */}
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

          {/* Start the Tour (Header CTA) */}
          <button
            type="button"
            onClick={() => {
              sound.play('click');
              navigate('/tour');
            }}
            className="hidden sm:inline-flex rounded-xl border border-line bg-surface/70 px-3.5 py-2 text-xs font-semibold text-text hover:bg-raised transition-colors active:scale-95 shadow-sm"
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
          HERO & CONTENT SECTION
          - Desktop (xl:): 2-column with Video Player on right (Mockup Image 2)
          - Tablet (md: to xl:): Centered layout with Video Player in center (Mockup Image 3)
          - Mobile (< md:): Centered layout with Video Player & 3-column features
          ========================================================================= */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-between px-6 sm:px-10 md:px-12 pt-4 sm:pt-8 md:pt-10 pb-6 xl:py-14">
        <div className="grid grid-cols-1 xl:grid-cols-12 items-center gap-10 xl:gap-14 w-full">
          {/* Hero Copy (Centered on Tablet/Mobile per mockup Image 3, Left-aligned on Desktop per mockup Image 2) */}
          <div className="flex flex-col items-center text-center space-y-6 sm:space-y-7 xl:items-start xl:text-left xl:col-span-6">
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

            {/* Desktop-only Buttons (Shown on desktop in left column; moved below player on tablet/mobile) */}
            <div className="hidden xl:flex flex-col items-start gap-2.5 pt-1">
              <div className="flex items-center gap-3">
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface/70 px-5 py-3.5 text-sm font-semibold text-text hover:bg-raised transition-colors active:scale-[0.98] shadow-sm"
                >
                  <Icon name="play_arrow" size={17} className="text-accent" />
                  <span>Start the tour</span>
                </button>
              </div>

              <p className="text-xs text-muted pt-1">
                Plays in your browser. No sign-up needed to watch.
              </p>
            </div>

            {/* 3 Core Features (Side-by-side 3-column grid on ALL viewports: mobile, tablet, desktop) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 pt-4 w-full max-w-xl sm:max-w-2xl xl:max-w-none">
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-1.5 sm:gap-3 p-2.5 sm:p-0 rounded-2xl border border-line/60 bg-surface/50 backdrop-blur-sm sm:border-0 sm:bg-transparent">
                <Icon name="speed" size={20} className="text-accent shrink-0 sm:mt-0.5" />
                <div>
                  <div className="text-text font-semibold text-[11px] sm:text-sm leading-tight">Monthly limit</div>
                  <p className="hidden sm:block text-xs text-muted leading-relaxed mt-0.5">See what is left, every day</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-1.5 sm:gap-3 p-2.5 sm:p-0 rounded-2xl border border-line/60 bg-surface/50 backdrop-blur-sm sm:border-0 sm:bg-transparent">
                <Icon name="water_drop" size={20} className="text-accent shrink-0 sm:mt-0.5" />
                <div>
                  <div className="text-text font-semibold text-[11px] sm:text-sm leading-tight">Goals that fill up</div>
                  <p className="hidden sm:block text-xs text-muted leading-relaxed mt-0.5">Watch the water rise</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-1.5 sm:gap-3 p-2.5 sm:p-0 rounded-2xl border border-line/60 bg-surface/50 backdrop-blur-sm sm:border-0 sm:bg-transparent">
                <Icon name="grid_view" size={20} className="text-accent shrink-0 sm:mt-0.5" />
                <div>
                  <div className="text-text font-semibold text-[11px] sm:text-sm leading-tight">Your Google Sheet</div>
                  <p className="hidden sm:block text-xs text-muted leading-relaxed mt-0.5">Every entry stays yours</p>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              THE NATIVE VIDEO PLAYER COMPONENT (Google Vids MP4)
              Interactive Scrubber, Play/Pause, Live Timestamp, Tap-for-Sound, Fullscreen
              ========================================================================= */}
          <div
            id="product-player"
            className="w-full flex flex-col items-center xl:col-span-6 xl:items-end select-none"
          >
            <div className="relative w-full max-w-[540px] sm:max-w-[580px] xl:max-w-[620px]">
              {/* Focused Pulsing Glowing Aura Behind Player Card */}
              <div
                className="absolute -inset-4 sm:-inset-6 md:-inset-8 rounded-[48px] bg-gradient-to-tr from-accent/45 via-accent/20 to-transparent blur-2xl md:blur-3xl animate-ambient-pulse pointer-events-none -z-10"
                aria-hidden="true"
              />

              {/* The Video Player Card Container */}
              <div
                ref={containerRef}
                className="group relative aspect-video w-full rounded-2xl md:rounded-3xl border border-line/60 bg-[#0E1116] shadow-[0_30px_90px_rgba(169,95,50,0.2),0_0_50px_rgba(169,95,50,0.12)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(200,164,92,0.2)] overflow-hidden transition-all duration-300"
              >
                {/* Native HTML5 Video Element */}
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

                {/* Floating "Tap for sound" badge (Visible when muted) */}
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

                {/* Sleek Bottom Control Bar */}
                <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-3 sm:px-4 flex items-center gap-2 sm:gap-3 z-20 opacity-95 group-hover:opacity-100 transition-opacity">
                  {/* Play / Pause Toggle Button */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-white/90 hover:text-accent transition-colors active:scale-90"
                  >
                    <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={20} />
                  </button>

                  {/* Live Time Timestamp */}
                  <span className="font-mono text-[10px] sm:text-[11px] text-white/70 whitespace-nowrap">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  {/* Scrubber Progress Slider */}
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

                  {/* Right Control Icons */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* CC Closed Captions Indicator */}
                    <span
                      title="Subtitles"
                      className="hidden sm:inline-flex items-center justify-center font-mono text-[10px] font-bold text-white/80 border border-white/25 rounded px-1 h-5 select-none"
                    >
                      CC
                    </span>

                    {/* Mute / Unmute Sound Toggle Button */}
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
                      title={isMuted ? 'Unmute sound' : 'Mute sound'}
                      className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white/90 hover:text-accent transition-colors active:scale-90"
                    >
                      <Icon name={isMuted ? 'volume_off' : 'volume_up'} size={18} />
                    </button>

                    {/* Fullscreen Button */}
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

              {/* Below-Player Subtext & Status Badges */}
              <div className="flex items-center justify-between text-xs text-muted pt-3 px-1 w-full">
                <span className="font-sans text-[11px] sm:text-xs text-muted">
                  Watch the official product tour
                </span>
                <div className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px]">
                  <span className="rounded-full border border-line bg-surface/60 px-2.5 py-0.5 text-text">
                    Captions on
                  </span>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="rounded-full border border-line bg-surface/60 px-2.5 py-0.5 text-text hover:border-accent transition-colors"
                  >
                    {isMuted ? 'Sound off' : 'Sound on'}
                  </button>
                </div>
              </div>
            </div>

            {/* Tablet & Mobile Buttons (Centered below the player per Mockup Image 3) */}
            <div className="flex xl:hidden flex-col items-center gap-2.5 pt-6 sm:pt-8 w-full">
              <div className="flex items-center justify-center gap-3">
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface/70 px-5 py-3.5 text-sm font-semibold text-text hover:bg-raised transition-colors active:scale-[0.98] shadow-sm"
                >
                  <Icon name="play_arrow" size={17} className="text-accent" />
                  <span>Start the tour</span>
                </button>
              </div>

              <p className="text-xs text-muted pt-1">
                Plays in your browser. No sign-up needed to watch.
              </p>
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
