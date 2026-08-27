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

/**
 * Catalog starts completely empty.
 * Real users are added only when they actually log into the launcher via registerUserInCatalog().
 */
const DEFAULT_NETWORK_CATALOG: CatalogUser[] = [];

// Version key — bump this whenever the catalog schema/defaults change to flush stale data
const CATALOG_VERSION = '2';

export function getNetworkCatalog(): CatalogUser[] {
  try {
    // If the stored version doesn't match, wipe the old catalog (removes fake users)
    const storedVersion = localStorage.getItem('revival_catalog_version');
    if (storedVersion !== CATALOG_VERSION) {
      localStorage.removeItem('revival_user_catalog');
      localStorage.setItem('revival_catalog_version', CATALOG_VERSION);
    }

    const saved = localStorage.getItem('revival_user_catalog');
    if (saved) {
      const parsed: CatalogUser[] = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
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

  try {
    const { broadcastRoleAssign } = require('./realtimeNetwork');
    broadcastRoleAssign(adminUsername, targetLower, newRoles);
  } catch {}

  return true;
}

// ─── Per-User Friends Storage ───────────────────────────────────

export interface StoredFriend {
  username: string;
  displayName: string;
  avatar: string;
  addedAt: number;
  status?: string;
}

export function loadFriendsForUser(username: string): StoredFriend[] {
  if (!username) return [];
  const lower = username.toLowerCase().trim();
  const key = `revival_friends_${lower}`;

  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);

    // Fallback: if user-specific key is empty, check legacy global key
    const globalSaved = localStorage.getItem('revival_friends');
    if (globalSaved) {
      const parsed: StoredFriend[] = JSON.parse(globalSaved);
      // Clean out self-friends if any existed in old database
      const cleaned = parsed.filter(f => f.username.toLowerCase().trim() !== lower);
      localStorage.setItem(key, JSON.stringify(cleaned));
      return cleaned;
    }
  } catch {}

  return [];
}

export function saveFriendsForUser(username: string, friends: StoredFriend[]): void {
  if (!username) return;
  const lower = username.toLowerCase().trim();
  // Filter out any self-friends
  const cleaned = friends.filter(f => f.username.toLowerCase().trim() !== lower);
  const key = `revival_friends_${lower}`;
  localStorage.setItem(key, JSON.stringify(cleaned));
  // Sync global fallback for backward compatibility
  localStorage.setItem('revival_friends', JSON.stringify(cleaned));
}

// ─── Friend Requests System ───────────────────────────────────

export function getFriendRequests(myUsername: string): { incoming: FriendRequest[]; outgoing: FriendRequest[] } {
  try {
    const saved: FriendRequest[] = JSON.parse(localStorage.getItem('revival_friend_requests') || '[]');
    const myLower = myUsername.toLowerCase().trim();
    return {
      incoming: saved.filter(r => r.toUsername.toLowerCase().trim() === myLower && r.status === 'pending'),
      outgoing: saved.filter(r => r.fromUsername.toLowerCase().trim() === myLower && r.status === 'pending'),
    };
  } catch {
    return { incoming: [], outgoing: [] };
  }
}

export function sendFriendRequest(fromUser: string, toUser: string): { success: boolean; message: string } {
  const fromLower = fromUser.toLowerCase().trim();
  const toLower = toUser.toLowerCase().trim();

  if (!toLower) return { success: false, message: 'Enter a valid username.' };
  if (fromLower === toLower) return { success: false, message: "You cannot add yourself as a friend." };

  // Check if already friends
  const currentFriends = loadFriendsForUser(fromLower);
  if (currentFriends.some(f => f.username.toLowerCase().trim() === toLower)) {
    return { success: false, message: `You are already friends with @${toLower}.` };
  }

  const all: FriendRequest[] = JSON.parse(localStorage.getItem('revival_friend_requests') || '[]');
  
  // Check if already pending
  const existing = all.find(r => 
    ((r.fromUsername.toLowerCase() === fromLower && r.toUsername.toLowerCase() === toLower) ||
     (r.fromUsername.toLowerCase() === toLower && r.toUsername.toLowerCase() === fromLower)) &&
    r.status === 'pending'
  );

  if (existing) {
    return { success: false, message: `Friend request already pending with @${toLower}.` };
  }

  const req: FriendRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    fromUsername: fromLower,
    toUsername: toLower,
    timestamp: Date.now(),
    status: 'pending',
  };

  all.push(req);
  localStorage.setItem('revival_friend_requests', JSON.stringify(all));

  // Broadcast friend request over multi-PC network
  try {
    const { broadcastFriendRequest } = require('./realtimeNetwork');
    broadcastFriendRequest(fromLower, toLower, req.id);
  } catch {}

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
    const catalog = getNetworkCatalog();
    const userA = req.fromUsername.toLowerCase().trim();
    const userB = req.toUsername.toLowerCase().trim();

    const objA = catalog.find(u => u.username.toLowerCase() === userA);
    const objB = catalog.find(u => u.username.toLowerCase() === userB);

    // Add userA to userB's friends list
    const friendsB = loadFriendsForUser(userB);
    if (!friendsB.some(f => f.username.toLowerCase() === userA)) {
      friendsB.push({
        username: userA,
        displayName: objA?.displayName || userA,
        avatar: objA?.avatar || 'crown',
        addedAt: Date.now(),
        status: objA?.status || 'Online',
      });
      saveFriendsForUser(userB, friendsB);
    }

    // Add userB to userA's friends list
    const friendsA = loadFriendsForUser(userA);
    if (!friendsA.some(f => f.username.toLowerCase() === userB)) {
      friendsA.push({
        username: userB,
        displayName: objB?.displayName || userB,
        avatar: objB?.avatar || 'crown',
        addedAt: Date.now(),
        status: objB?.status || 'Online',
      });
      saveFriendsForUser(userA, friendsA);
    }

    // Broadcast acceptance over multi-PC network
    try {
      const { broadcastFriendResponse } = require('./realtimeNetwork');
      broadcastFriendResponse(userB, userA, reqId, true);
    } catch {}
  }

  return true;
}
