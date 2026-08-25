/**
 * Revival Network — Subscription & Custom Perks System
 *
 * Admins & Owners can grant subscriptions (Revival Plus / Pro / Supporter)
 * to any player, unlocking custom image banners, custom image profile pictures (PFPs),
 * animated nameplates, and special subscriber badges.
 */

export type SubscriptionTier = 'plus' | 'pro' | 'supporter' | 'none';

export interface UserSubscription {
  username: string;
  active: boolean;
  tier: SubscriptionTier;
  grantedBy: string;
  grantedAt: number;
  customBannerUrl?: string;
  customAvatarUrl?: string;
  nitroBadge?: string;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, {
  name: string;
  tag: string;
  description: string;
  color: string;
  badgeStyle: string;
  perks: string[];
}> = {
  plus: {
    name: 'Revival PLUS+',
    tag: 'PLUS+',
    description: 'Custom HD Banners, Custom PFPs, Golden Glow and 100+ Cloud Mod Sync',
    color: '#facc15',
    badgeStyle: 'bg-gradient-to-r from-amber-500/20 to-yellow-400/20 text-yellow-300 border border-yellow-400/40 shadow-sm shadow-yellow-500/20',
    perks: ['Custom image banners (GIF / PNG / JPG)', 'Custom image profile pictures', 'Golden Nameplate Glow', 'Priority Instance Downloads'],
  },
  pro: {
    name: 'Revival PRO',
    tag: 'PRO',
    description: 'Ultimate Modder Perks, Custom CSS Themes, Animated Banners & Early Beta Access',
    color: '#a855f7',
    badgeStyle: 'bg-gradient-to-r from-purple-500/20 to-indigo-400/20 text-purple-300 border border-purple-400/40 shadow-sm shadow-purple-500/20',
    perks: ['All PLUS+ Perks', 'Animated GIF Banners', 'PRO Developer Profile Badge', 'Direct Instance Share URLs'],
  },
  supporter: {
    name: 'Network Supporter',
    tag: 'SUPPORTER',
    description: 'Community VIP booster supporting open-source development',
    color: '#ec4899',
    badgeStyle: 'bg-gradient-to-r from-pink-500/20 to-rose-400/20 text-pink-300 border border-pink-400/40 shadow-sm shadow-pink-500/20',
    perks: ['Custom image banners & PFPs', 'Supporter Badge', 'Exclusive Discord Role'],
  },
  none: {
    name: 'Free Tier',
    tag: 'STANDARD',
    description: 'Standard launcher member',
    color: '#6b7280',
    badgeStyle: 'bg-gray-800 text-gray-400 border border-gray-700',
    perks: ['Unlimited Instances', 'Modrinth & CurseForge Access', 'P2P Messaging'],
  },
};

export function getSubscription(username: string): UserSubscription {
  if (!username) {
    return { username: '', active: false, tier: 'none', grantedBy: 'system', grantedAt: 0 };
  }

  const key = `revival_sub_${username.toLowerCase()}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}

  // Owners & envixyy get Pro+ by default
  const lower = username.toLowerCase();
  if (lower === 'envixyy' || lower === 'vix' || lower === 'revival' || lower === 'admin') {
    return {
      username,
      active: true,
      tier: 'pro',
      grantedBy: 'Founder Authority',
      grantedAt: Date.now(),
      customBannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    };
  }

  return {
    username,
    active: false,
    tier: 'none',
    grantedBy: 'system',
    grantedAt: 0,
  };
}

export function saveSubscription(sub: UserSubscription): void {
  if (!sub.username) return;
  const key = `revival_sub_${sub.username.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(sub));
}

export function grantSubscription(
  targetUsername: string,
  tier: SubscriptionTier,
  adminUsername: string
): UserSubscription {
  const existing = getSubscription(targetUsername);
  const updated: UserSubscription = {
    ...existing,
    username: targetUsername.toLowerCase().trim(),
    active: tier !== 'none',
    tier,
    grantedBy: adminUsername,
    grantedAt: Date.now(),
  };
  saveSubscription(updated);
  return updated;
}

export function revokeSubscription(targetUsername: string): void {
  const existing = getSubscription(targetUsername);
  const updated: UserSubscription = {
    ...existing,
    active: false,
    tier: 'none',
    grantedBy: 'revoked',
  };
  saveSubscription(updated);
}

export function canUseCustomImages(username: string): boolean {
  const sub = getSubscription(username);
  return sub.active && sub.tier !== 'none';
}
