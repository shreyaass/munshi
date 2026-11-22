import { useState, useEffect, useCallback } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

export const CURRENT_APP_VERSION = 'v1.0.0';
const GITHUB_REPO = 'shreyaass/munshi';
const CACHE_KEY = 'munshi_update_info';
const LAST_CHECK_KEY = 'munshi_update_last_checked';

export interface UpdateInfo {
  version: string;
  tagName: string;
  name: string;
  publishedAt: string;
  notes: string;
  apkUrl: string;
  isNewer: boolean;
}

interface AppUpdaterPlugin {
  installApk(options: { url: string }): Promise<{ success: boolean; downloadId?: number }>;
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater');

/**
 * Compare two semantic version strings (e.g. "v1.0.1" vs "v1.0.0").
 * Returns true if candidate is strictly greater than current.
 */
export function isNewerVersion(candidate: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split(/[-.+]/)[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const [cMaj = 0, cMin = 0, cPat = 0] = parse(candidate);
  const [curMaj = 0, curMin = 0, curPat = 0] = parse(current);

  if (cMaj !== curMaj) return cMaj > curMaj;
  if (cMin !== curMin) return cMin > curMin;
  return cPat > curPat;
}

export async function fetchLatestRelease(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`GitHub API error: ${res.statusText}`);
    }

    const data = await res.json();
    const tagName = data.tag_name || '';
    const apkAsset = Array.isArray(data.assets)
      ? data.assets.find((a: { name: string }) => a.name.endsWith('.apk'))
      : null;

    const apkUrl =
      apkAsset?.browser_download_url ||
      `https://github.com/${GITHUB_REPO}/releases/latest/download/munshi-app-debug.apk`;

    const isNewer = isNewerVersion(tagName, CURRENT_APP_VERSION);

    const info: UpdateInfo = {
      version: tagName.replace(/^v/, ''),
      tagName,
      name: data.name || tagName,
      publishedAt: data.published_at,
      notes: data.body || '',
      apkUrl,
      isNewer,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(info));
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
    return info;
  } catch (err) {
    console.error('Failed to check for updates:', err);
    throw err;
  }
}

export function getCachedUpdate(): UpdateInfo | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export async function installApk(apkUrl: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await AppUpdater.installApk({ url: apkUrl });
    } catch (err) {
      console.warn('Native installer call failed, opening download link in browser', err);
      window.open(apkUrl, '_system');
    }
  } else {
    // Web / PWA browser environment: trigger direct APK file download
    const link = document.createElement('a');
    link.href = apkUrl;
    link.download = 'munshi-app-debug.apk';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(() => getCachedUpdate());
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const hasUpdate = Boolean(updateInfo?.isNewer);

  const checkForUpdates = useCallback(async (manual = false) => {
    setChecking(true);
    setError(null);
    setStatusMessage(null);
    try {
      const latest = await fetchLatestRelease();
      setUpdateInfo(latest);
      if (latest) {
        if (latest.isNewer) {
          setStatusMessage(`Update ${latest.tagName} is available!`);
        } else if (manual) {
          setStatusMessage(`Munshi is up to date (${CURRENT_APP_VERSION}).`);
        }
      } else if (manual) {
        setStatusMessage('No releases found.');
      }
    } catch (err) {
      if (manual) {
        setError(err instanceof Error ? err.message : 'Unable to check for updates.');
      }
    } finally {
      setChecking(false);
    }
  }, []);

  const triggerInstall = useCallback(async () => {
    const targetUrl =
      updateInfo?.apkUrl ||
      `https://github.com/${GITHUB_REPO}/releases/latest/download/munshi-app-debug.apk`;

    setInstalling(true);
    setError(null);
    try {
      setStatusMessage('Starting download and installation…');
      await installApk(targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start installer.');
    } finally {
      setInstalling(false);
    }
  }, [updateInfo]);

  // Automatic silent check on mount if last check was > 1 hour ago
  useEffect(() => {
    const last = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0', 10);
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - last > oneHour) {
      checkForUpdates(false);
    }
  }, [checkForUpdates]);

  return {
    currentVersion: CURRENT_APP_VERSION,
    updateInfo,
    hasUpdate,
    checking,
    installing,
    error,
    statusMessage,
    checkForUpdates,
    triggerInstall,
  };
}
