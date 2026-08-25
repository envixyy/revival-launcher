/**
 * Revival Network — Platform-wide Announcements
 * Real-time announcement management strictly restricted to "envixyy".
 */

export type AnnouncementSeverity = 'info' | 'warning' | 'critical' | 'celebration';

export interface Announcement {
  id: string;
  severity: AnnouncementSeverity;
  title: string;
  body: string;
  /** Short timestamp label */
  date: string;
  /** Optional: a URL to open */
  url?: string;
  urlLabel?: string;
}

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-001',
    severity: 'celebration',
    title: 'Revival Network is LIVE!',
    body: 'Welcome to Revival Launcher v0.2. Real friends system, custom profiles, and role management enabled.',
    date: 'Aug 25',
    url: 'https://github.com/envixyy/revival-launcher',
    urlLabel: 'View GitHub',
  },
];

export function getAnnouncements(): Announcement[] {
  try {
    const saved = localStorage.getItem('revival_announcements');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return DEFAULT_ANNOUNCEMENTS;
}

export function saveAnnouncements(list: Announcement[]): void {
  localStorage.setItem('revival_announcements', JSON.stringify(list));
}

export function isOwner(username?: string): boolean {
  if (!username) return false;
  return username.toLowerCase().trim() === 'envixyy';
}

export function addAnnouncement(
  authorUsername: string,
  ann: Omit<Announcement, 'id' | 'date'>
): { success: boolean; message: string; announcement?: Announcement } {
  if (!isOwner(authorUsername)) {
    return { success: false, message: 'Only @envixyy can create platform announcements.' };
  }

  const list = getAnnouncements();
  const newAnn: Announcement = {
    ...ann,
    id: `ann_${Date.now()}`,
    date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
  };

  const updated = [newAnn, ...list];
  saveAnnouncements(updated);
  return { success: true, message: 'Announcement published successfully!', announcement: newAnn };
}

export function deleteAnnouncement(
  authorUsername: string,
  id: string
): { success: boolean; message: string } {
  if (!isOwner(authorUsername)) {
    return { success: false, message: 'Only @envixyy can delete announcements.' };
  }

  const list = getAnnouncements();
  const updated = list.filter(a => a.id !== id);
  saveAnnouncements(updated);
  return { success: true, message: 'Announcement deleted.' };
}

export const SEVERITY_STYLES: Record<AnnouncementSeverity, { bar: string; bg: string; text: string; border: string }> = {
  celebration: {
    bar: 'bg-[#facc15]',
    bg: 'bg-[#facc15]/5',
    border: 'border-[#facc15]/20',
    text: 'text-[#facc15]',
  },
  info: {
    bar: 'bg-blue-500',
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
  },
  warning: {
    bar: 'bg-amber-500',
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
  },
  critical: {
    bar: 'bg-red-500',
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    text: 'text-red-400',
  },
};
