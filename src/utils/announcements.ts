/**
 * Revival Network — Platform-wide Announcements
 * These appear as banners in the launcher Dashboard.
 * In production, fetch these from your API. For now they are static.
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

export const PLATFORM_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-001',
    severity: 'celebration',
    title: '🎉 Revival Launcher v1.0 is LIVE!',
    body: 'We officially launched today. Add friends, manage instances, and discover modpacks — all in one place.',
    date: 'Today',
    url: 'https://github.com',
    urlLabel: 'See changelog',
  },
  {
    id: 'ann-002',
    severity: 'info',
    title: 'Minecraft 1.21.4 + Fabric 0.16 supported',
    body: 'Create a new instance and select 1.21.4 to get started with the latest version.',
    date: 'Aug 25',
  },
  {
    id: 'ann-003',
    severity: 'warning',
    title: 'Scheduled maintenance — Aug 28 at 2AM EST',
    body: 'The Revival Network API will be briefly offline. Existing instances will still launch normally.',
    date: 'Aug 26',
  },
];

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
