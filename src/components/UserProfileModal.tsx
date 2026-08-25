import { useEffect } from 'react';
import { X, Star, Clock, MessageSquare, Shield, Sparkles } from 'lucide-react';
import { getBadgesForUser, getRoleTag } from '../utils/badges';
import { getSubscription, SUBSCRIPTION_TIERS } from '../utils/subscription';
import { UserAvatar } from './UserAvatar';
import { BadgePill } from './BadgePill';
import { loadFriendsForUser } from '../utils/userCatalog';

interface UserProfileModalProps {
  username: string;
  displayName: string;
  avatar: string;
  onClose: () => void;
  onStartChat?: () => void;
}

export function UserProfileModal({ username, displayName, avatar, onClose, onStartChat }: UserProfileModalProps) {
  const badges = getBadgesForUser(username);
  const sub = getSubscription(username);
  const roleTag = getRoleTag(username);
  const hasSub = sub.active;

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load user status from localStorage
  const statusMsg = localStorage.getItem(`revival_status_${username}`) || 'Exploring modpacks on Revival...';
  const bannerUrl = sub.customBannerUrl || null;

  // Resolve best custom or fallback avatar
  let customAvatarUrl = sub.customAvatarUrl || null;
  if (!customAvatarUrl && avatar && (avatar.startsWith('http') || avatar.startsWith('data:image'))) {
    customAvatarUrl = avatar;
  }

  // Load join date from catalog
  let joinedLabel = 'Recently';
  try {
    const catalog = JSON.parse(localStorage.getItem('revival_user_catalog') || '[]');
    const found = catalog.find((u: any) => u.username?.toLowerCase() === username.toLowerCase());
    if (found?.joinedAt) {
      joinedLabel = new Date(found.joinedAt).toLocaleDateString([], { month: 'short', year: 'numeric' });
    }
  } catch { /* ignore */ }

  const statusColors: Record<string, string> = {
    online: 'bg-[#facc15]',
    idle: 'bg-amber-500',
    dnd: 'bg-red-500',
    offline: 'bg-gray-600',
  };
  const statusType = localStorage.getItem(`revival_status_type_${username}`) || 'online';
  const tierInfo = SUBSCRIPTION_TIERS[sub.tier === 'none' ? 'plus' : sub.tier];
  const userFriendsCount = loadFriendsForUser(username).length;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[88vh] flex flex-col bg-[#16171d] border border-[#2c2e38] rounded-3xl overflow-hidden shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header banner - Fixed Top */}
        <div
          className="h-40 w-full relative flex-shrink-0 bg-gradient-to-br from-[#1c1d22] via-[#14151b] to-[#0d0e12] border-b border-[#2c2e38]"
          style={{
            backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay for banner contrast */}
          {bannerUrl && <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />}

          {/* Prominent Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/75 hover:bg-black/90 text-white hover:scale-110 active:scale-95 transition-all z-30 shadow-xl border border-white/10"
            title="Close Profile (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* User profile layout — Scrollable Body */}
        <div className="px-7 pb-7 pt-0 relative flex-1 overflow-y-auto no-scrollbar">
          {/* Large Floating Avatar */}
          <div className="absolute -top-14 left-7 z-20">
            <div className="relative">
              <UserAvatar
                avatarKeyOrUrl={customAvatarUrl || avatar}
                name={displayName}
                size="xl"
                isSubscribed={hasSub}
                className="w-24 h-24 rounded-3xl shadow-2xl ring-4 ring-[#16171d]"
              />
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ring-4 ring-[#16171d] ${statusColors[statusType] || statusColors.online}`} />
            </div>
          </div>

          {/* Content */}
          <div className="pt-14 space-y-4">
            {/* Name, Tag & Username */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-black text-white leading-tight">
                    {displayName || username}
                  </h2>
                  {roleTag && (
                    <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-lg bg-black/60 border border-white/10 ${roleTag.colorClass}`}>
                      {roleTag.tag}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-bold mt-0.5">@{username}</p>
              </div>

              {hasSub && (
                <div className="flex items-center gap-1 bg-[#facc15]/10 border border-[#facc15]/30 text-[#facc15] px-3 py-1 rounded-xl text-xs font-black">
                  <Sparkles size={13} />
                  <span>{sub.tier === 'none' ? 'PLUS' : sub.tier.toUpperCase()} MEMBER</span>
                </div>
              )}
            </div>

            {/* Status Card */}
            <div className="bg-[#0d0e12] border border-[#2c2e38] rounded-2xl p-4 space-y-1 shadow-inner">
              <p className="text-[10px] uppercase font-black tracking-wider text-gray-500">Status Message</p>
              <p className="text-sm text-yellow-300 font-semibold italic">"{statusMsg}"</p>
            </div>

            {/* Active Badges */}
            <div className="space-y-2">
              <p className="text-xs uppercase font-black tracking-wider text-gray-400">Active Badges & Roles</p>
              {badges.length === 0 ? (
                <p className="text-xs text-gray-600 font-bold italic">No badges displayed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {badges.map(badge => (
                    <div
                      key={badge.role}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 shadow-sm text-xs font-bold text-gray-200"
                      title={badge.description}
                    >
                      <BadgePill badge={badge} size="md" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub Details Card */}
            {hasSub && (
              <div className="p-4 bg-gradient-to-r from-[#1c180d] via-[#16171e] to-[#15161c] border border-yellow-500/30 rounded-2xl flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#facc15]/10 border border-[#facc15]/30 text-[#facc15]">
                    <Star size={18} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-yellow-400">{tierInfo.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Premium Member Perks & Custom Assets Unlocked</p>
                  </div>
                </div>
                <span className="text-xs font-black tracking-wider bg-yellow-400/10 text-yellow-400 px-2.5 py-1 rounded-xl border border-yellow-400/20 uppercase">
                  {sub.tier === 'none' ? 'PLUS' : sub.tier.toUpperCase()}
                </span>
              </div>
            )}

            {/* Network Stats Card */}
            <div className="grid grid-cols-2 gap-3 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl p-4 text-center">
              <div>
                <p className="text-[10px] uppercase font-black tracking-wider text-gray-500">Total Friends</p>
                <p className="text-sm font-black text-white mt-1 flex items-center justify-center gap-1.5">
                  <Shield size={14} className="text-[#facc15]" />
                  {userFriendsCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-wider text-gray-500">Joined Network</p>
                <p className="text-sm font-black text-white mt-1 flex items-center justify-center gap-1.5">
                  <Clock size={14} className="text-gray-400" />
                  {joinedLabel}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {onStartChat && (
                <button
                  onClick={() => { onStartChat(); onClose(); }}
                  className="flex-1 py-3 bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageSquare size={16} />
                  Send Direct Message
                </button>
              )}
              <button
                onClick={onClose}
                className={`${onStartChat ? '' : 'flex-1 '}py-3 px-6 bg-[#20222a] border border-[#2c2e38] hover:bg-[#2c2e38] text-gray-300 hover:text-white text-xs font-black rounded-xl transition-all active:scale-95`}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
