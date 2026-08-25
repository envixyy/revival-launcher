import {
  Gamepad2, Shield, Zap, Flame, Sparkles, Compass,
  Swords, Terminal, Bot, Crown, Rocket, Star, User
} from 'lucide-react';

export const ICON_AVATARS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  crown: { label: 'Crown', icon: Crown, color: '#facc15', bg: 'bg-amber-500/20 text-amber-300' },
  swords: { label: 'Combat', icon: Swords, color: '#ef4444', bg: 'bg-red-500/20 text-red-300' },
  zap: { label: 'Lightning', icon: Zap, color: '#38bdf8', bg: 'bg-sky-500/20 text-sky-300' },
  gamepad: { label: 'Gamer', icon: Gamepad2, color: '#a855f7', bg: 'bg-purple-500/20 text-purple-300' },
  shield: { label: 'Guardian', icon: Shield, color: '#10b981', bg: 'bg-emerald-500/20 text-emerald-300' },
  flame: { label: 'Fire', icon: Flame, color: '#f97316', bg: 'bg-orange-500/20 text-orange-300' },
  sparkles: { label: 'Magic', icon: Sparkles, color: '#ec4899', bg: 'bg-pink-500/20 text-pink-300' },
  terminal: { label: 'Hacker', icon: Terminal, color: '#22c55e', bg: 'bg-green-500/20 text-green-300' },
  bot: { label: 'Android', icon: Bot, color: '#6366f1', bg: 'bg-indigo-500/20 text-indigo-300' },
  rocket: { label: 'Explorer', icon: Rocket, color: '#eab308', bg: 'bg-yellow-500/20 text-yellow-300' },
  compass: { label: 'Navigator', icon: Compass, color: '#14b8a6', bg: 'bg-teal-500/20 text-teal-300' },
  star: { label: 'Star', icon: Star, color: '#f59e0b', bg: 'bg-amber-500/20 text-amber-300' },
};

interface UserAvatarProps {
  avatarKeyOrUrl?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isSubscribed?: boolean;
}

export function UserAvatar({
  avatarKeyOrUrl = 'crown',
  name = 'Player',
  size = 'md',
  className = '',
  isSubscribed = false,
}: UserAvatarProps) {
  const sizeMap = {
    sm: 'w-7 h-7 rounded-lg text-xs',
    md: 'w-9 h-9 rounded-xl text-sm',
    lg: 'w-12 h-12 rounded-2xl text-base',
    xl: 'w-20 h-20 rounded-2xl text-2xl',
  };

  const iconSizeMap = {
    sm: 14,
    md: 18,
    lg: 24,
    xl: 40,
  };

  // Check if it's an external custom image URL or base64
  const isCustomImage = avatarKeyOrUrl && (
    avatarKeyOrUrl.startsWith('http://') ||
    avatarKeyOrUrl.startsWith('https://') ||
    avatarKeyOrUrl.startsWith('data:image/')
  );

  if (isCustomImage) {
    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        <img
          src={avatarKeyOrUrl}
          alt={name}
          className={`${sizeMap[size]} object-cover border border-[#343744] shadow-md ${
            isSubscribed ? 'ring-2 ring-[#facc15] shadow-yellow-500/20' : ''
          }`}
          onError={(e) => {
            // fallback to letter if broken URL
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Check if it matches one of our clean vector icon avatar keys
  const iconDef = ICON_AVATARS[avatarKeyOrUrl.toLowerCase()];
  if (iconDef) {
    const IconComp = iconDef.icon;
    return (
      <div
        className={`${sizeMap[size]} ${iconDef.bg} border border-white/10 flex items-center justify-center shadow-md flex-shrink-0 select-none ${
          isSubscribed ? 'ring-2 ring-[#facc15] shadow-yellow-500/20' : ''
        } ${className}`}
      >
        <IconComp size={iconSizeMap[size]} />
      </div>
    );
  }

  // Fallback: Initial letter with styled colored background
  const colors = ['#b45309', '#1d4ed8', '#7c3aed', '#be185d', '#0f766e', '#065f46', '#7c2d12'];
  const idx = (name || '?').charCodeAt(0) % colors.length;

  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center font-black text-white border border-white/10 shadow-md flex-shrink-0 select-none ${
        isSubscribed ? 'ring-2 ring-[#facc15] shadow-yellow-500/20' : ''
      } ${className}`}
      style={{ background: colors[idx] }}
    >
      <User size={iconSizeMap[size]} />
    </div>
  );
}
