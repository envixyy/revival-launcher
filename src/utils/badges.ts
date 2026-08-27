/**
 * Revival Network — Role Badge System
 * Uses modern Lucide vector icon names instead of emojis.
 */

export type BadgeRole = 'owner' | 'developer' | 'admin' | 'moderator' | 'supporter' | 'early_access' | 'plus' | 'contributor';

export interface Badge {
  role: BadgeRole;
  label: string;
  /** Tailwind badge styling */
  style: string;
  /** Lucide icon identifier */
  iconName: 'Crown' | 'Code2' | 'Shield' | 'ShieldCheck' | 'Sparkles' | 'Gem' | 'Star' | 'GitMerge';
  /** Tooltip description */
  description: string;
  glowColor?: string;
}

export const BADGE_DEFS: Record<BadgeRole, Badge> = {
  owner: {
    role: 'owner',
    label: 'Owner',
    style: 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-500/20',
    iconName: 'Crown',
    description: 'Revival Network Owner & Founder',
    glowColor: '#f59e0b',
  },
  developer: {
    role: 'developer',
    label: 'Developer',
    style: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/20',
    iconName: 'Code2',
    description: 'Core Software Engineer & Modder',
    glowColor: '#06b6d4',
  },
  admin: {
    role: 'admin',
    label: 'Admin',
    style: 'bg-rose-500/20 text-rose-300 border border-rose-400/40 shadow-sm shadow-rose-500/20',
    iconName: 'Shield',
    description: 'System Administrator',
    glowColor: '#f43f5e',
  },
  moderator: {
    role: 'moderator',
    label: 'Moderator',
    style: 'bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm shadow-purple-500/20',
    iconName: 'ShieldCheck',
    description: 'Community & Server Moderator',
    glowColor: '#a855f7',
  },
  contributor: {
    role: 'contributor',
    label: 'Contributor',
    style: 'bg-orange-500/20 text-orange-300 border border-orange-400/40 shadow-sm shadow-orange-500/20',
    iconName: 'GitMerge',
    description: 'Open Source Contributor to Revival',
    glowColor: '#f97316',
  },
  supporter: {
    role: 'supporter',
    label: 'Supporter',
    style: 'bg-pink-500/20 text-pink-300 border border-pink-400/40 shadow-sm shadow-pink-500/20',
    iconName: 'Sparkles',
    description: 'Revival Network Supporter & Booster',
    glowColor: '#ec4899',
  },
  early_access: {
    role: 'early_access',
    label: 'VIP',
    style: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm shadow-emerald-500/20',
    iconName: 'Gem',
    description: 'Early Access Member',
    glowColor: '#10b981',
  },
  plus: {
    role: 'plus',
    label: 'PLUS+',
    style: 'bg-gradient-to-r from-yellow-500/25 to-amber-500/20 text-yellow-300 border border-yellow-400/50 shadow-sm shadow-yellow-500/30 font-black',
    iconName: 'Star',
    description: 'Revival PLUS+ Subscriber',
    glowColor: '#facc15',
  },
};

const DEFAULT_ROLE_MAP: Record<string, BadgeRole[]> = {
  envixyy: ['owner', 'developer', 'admin', 'plus'],
  vix: ['owner', 'developer', 'admin', 'plus'],
  revival: ['owner', 'developer', 'plus'],
};

export function getUnlockedBadges(username: string): Badge[] {
  if (!username) return [];
  const lower = username.toLowerCase().trim();
  try {
    const saved = localStorage.getItem(`revival_badges_${lower}`);
    if (saved) {
      const roles: BadgeRole[] = JSON.parse(saved);
      if (Array.isArray(roles)) {
        return roles.map(r => BADGE_DEFS[r]).filter(Boolean);
      }
    }
  } catch {}

  const defaultRoles = DEFAULT_ROLE_MAP[lower] || [];
  return defaultRoles.map(r => BADGE_DEFS[r]).filter(Boolean);
}

export function saveBadgesForUser(username: string, roles: BadgeRole[]) {
  if (!username) return;
  try {
    localStorage.setItem(`revival_badges_${username.toLowerCase().trim()}`, JSON.stringify(roles));
  } catch {}
}

export function getBadgesForUser(username: string): Badge[] {
  if (!username) return [];
  const lower = username.toLowerCase().trim();
  const unlocked = getUnlockedBadges(username);
  const unlockedRoles = unlocked.map(b => b.role);

  try {
    const saved = localStorage.getItem(`revival_displayed_badges_${lower}`);
    if (saved) {
      const roles: BadgeRole[] = JSON.parse(saved);
      // Filter out any roles the user does not have unlocked
      const validRoles = roles.filter(r => unlockedRoles.includes(r));
      if (validRoles.length > 0) {
        return validRoles.map(r => BADGE_DEFS[r]).filter(Boolean);
      }
    }
  } catch {}

  return unlocked;
}

export function saveDisplayedBadges(username: string, roles: BadgeRole[]) {
  if (!username) return;
  const lower = username.toLowerCase().trim();
  const unlocked = getUnlockedBadges(username).map(b => b.role);
  const validRoles = roles.filter(r => unlocked.includes(r));
  try {
    localStorage.setItem(`revival_displayed_badges_${lower}`, JSON.stringify(validRoles));
  } catch {}
}

export function isAdminOrOwner(username: string): boolean {
  if (!username) return false;
  const badges = getBadgesForUser(username);
  return badges.some(b => b.role === 'owner' || b.role === 'admin' || b.role === 'developer');
}

export function getRoleTag(username: string): { tag: string; colorClass: string; role: BadgeRole } | null {
  if (!username) return null;
  const badges = getBadgesForUser(username);
  if (badges.some(b => b.role === 'owner')) {
    return { tag: '[Owner]', colorClass: 'text-amber-400 font-black tracking-wide', role: 'owner' };
  }
  if (badges.some(b => b.role === 'developer')) {
    return { tag: '[Dev]', colorClass: 'text-cyan-400 font-black tracking-wide', role: 'developer' };
  }
  if (badges.some(b => b.role === 'admin')) {
    return { tag: '[Admin]', colorClass: 'text-rose-400 font-black tracking-wide', role: 'admin' };
  }
  if (badges.some(b => b.role === 'moderator')) {
    return { tag: '[Mod]', colorClass: 'text-purple-400 font-black tracking-wide', role: 'moderator' };
  }
  if (badges.some(b => b.role === 'contributor')) {
    return { tag: '[Contributor]', colorClass: 'text-orange-400 font-black tracking-wide', role: 'contributor' };
  }
  return null;
}

export function formatDisplayNameWithTag(displayName: string, username: string): string {
  const roleTag = getRoleTag(username);
  if (!roleTag) return displayName;
  const cleanName = displayName.replace(/^\[(Owner|Dev|Admin|Mod|Contributor)\]\s*/i, '').trim();
  return `${roleTag.tag} ${cleanName}`;
}
