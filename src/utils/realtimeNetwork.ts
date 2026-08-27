/**
 * Revival Network — Multi-PC Realtime Synchronization Engine
 *
 * Connects Revival Launcher instances across different PCs over the internet
 * for real-time user discovery, friend requests, online status, direct messaging,
 * and owner role sync using low-latency HTTP SSE pub/sub.
 */

import { registerUserInCatalog, saveFriendsForUser, loadFriendsForUser, FriendRequest } from './userCatalog';
import { saveBadgesForUser, BadgeRole } from './badges';

const NTFY_TOPIC = 'https://ntfy.sh/revival_launcher_network_v2';
let activeUsername: string | null = null;
let heartbeatTimer: any = null;
let eventSource: EventSource | null = null;

export interface RealtimeEvent {
  type: 'PRESENCE' | 'FRIEND_REQUEST' | 'FRIEND_RESPONSE' | 'CHAT_MESSAGE' | 'ROLE_ASSIGN';
  sender: string;
  payload: any;
  timestamp: number;
}

/**
 * Initialize real-time multi-PC connection for the logged-in user.
 */
export function initRealtimeNetwork(user: { username: string; displayName: string; avatar: string } | null) {
  if (!user || !user.username) {
    stopRealtimeNetwork();
    return;
  }

  const username = user.username.toLowerCase().trim();
  if (activeUsername === username && eventSource) return;

  stopRealtimeNetwork();
  activeUsername = username;

  // 1. Register local user and send initial presence heartbeat
  broadcastPresence(user);

  // 2. Start periodic heartbeat every 20 seconds
  heartbeatTimer = setInterval(() => {
    broadcastPresence(user);
  }, 20000);

  // 3. Connect to SSE real-time stream
  try {
    eventSource = new EventSource(`${NTFY_TOPIC}/json`);

    eventSource.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        if (raw.event !== 'message' || !raw.message) return;
        const evt: RealtimeEvent = JSON.parse(raw.message);
        if (!evt || !evt.type || !evt.sender) return;

        // Ignore messages sent by self
        if (evt.sender.toLowerCase().trim() === username) return;

        handleIncomingEvent(username, evt);
      } catch (err) {
        // Silently handle parse noise
      }
    };

    eventSource.onerror = () => {
      // Reconnect handled automatically by EventSource
    };
  } catch (err) {
    console.warn('Realtime network stream connection warning:', err);
  }
}

/**
 * Stop real-time connection and timers.
 */
export function stopRealtimeNetwork() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  activeUsername = null;
}

/**
 * Broadcast an event over the multi-PC network.
 */
async function sendNetworkEvent(type: RealtimeEvent['type'], sender: string, payload: any) {
  const evt: RealtimeEvent = {
    type,
    sender: sender.toLowerCase().trim(),
    payload,
    timestamp: Date.now(),
  };

  try {
    await fetch(NTFY_TOPIC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evt),
    });
  } catch (err) {
    console.warn('Failed to broadcast realtime event:', err);
  }
}

/**
 * Broadcast online presence & status to all PCs.
 */
export function broadcastPresence(user: { username: string; displayName: string; avatar: string }) {
  const statusMsg = localStorage.getItem('revival_user_status') || 'Exploring Revival Launcher';
  const activityMsg = localStorage.getItem('revival_user_activity') || 'In Launcher Lobby';

  // Update local catalog
  registerUserInCatalog(user);

  sendNetworkEvent('PRESENCE', user.username, {
    username: user.username.toLowerCase().trim(),
    displayName: user.displayName || user.username,
    avatar: user.avatar || 'crown',
    status: statusMsg,
    activity: activityMsg,
    lastSeen: Date.now(),
  });
}

/**
 * Broadcast a new Friend Request across PCs.
 */
export function broadcastFriendRequest(fromUser: string, toUser: string, reqId: string) {
  sendNetworkEvent('FRIEND_REQUEST', fromUser, {
    id: reqId,
    fromUsername: fromUser.toLowerCase().trim(),
    toUsername: toUser.toLowerCase().trim(),
    timestamp: Date.now(),
  });
}

/**
 * Broadcast response to a Friend Request.
 */
export function broadcastFriendResponse(fromUser: string, toUser: string, reqId: string, accept: boolean) {
  sendNetworkEvent('FRIEND_RESPONSE', fromUser, {
    id: reqId,
    fromUsername: fromUser.toLowerCase().trim(),
    toUsername: toUser.toLowerCase().trim(),
    accept,
  });
}

/**
 * Broadcast a Chat Message across PCs.
 */
export function broadcastChatMessage(fromUser: string, toUser: string, msgObj: { id: string; sender: string; text: string; timestamp: number }) {
  sendNetworkEvent('CHAT_MESSAGE', fromUser, {
    toUsername: toUser.toLowerCase().trim(),
    msg: msgObj,
  });
}

/**
 * Broadcast owner role assignment across PCs.
 */
export function broadcastRoleAssign(adminUser: string, targetUser: string, roles: BadgeRole[]) {
  sendNetworkEvent('ROLE_ASSIGN', adminUser, {
    targetUsername: targetUser.toLowerCase().trim(),
    roles,
  });
}

/**
 * Handle incoming real-time network events from other PCs.
 */
function handleIncomingEvent(myUsername: string, evt: RealtimeEvent) {
  switch (evt.type) {
    case 'PRESENCE': {
      const p = evt.payload;
      if (p && p.username) {
        registerUserInCatalog({
          username: p.username,
          displayName: p.displayName || p.username,
          avatar: p.avatar || 'gamepad',
        });
        window.dispatchEvent(new CustomEvent('revival_network_updated', { detail: p }));
      }
      break;
    }

    case 'FRIEND_REQUEST': {
      const p = evt.payload;
      if (p && p.toUsername === myUsername) {
        // Save incoming request locally
        const raw = localStorage.getItem('revival_friend_requests');
        const all: FriendRequest[] = raw ? JSON.parse(raw) : [];
        if (!all.some(r => r.id === p.id)) {
          all.push({
            id: p.id,
            fromUsername: p.fromUsername,
            toUsername: p.toUsername,
            timestamp: p.timestamp || Date.now(),
            status: 'pending',
          });
          localStorage.setItem('revival_friend_requests', JSON.stringify(all));
          window.dispatchEvent(new CustomEvent('revival_friend_requests_updated', { detail: p }));
        }
      }
      break;
    }

    case 'FRIEND_RESPONSE': {
      const p = evt.payload;
      if (p && p.toUsername === myUsername && p.accept) {
        // Add sender to my friends list
        const currentFriends = loadFriendsForUser(myUsername);
        if (!currentFriends.some(f => f.username.toLowerCase() === p.fromUsername)) {
          currentFriends.push({
            username: p.fromUsername,
            displayName: p.fromUsername,
            avatar: 'gamepad',
            addedAt: Date.now(),
            status: 'Online',
          });
          saveFriendsForUser(myUsername, currentFriends);
          window.dispatchEvent(new CustomEvent('revival_friends_updated', { detail: p }));
        }
      }
      break;
    }

    case 'CHAT_MESSAGE': {
      const p = evt.payload;
      if (p && p.toUsername === myUsername && p.msg) {
        const sorted = [myUsername, evt.sender].sort();
        const chatKey = `revival_chat_${sorted[0]}_${sorted[1]}`;
        const raw = localStorage.getItem(chatKey);
        const msgs: any[] = raw ? JSON.parse(raw) : [];
        if (!msgs.some(m => m.id === p.msg.id)) {
          msgs.push(p.msg);
          localStorage.setItem(chatKey, JSON.stringify(msgs.slice(-500)));
          window.dispatchEvent(new CustomEvent('revival_chat_updated', { detail: { chatKey, msg: p.msg } }));
        }
      }
      break;
    }

    case 'ROLE_ASSIGN': {
      const p = evt.payload;
      if (p && p.targetUsername === myUsername && Array.isArray(p.roles)) {
        saveBadgesForUser(myUsername, p.roles);
        window.dispatchEvent(new CustomEvent('revival_badges_updated', { detail: p.roles }));
      }
      break;
    }
  }
}
