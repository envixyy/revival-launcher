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
