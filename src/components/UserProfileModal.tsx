import { X, Star, Clock, MessageSquare } from 'lucide-react';
import { getBadgesForUser, getRoleTag } from '../utils/badges';
import { getSubscription, SUBSCRIPTION_TIERS } from '../utils/subscription';
import { UserAvatar } from './UserAvatar';
import { BadgePill } from './BadgePill';

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

  // Load user status from localStorage
  const statusMsg = localStorage.getItem(`revival_status_${username}`) || 'Exploring modpacks on Revival...';
  const bannerUrl = sub.customBannerUrl || null;
  const customAvatarUrl = sub.customAvatarUrl || null;

  // Load join date from catalog
  let joinedLabel = 'Recently';
  try {
    const catalog = JSON.parse(localStorage.getItem('revival_network_catalog') || '{}');
    const users: any[] = catalog.users || [];
    const found = users.find((u: any) => u.username?.toLowerCase() === username.toLowerCase());
    if (found?.registeredAt) {
      joinedLabel = new Date(found.registeredAt).toLocaleDateString([], { month: 'short', year: 'numeric' });
    }
  } catch { /* ignore */ }

  const statusColors: Record<string, string> = {
    online: 'bg-[#facc15]',
    idle: 'bg-amber-500',
    dnd: 'bg-red-500',
    offline: 'bg-gray-600',
  };
  const statusType = localStorage.getItem(`revival_status_type_${username}`) || 'online';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-[#16171d] border border-[#2c2e38] rounded-3xl overflow-hidden shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header banner */}
        <div
          className="h-28 w-full relative bg-gradient-to-br from-[#1c1d22] to-[#0d0e12] border-b border-[#2c2e38]"
          style={{
            backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Subtle overlay for readability */}
          {bannerUrl && <div className="absolute inset-0 bg-black/20" />}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-gray-400 hover:text-white transition-all z-20"
          >
            <X size={14} />
          </button>
        </div>

        {/* User profile layout */}
        <div className="px-5 pb-5 pt-0 relative">
          {/* Floating Avatar */}
          <div className="absolute -top-10 left-5">
            <div className="relative">
              <UserAvatar
                avatarKeyOrUrl={customAvatarUrl || avatar}
                name={displayName}
                size="xl"
                isSubscribed={hasSub}
              />
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-4 ring-[#16171d] ${statusColors[statusType] || statusColors.online}`} />
            </div>
          </div>

          {/* Content */}
          <div className="pt-14 space-y-3.5">
            {/* Name & username */}
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-lg font-black text-white leading-tight">
                  {displayName || username}
                </h2>
                {roleTag && (
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/50 border border-white/10 ${roleTag.colorClass}`}>
                    {roleTag.tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-bold">@{username}</p>
            </div>

            {/* Status card */}
            <div className="bg-[#0d0e12] border border-[#2c2e38] rounded-2xl p-3">
              <p className="text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">Status Message</p>
              <p className="text-xs text-yellow-300 font-semibold italic">"{statusMsg}"</p>
            </div>

            {/* Active Badges */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-black tracking-wider text-gray-500">Active Badges</p>
              {badges.length === 0 ? (
                <p className="text-[10px] text-gray-600 font-bold italic">No badges displayed.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {badges.map(badge => (
                    <div
                      key={badge.role}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/5 shadow-sm text-xs font-bold text-gray-300"
                      title={badge.description}
                    >
                      <BadgePill badge={badge} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub details card */}
            {hasSub && (
              <div className="p-3 bg-gradient-to-r from-[#1c180d] to-[#15161c] border border-yellow-500/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-[#facc15]" fill="currentColor" />
                  <div>
                    <p className="text-[10px] font-black text-yellow-400">Revival {SUBSCRIPTION_TIERS[sub.tier === 'none' ? 'plus' : sub.tier].name}</p>
                    <p className="text-[8px] text-gray-400 font-medium">Premium Member Perks Active</p>
                  </div>
                </div>
                <span className="text-[8px] font-black tracking-wider bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-400/20 uppercase">
                  {sub.tier === 'none' ? 'PLUS' : sub.tier.toUpperCase()}
                </span>
              </div>
            )}

            {/* Network stats card */}
            <div className="grid grid-cols-2 gap-2 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl p-3 text-center">
              <div>
                <p className="text-[9px] uppercase font-black tracking-wider text-gray-500">Friends</p>
                <p className="text-xs font-black text-white mt-0.5 flex items-center justify-center gap-1">
                  <Clock size={11} className="text-gray-400" />
                  {(() => {
                    try {
                      const friends = JSON.parse(localStorage.getItem('revival_friends') || '[]');
                      return friends.length;
                    } catch { return 0; }
                  })()}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-black tracking-wider text-gray-500">Joined Network</p>
                <p className="text-xs font-black text-white mt-0.5">{joinedLabel}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {onStartChat && (
                <button
                  onClick={() => { onStartChat(); onClose(); }}
                  className="flex-1 py-2.5 bg-[#facc15] hover:bg-yellow-300 text-black font-black text-xs rounded-xl shadow-md shadow-yellow-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <MessageSquare size={13} />
                  Send Message
                </button>
              )}
              <button
                onClick={onClose}
                className={`${onStartChat ? '' : 'flex-1 '}py-2.5 px-5 bg-[#20222a] border border-[#2c2e38] hover:bg-[#2c2e38] text-gray-300 hover:text-white text-xs font-black rounded-xl transition-all`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
