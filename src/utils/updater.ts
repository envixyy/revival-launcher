/**
 * Revival Launcher — Update Checker Utility
 *
 * Compares current build version against GitHub releases or remote endpoint,
 * parses changelogs, handles skipped versions, and initiates downloads.
 */

import { safeInvoke } from './tauri';

export const CURRENT_VERSION = '0.3.0';
const GITHUB_REPO = 'envixyy/revival-launcher';
const SKIPPED_VERSION_KEY = 'revival_skipped_version';
const LAST_CHECK_KEY = 'revival_last_update_check';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string;
  releaseUrl: string;
}

/**
 * Compare two semver strings (e.g. '0.3.4' vs '0.3.0')
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const clean2 = v2.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);

  const len = Math.max(clean1.length, clean2.length);
  for (let i = 0; i < len; i++) {
    const num1 = clean1[i] || 0;
    const num2 = clean2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export function getSkippedVersion(): string | null {
  try {
    return localStorage.getItem(SKIPPED_VERSION_KEY);
  } catch {
    return null;
  }
}

export function setSkippedVersion(version: string): void {
  try {
    localStorage.setItem(SKIPPED_VERSION_KEY, version);
  } catch {}
}

export function clearSkippedVersion(): void {
  try {
    localStorage.removeItem(SKIPPED_VERSION_KEY);
  } catch {}
}

export function getLastCheckTime(): string | null {
  try {
    return localStorage.getItem(LAST_CHECK_KEY);
  } catch {
    return null;
  }
}

/**
 * Default fallback / mock changelog when offline or before GitHub release tags are created
 */
const DEFAULT_UPDATE_INFO: UpdateInfo = {
  available: true,
  currentVersion: CURRENT_VERSION,
  latestVersion: '0.3.4',
  releaseName: 'Revival Launcher 0.3.4 — Social Hub, Animated UI & Roadmap',
  releaseNotes: `### Hi everyone!

In this new release we completely overhauled the UI with smooth animations, added the official roadmap section, Discord-style Friends Hub, and owner status tags.

### ✨ Added
- **Official Suggestions & Roadmap Section**: Follow real-time development phases (In Progress, Coming Soon, Planned, Shipped) curated by @envixyy.
- **Owner Tag Management**: Tag feature requests as 🚀 *Going to be Added*, ✅ *Has Been Added*, or 📌 *Under Review*.
- **macOS Traffic Light Window Controls**: Clean red/yellow/green native window controls with animated hover states.
- **Stagger Animations & Shimmer Skeletons**: 14 new custom CSS keyframes for snappy transitions and card hover lifts.
- **Discord-style Friends & Messaging**: Real-time DM chat bubbles with avatar previews and per-user isolated friends lists.

### 🛡️ Improvements & Fixes
- Fixed per-user isolated storage for friend lists to prevent global state leaks.
- Prevented adding self as friend across all quick-add and catalog dialogs.
- Scrollable Discord profile previews with ESC key support.
- Native mod downloads and .mrpack pack import optimizations.

Grab the latest installer and enjoy the smoothest Revival Launcher experience yet!`,
  publishedAt: new Date().toISOString(),
  downloadUrl: 'https://github.com/envixyy/revival-launcher/releases/latest',
  releaseUrl: 'https://github.com/envixyy/revival-launcher/releases/latest',
};

/**
 * Check for updates against GitHub Releases API with fallback
 */
export async function checkForUpdates(force = false): Promise<UpdateInfo> {
  try {
    localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
  } catch {}

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const rawTag = (data.tag_name || '').trim();
      const latestVer = rawTag.replace(/^v/i, '') || '0.3.4';
      const isNewer = compareVersions(latestVer, CURRENT_VERSION) > 0;
      const skipped = getSkippedVersion();

      // Find exe asset if present
      const exeAsset = Array.isArray(data.assets)
        ? data.assets.find((a: any) => a.name && a.name.endsWith('.exe'))
        : null;

      const downloadUrl = exeAsset ? exeAsset.browser_download_url : data.html_url || `https://github.com/${GITHUB_REPO}/releases`;

      const info: UpdateInfo = {
        available: isNewer && (force || skipped !== latestVer),
        currentVersion: CURRENT_VERSION,
        latestVersion: latestVer,
        releaseName: data.name || `Revival Launcher v${latestVer}`,
        releaseNotes: data.body || DEFAULT_UPDATE_INFO.releaseNotes,
        publishedAt: data.published_at || new Date().toISOString(),
        downloadUrl,
        releaseUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
      };

      return info;
    }
  } catch (err) {
    console.warn('Failed to query GitHub Releases API, falling back:', err);
  }

  // Fallback if GitHub repository has no published release tag yet
  const fallbackNewer = compareVersions(DEFAULT_UPDATE_INFO.latestVersion, CURRENT_VERSION) > 0;
  const skipped = getSkippedVersion();

  return {
    ...DEFAULT_UPDATE_INFO,
    available: fallbackNewer && (force || skipped !== DEFAULT_UPDATE_INFO.latestVersion),
  };
}

/**
 * Open download URL or installer
 */
export async function openUpdateDownload(url: string): Promise<void> {
  try {
    await safeInvoke('open_url', { url });
  } catch {
    window.open(url, '_blank');
  }
}
