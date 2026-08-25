/**
 * Revival Launcher — Suggestions & Feature Request System
 *
 * Stores user suggestions, upvotes, status tags (Under Review, Planned, Added, Declined),
 * and comment threads in localStorage (`revival_suggestions`).
 */

export type SuggestionStatus = 'review' | 'planned' | 'added' | 'declined';

export interface SuggestionComment {
  id: string;
  author: string;
  displayName: string;
  avatar: string;
  text: string;
  createdAt: number;
  isOwner?: boolean;
}

export interface Suggestion {
  id: string;
  author: string;
  displayName: string;
  avatar: string;
  title: string;
  description: string;
  category: 'Feature' | 'Modpack' | 'UI/UX' | 'Bug' | 'Other';
  status: SuggestionStatus;
  statusNote?: string;
  upvotes: string[]; // array of usernames who upvoted
  comments: SuggestionComment[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'revival_suggestions';

export const STATUS_CONFIG: Record<SuggestionStatus, { label: string; icon: string; badgeClass: string; borderClass: string; bgClass: string }> = {
  review: {
    label: 'Under Review',
    icon: '📌',
    badgeClass: 'bg-[#2a2d3a] text-gray-300 border-[#3f4356]',
    borderClass: 'border-[#2c2e38]',
    bgClass: 'bg-[#15161c]',
  },
  planned: {
    label: 'Going to be Added',
    icon: '🚀',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-[#1a170d]',
  },
  added: {
    label: 'Has Been Added',
    icon: '✅',
    badgeClass: 'bg-green-500/20 text-green-300 border-green-500/40',
    borderClass: 'border-green-500/30',
    bgClass: 'bg-[#0e1813]',
  },
  declined: {
    label: 'Declined',
    icon: '❌',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    borderClass: 'border-red-500/30',
    bgClass: 'bg-[#180e0e]',
  },
};

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    id: 'sug-1',
    author: 'envixyy',
    displayName: 'envixyy',
    avatar: 'crown',
    title: 'Custom Instance Icons & Base64 Image Uploads',
    description: 'Allow users to select custom images for their instances directly inside instance settings.',
    category: 'Feature',
    status: 'added',
    statusNote: 'Implemented in v0.2.4 update!',
    upvotes: ['envixyy'],
    comments: [
      {
        id: 'c-1',
        author: 'envixyy',
        displayName: 'envixyy',
        avatar: 'crown',
        text: 'This is now live in the latest launcher release!',
        createdAt: Date.now() - 3600000,
        isOwner: true,
      },
    ],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'sug-2',
    author: 'envixyy',
    displayName: 'envixyy',
    avatar: 'crown',
    title: 'Dynamic Modrinth Mod Search & Bulk Metadata Icons',
    description: 'Fetch project icons and titles automatically from Modrinth API for local mods and cache them globally.',
    category: 'Modpack',
    status: 'added',
    statusNote: 'Added in v0.2.4!',
    upvotes: ['envixyy'],
    comments: [],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 7200000,
  },
  {
    id: 'sug-3',
    author: 'envixyy',
    displayName: 'envixyy',
    avatar: 'crown',
    title: 'Full Discord-Style Friends Hub & Direct Messaging',
    description: 'A dedicated Friends page with real-time sync, custom profile previews, and instant messaging.',
    category: 'UI/UX',
    status: 'planned',
    statusNote: 'Currently in active development for the v0.3.0 milestone.',
    upvotes: ['envixyy'],
    comments: [],
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 3600000,
  },
];

export function getSuggestions(): Suggestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUGGESTIONS));
      return DEFAULT_SUGGESTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SUGGESTIONS;
  }
}

export function saveSuggestions(list: Suggestion[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function createSuggestion(
  author: { username: string; displayName: string; avatar: string },
  title: string,
  description: string,
  category: Suggestion['category']
): Suggestion {
  const list = getSuggestions();
  const newSug: Suggestion = {
    id: `sug-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    author: author.username,
    displayName: author.displayName,
    avatar: author.avatar,
    title: title.trim(),
    description: description.trim(),
    category,
    status: 'review',
    upvotes: [author.username],
    comments: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updated = [newSug, ...list];
  saveSuggestions(updated);
  return newSug;
}

export function toggleUpvote(suggestionId: string, username: string): Suggestion[] {
  const list = getSuggestions();
  const updated = list.map(s => {
    if (s.id === suggestionId) {
      const upvoted = s.upvotes.includes(username);
      const newUpvotes = upvoted
        ? s.upvotes.filter(u => u !== username)
        : [...s.upvotes, username];
      return { ...s, upvotes: newUpvotes };
    }
    return s;
  });

  saveSuggestions(updated);
  return updated;
}

export function updateSuggestionStatusByOwner(
  ownerUsername: string,
  suggestionId: string,
  status: SuggestionStatus,
  statusNote?: string
): Suggestion[] {
  if (ownerUsername.toLowerCase() !== 'envixyy') return getSuggestions();

  const list = getSuggestions();
  const updated = list.map(s => {
    if (s.id === suggestionId) {
      return {
        ...s,
        status,
        statusNote: statusNote !== undefined ? statusNote.trim() : s.statusNote,
        updatedAt: Date.now(),
      };
    }
    return s;
  });

  saveSuggestions(updated);
  return updated;
}

export function deleteSuggestionByOwner(ownerUsername: string, suggestionId: string): Suggestion[] {
  if (ownerUsername.toLowerCase() !== 'envixyy') return getSuggestions();

  const list = getSuggestions();
  const updated = list.filter(s => s.id !== suggestionId);
  saveSuggestions(updated);
  return updated;
}

export function addSuggestionComment(
  suggestionId: string,
  author: { username: string; displayName: string; avatar: string },
  text: string
): Suggestion[] {
  const list = getSuggestions();
  const updated = list.map(s => {
    if (s.id === suggestionId) {
      const newComment: SuggestionComment = {
        id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        author: author.username,
        displayName: author.displayName,
        avatar: author.avatar,
        text: text.trim(),
        createdAt: Date.now(),
        isOwner: author.username.toLowerCase() === 'envixyy',
      };
      return {
        ...s,
        comments: [...s.comments, newComment],
        updatedAt: Date.now(),
      };
    }
    return s;
  });

  saveSuggestions(updated);
  return updated;
}

// ─── Roadmap System (Owner-Only Posts) ───────────────────────────────────────

export type RoadmapPhase = 'now' | 'next' | 'later' | 'done';

export interface RoadmapPost {
  id: string;
  phase: RoadmapPhase;
  title: string;
  body: string;
  tag?: string; // e.g. "v0.3.1", "PLUS+", "Multiplayer"
  createdAt: number;
  updatedAt: number;
}

const ROADMAP_KEY = 'revival_roadmap';

export const PHASE_CONFIG: Record<RoadmapPhase, { label: string; icon: string; color: string; border: string; bg: string }> = {
  now:   { label: 'In Progress',    icon: '⚡', color: 'text-[#facc15]',  border: 'border-[#facc15]/40',  bg: 'bg-[#facc15]/5' },
  next:  { label: 'Coming Soon',    icon: '🚀', color: 'text-blue-400',   border: 'border-blue-500/30',   bg: 'bg-blue-500/5' },
  later: { label: 'Planned',        icon: '📋', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/5' },
  done:  { label: 'Shipped',        icon: '✅', color: 'text-green-400',  border: 'border-green-500/30',  bg: 'bg-green-500/5' },
};

const DEFAULT_ROADMAP: RoadmapPost[] = [
  {
    id: 'road-1',
    phase: 'now',
    title: 'Social Hub & Friends System',
    body: 'Real-time friend list, direct messages, user profiles, and community suggestions forum — all shipping in v0.3.0.',
    tag: 'v0.3.0',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'road-2',
    phase: 'next',
    title: 'PLUS+ Custom Profile Banners & Animated Avatars',
    body: 'PLUS+ subscribers will be able to upload GIF banners, custom PFPs, and unlock animated profile effects.',
    tag: 'PLUS+',
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 43200000,
  },
  {
    id: 'road-3',
    phase: 'later',
    title: 'Revival Cloud Sync & Cross-Device Instance Backup',
    body: 'Sync your instances, mods, and settings across multiple computers via the Revival Cloud service.',
    tag: 'Cloud',
    createdAt: Date.now() - 21600000,
    updatedAt: Date.now() - 21600000,
  },
  {
    id: 'road-4',
    phase: 'done',
    title: 'Modrinth Integration & Mod Search',
    body: 'Full Modrinth mod browser with search, version filtering, and bulk icon metadata caching.',
    tag: 'v0.2.4',
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
  },
];

export function getRoadmap(): RoadmapPost[] {
  try {
    const raw = localStorage.getItem(ROADMAP_KEY);
    if (!raw) {
      localStorage.setItem(ROADMAP_KEY, JSON.stringify(DEFAULT_ROADMAP));
      return DEFAULT_ROADMAP;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ROADMAP;
  }
}

export function saveRoadmap(posts: RoadmapPost[]): void {
  localStorage.setItem(ROADMAP_KEY, JSON.stringify(posts));
}

export function addRoadmapPost(
  ownerUsername: string,
  phase: RoadmapPhase,
  title: string,
  body: string,
  tag?: string
): RoadmapPost[] | null {
  if (ownerUsername.toLowerCase() !== 'envixyy') return null;
  const list = getRoadmap();
  const post: RoadmapPost = {
    id: `road-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    phase,
    title: title.trim(),
    body: body.trim(),
    tag: tag?.trim() || undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const updated = [post, ...list];
  saveRoadmap(updated);
  return updated;
}

export function deleteRoadmapPost(ownerUsername: string, postId: string): RoadmapPost[] | null {
  if (ownerUsername.toLowerCase() !== 'envixyy') return null;
  const updated = getRoadmap().filter(p => p.id !== postId);
  saveRoadmap(updated);
  return updated;
}

export function editRoadmapPost(
  ownerUsername: string,
  postId: string,
  updates: Partial<Pick<RoadmapPost, 'phase' | 'title' | 'body' | 'tag'>>
): RoadmapPost[] | null {
  if (ownerUsername.toLowerCase() !== 'envixyy') return null;
  const updated = getRoadmap().map(p =>
    p.id === postId ? { ...p, ...updates, updatedAt: Date.now() } : p
  );
  saveRoadmap(updated);
  return updated;
}

