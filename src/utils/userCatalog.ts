/**
 * Revival Network — Global User Catalog & Fortnite-style Social System
 *
 * Real players directory, friend requests, activity tracking, and
 * authority management strictly restricted to "envixyy".
 */

import { BadgeRole, getBadgesForUser, saveBadgesForUser } from './badges';

export interface CatalogUser {
  username: string;
  displayName: string;
  avatar: string;
  status: string;
  activity: string; // e.g. "Playing Fabric 1.20.1", "In Main Menu", "Crafting Mods"
  isOnline: boolean;
  joinedAt: number;
  roles?: BadgeRole[];
  bannerUrl?: string;
}

export interface FriendRequest {
  id: string;
  fromUsername: string;
  toUsername: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
}

const DEFAULT_NETWORK_CATALOG: CatalogUser[] = [
  {
    username: 'envixyy',
    displayName: 'envixyy',
    avatar: 'crown',
    status: 'Building the future of Minecraft Launchers',
    activity: 'Revival Network Core',
    isOnline: true,
    joinedAt: Date.now() - 86400000 * 30,
    roles: ['owner', 'developer', 'admin', 'plus'],
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  },
  {
    username: 'zemmbyy',
    displayName: 'zemmbyy',
    avatar: 'zap',
    status: 'Hypixel Bedwars & Cobblemon grinder',
    activity: 'Playing Cobblemon 1.20.1',
    isOnline: true,
    joinedAt: Date.now() - 86400000 * 14,
    roles: ['early_access'],
  },
  {
    username: 'vix',
    displayName: 'vix',
    avatar: 'terminal',
    status: 'Dev mode active',
    activity: 'Coding Modpack Importer',
    isOnline: true,
    joinedAt: Date.now() - 86400000 * 25,
    roles: ['developer'],
  },
  {
    username: 'alex_miner',
    displayName: 'Alex',
    avatar: 'swords',
    status: 'Survival SMP with friends',
    activity: 'Playing Origin Realms',
    isOnline: true,
    joinedAt: Date.now() - 86400000 * 10,
    roles: ['supporter'],
  },
  {
    username: 'shadow_steve',
    displayName: 'ShadowSteve',
    avatar: 'flame',
    status: 'Speedrunning 1.21.4',
    activity: 'In Main Menu',
    isOnline: false,
    joinedAt: Date.now() - 86400000 * 8,
    roles: ['early_access'],
  },
  {
    username: 'craftking',
    displayName: 'CraftKing99',
    avatar: 'gamepad',
    status: 'Fabulously Optimized FPS testing',
    activity: 'Playing Fabulously Optimized',
    isOnline: true,
    joinedAt: Date.now() - 86400000 * 5,
    roles: ['early_access'],
  },
  {
    username: 'pixel_hero',
    displayName: 'PixelHero',
    avatar: 'rocket',
    status: 'Custom shaders & textures',
    activity: 'In Lobby',
    isOnline: false,
    joinedAt: Date.now() - 86400000 * 3,
    roles: ['early_access'],
  },
];

export function getNetworkCatalog(): CatalogUser[] {
  try {
    const saved = localStorage.getItem('revival_user_catalog');
    if (saved) {
      const parsed: CatalogUser[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  localStorage.setItem('revival_user_catalog', JSON.stringify(DEFAULT_NETWORK_CATALOG));
  return DEFAULT_NETWORK_CATALOG;
}

export function saveNetworkCatalog(catalog: CatalogUser[]): void {
  localStorage.setItem('revival_user_catalog', JSON.stringify(catalog));
}

export function registerUserInCatalog(user: { username: string; displayName: string; avatar: string }): CatalogUser {
  const catalog = getNetworkCatalog();
  const lower = user.username.toLowerCase().trim();
  const existingIdx = catalog.findIndex(u => u.username.toLowerCase() === lower);

  const existingRoles = getBadgesForUser(lower).map(b => b.role);

  const entry: CatalogUser = {
    username: lower,
    displayName: user.displayName || user.username,
    avatar: user.avatar || 'crown',
    status: localStorage.getItem('revival_user_status') || 'Exploring Revival Launcher',
    activity: 'In Launcher Lobby',
    isOnline: true,
    joinedAt: existingIdx >= 0 ? catalog[existingIdx].joinedAt : Date.now(),
    roles: existingRoles,
  };

  if (existingIdx >= 0) {
    catalog[existingIdx] = { ...catalog[existingIdx], ...entry };
  } else {
    catalog.unshift(entry);
  }

  saveNetworkCatalog(catalog);
  return entry;
}

/**
 * ONLY user "envixyy" has authority to assign roles!
 */
export function canAssignRoles(currentUsername?: string): boolean {
  if (!currentUsername) return false;
  return currentUsername.toLowerCase().trim() === 'envixyy';
}

/**
 * Assign role to target user — strictly restricted to envixyy
 */
export function assignUserRolesByOwner(
  adminUsername: string,
  targetUsername: string,
  newRoles: BadgeRole[]
): boolean {
  if (!canAssignRoles(adminUsername)) {
    console.warn(`Unauthorized role assignment attempt by @${adminUsername}`);
    return false;
  }

  const targetLower = targetUsername.toLowerCase().trim();
  saveBadgesForUser(targetLower, newRoles);

  // Update user in catalog
  const catalog = getNetworkCatalog();
  const userIdx = catalog.findIndex(u => u.username.toLowerCase() === targetLower);
  if (userIdx >= 0) {
    catalog[userIdx].roles = newRoles;
    saveNetworkCatalog(catalog);
  }

  return true;
}

// ─── Friend Requests System ───────────────────────────────────

export function getFriendRequests(myUsername: string): { incoming: FriendRequest[]; outgoing: FriendRequest[] } {
  try {
    const saved: FriendRequest[] = JSON.parse(localStorage.getItem('revival_friend_requests') || '[]');
    const myLower = myUsername.toLowerCase();
    return {
      incoming: saved.filter(r => r.toUsername.toLowerCase() === myLower && r.status === 'pending'),
      outgoing: saved.filter(r => r.fromUsername.toLowerCase() === myLower && r.status === 'pending'),
    };
  } catch {
    return { incoming: [], outgoing: [] };
  }
}

export function sendFriendRequest(fromUser: string, toUser: string): { success: boolean; message: string } {
  const fromLower = fromUser.toLowerCase().trim();
  const toLower = toUser.toLowerCase().trim();

  if (!toLower) return { success: false, message: 'Enter a valid username.' };
  if (fromLower === toLower) return { success: false, message: "You can't add yourself." };

  const all: FriendRequest[] = JSON.parse(localStorage.getItem('revival_friend_requests') || '[]');
  
  // Check if already pending
  const existing = all.find(r => 
    ((r.fromUsername === fromLower && r.toUsername === toLower) ||
     (r.fromUsername === toLower && r.toUsername === fromLower)) &&
    r.status === 'pending'
  );

  if (existing) {
    return { success: false, message: 'Friend request already pending.' };
  }

  const req: FriendRequest = {
    id: `req_${Date.now()}_${Math.random()}`,
    fromUsername: fromLower,
    toUsername: toLower,
    timestamp: Date.now(),
    status: 'pending',
  };

  all.push(req);
  localStorage.setItem('revival_friend_requests', JSON.stringify(all));
  return { success: true, message: `Friend request sent to @${toLower}!` };
}

export function respondToFriendRequest(reqId: string, accept: boolean): boolean {
  const all: FriendRequest[] = JSON.parse(localStorage.getItem('revival_friend_requests') || '[]');
  const reqIdx = all.findIndex(r => r.id === reqId);
  if (reqIdx === -1) return false;

  const req = all[reqIdx];
  req.status = accept ? 'accepted' : 'declined';
  localStorage.setItem('revival_friend_requests', JSON.stringify(all));

  if (accept) {
    // Add to friends list for both
    const catalog = getNetworkCatalog();
    const friendObj = catalog.find(u => u.username === req.fromUsername);
    const friends = JSON.parse(localStorage.getItem('revival_friends') || '[]');
    if (!friends.some((f: any) => f.username === req.fromUsername)) {
      friends.push({
        username: req.fromUsername,
        displayName: friendObj?.displayName || req.fromUsername,
        avatar: friendObj?.avatar || 'zap',
        addedAt: Date.now(),
        status: friendObj?.status || 'Online',
      });
      localStorage.setItem('revival_friends', JSON.stringify(friends));
    }
  }

  return true;
}
