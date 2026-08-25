import { useState, useEffect } from 'react';
import {
  Save, Activity, Clock, ShieldCheck, LogOut, Award, Sparkles,
  Image as ImageIcon, Upload, Star, CheckCircle, ShieldAlert,
  Crown, Zap
} from 'lucide-react';
import { BADGE_DEFS, BadgeRole, getBadgesForUser, saveBadgesForUser, isAdminOrOwner } from '../utils/badges';
import {
  getSubscription, saveSubscription, grantSubscription,
  SUBSCRIPTION_TIERS, SubscriptionTier, canUseCustomImages
} from '../utils/subscription';
import { UserAvatar, ICON_AVATARS } from './UserAvatar';
import { BadgePill } from './BadgePill';

interface ProfileTabProps {
  user: { username: string; displayName: string; avatar: string };
  onUpdateUser: (user: { username: string; displayName: string; avatar: string }) => void;
  onSignOut?: () => void;
}

const PRESET_BANNERS = [
  { name: 'Nebula Gold', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Cyberpunk Grid', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Dark Aurora', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Obsidian Mountain', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80' },
];

export function ProfileTab({ user, onUpdateUser, onSignOut }: ProfileTabProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatar, setAvatar] = useState(user.avatar || 'crown');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [statusMsg, setStatusMsg] = useState('Exploring modpacks on Revival...');
  const [statusType, setStatusType] = useState<'online' | 'idle' | 'dnd' | 'offline'>('online');
  const [selectedRoles, setSelectedRoles] = useState<BadgeRole[]>([]);
  const [saved, setSaved] = useState(false);

  // Subscription state
  const [sub, setSub] = useState(getSubscription(user.username));

  // Admin Grant Tool state
  const [grantTarget, setGrantTarget] = useState('');
  const [grantTier, setGrantTier] = useState<SubscriptionTier>('plus');
  const [grantMessage, setGrantMessage] = useState('');

  const isAdmin = isAdminOrOwner(user.username);
  const hasSub = canUseCustomImages(user.username) || isAdmin;

  useEffect(() => {
    setDisplayName(user.displayName);
    setAvatar(user.avatar || 'crown');
    
    const savedStatus = localStorage.getItem('revival_user_status');
    if (savedStatus) setStatusMsg(savedStatus);
    const savedType = localStorage.getItem('revival_user_type');
    if (savedType) setStatusType(savedType as any);

    const userBadges = getBadgesForUser(user.username);
    setSelectedRoles(userBadges.map(b => b.role));

    const userSub = getSubscription(user.username);
    setSub(userSub);
    if (userSub.customBannerUrl) setBannerUrl(userSub.customBannerUrl);
    if (userSub.customAvatarUrl) setCustomAvatarUrl(userSub.customAvatarUrl);
  }, [user]);

  const toggleRole = (role: BadgeRole) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        if (prev.length <= 1) return prev;
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === 'avatar') {
        setCustomAvatarUrl(dataUrl);
        setAvatar(dataUrl);
      } else {
        setBannerUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveAvatar = customAvatarUrl.trim() || avatar;
    const updated = {
      username: user.username,
      displayName: displayName.trim() || user.username,
      avatar: effectiveAvatar,
    };

    localStorage.setItem('revival_user', JSON.stringify(updated));
    localStorage.setItem('revival_user_status', statusMsg);
    localStorage.setItem('revival_user_type', statusType);
    saveBadgesForUser(user.username, selectedRoles);

    // Save custom banner & avatar to subscription
    const updatedSub = {
      ...sub,
      customBannerUrl: bannerUrl.trim() || undefined,
      customAvatarUrl: customAvatarUrl.trim() || undefined,
    };
    saveSubscription(updatedSub);
    setSub(updatedSub);

    onUpdateUser(updated);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAdminGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantTarget.trim()) return;

    const targetUser = grantTarget.trim().toLowerCase();
    const granted = grantSubscription(targetUser, grantTier, user.username);
    
    // Also grant PLUS badge if tier is plus/pro
    if (grantTier === 'plus' || grantTier === 'pro') {
      const existingBadges = getBadgesForUser(targetUser).map(b => b.role);
      if (!existingBadges.includes('plus')) {
        saveBadgesForUser(targetUser, [...existingBadges, 'plus']);
      }
    }

    setGrantMessage(`Granted ${SUBSCRIPTION_TIERS[grantTier].name} to @${targetUser}!`);
    setGrantTarget('');
    setTimeout(() => setGrantMessage(''), 4000);

    if (targetUser === user.username.toLowerCase()) {
      setSub(granted);
    }
  };

  const statusColors = {
    online: 'bg-[#facc15]',
    idle: 'bg-amber-500',
    dnd: 'bg-red-500',
    offline: 'bg-gray-600',
  };

  const activeBadges = selectedRoles.map(r => BADGE_DEFS[r]).filter(Boolean);

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl pb-10">
      {/* Dynamic Profile Banner */}
      <div
        className="relative h-48 rounded-3xl overflow-hidden shadow-2xl p-6 flex flex-col justify-end border border-[#2c2e38] transition-all bg-[#121318]"
        style={{
          backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-[#0d0e12]/60 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex items-end gap-5">
          <div className="relative flex-shrink-0">
            <UserAvatar
              avatarKeyOrUrl={customAvatarUrl || avatar}
              name={displayName}
              size="xl"
              isSubscribed={hasSub}
            />
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-4 ring-[#0d0e12] ${statusColors[statusType]}`} />
          </div>

          <div className="pb-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white leading-tight truncate">
                {displayName || user.username}
              </h1>

              {/* Subscribed tag */}
              {hasSub && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/30 to-yellow-400/20 text-yellow-300 border border-yellow-400/50 shadow-sm shadow-yellow-500/20">
                  <Star size={11} fill="currentColor" />
                  {SUBSCRIPTION_TIERS[sub.tier === 'none' ? 'plus' : sub.tier].tag}
                </span>
              )}

              {/* Active Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {activeBadges.map(badge => (
                  <BadgePill key={badge.role} badge={badge} size="md" />
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-300 font-semibold">
              @{user.username} · <span className="text-[#facc15] italic font-normal">"{statusMsg}"</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form Column */}
        <form onSubmit={handleSave} className="md:col-span-2 space-y-5 bg-[#15161c] border border-[#2c2e38] p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2c2e38] pb-3">
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              <Sparkles size={16} className="text-[#facc15]" />
              Profile, Banners & Icons
            </h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Appearance</span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Display Name"
                  className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#facc15] font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Status Message
                </label>
                <input
                  type="text"
                  value={statusMsg}
                  onChange={e => setStatusMsg(e.target.value)}
                  placeholder="Playing Fabric 1.20.1..."
                  className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#facc15] font-semibold"
                />
              </div>
            </div>

            {/* Custom Banner Image Setting */}
            <div className="bg-[#0d0e12] border border-[#2c2e38] rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-[#facc15]" />
                  <span className="text-xs font-black text-white">Custom Profile Banner</span>
                </div>
                {hasSub ? (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                    Unlocked
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Plus+ Perk
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={e => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.gif or image URL"
                  className="flex-1 bg-[#15161c] border border-[#2c2e38] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#facc15] font-mono text-[11px]"
                />
                <label className="px-3 py-1.5 bg-[#20222a] hover:bg-[#2c2e38] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-[#2c2e38] flex-shrink-0">
                  <Upload size={12} />
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'banner')} />
                </label>
              </div>

              {/* Preset Banners */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[9px] text-gray-500 font-bold uppercase mr-1">Presets:</span>
                {PRESET_BANNERS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setBannerUrl(p.url)}
                    className="text-[9.5px] px-2 py-1 rounded-lg bg-[#181920] border border-[#2c2e38] text-gray-300 hover:text-[#facc15] hover:border-[#facc15]/40 transition-all font-semibold"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Avatar / Icon Picker */}
            <div className="bg-[#0d0e12] border border-[#2c2e38] rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Crown size={14} className="text-[#facc15]" />
                  Avatar Picture & Vector Icons
                </span>
                <span className="text-[9px] text-gray-400 font-bold">Vector & Custom Image</span>
              </div>

              {/* Vector Icon Pickers */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {Object.keys(ICON_AVATARS).map(key => {
                  const item = ICON_AVATARS[key];
                  const IconC = item.icon;
                  const isSelected = avatar === key && !customAvatarUrl;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setAvatar(key);
                        setCustomAvatarUrl('');
                      }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-[#1e202a] border-[#facc15] shadow-sm shadow-[#facc15]/20 text-white'
                          : 'bg-[#15161c] border-[#2c2e38] text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                        <IconC size={16} />
                      </div>
                      <span className="text-[9px] font-bold truncate max-w-full">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Image PFP upload */}
              <div className="pt-2 border-t border-[#2c2e38]/60 flex gap-2 items-center">
                <input
                  type="text"
                  value={customAvatarUrl}
                  onChange={e => setCustomAvatarUrl(e.target.value)}
                  placeholder="Custom PFP Image URL (https://...)"
                  className="flex-1 bg-[#15161c] border border-[#2c2e38] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#facc15] font-mono text-[11px]"
                />
                <label className="px-3 py-1.5 bg-[#20222a] hover:bg-[#2c2e38] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-[#2c2e38] flex-shrink-0">
                  <Upload size={12} />
                  Upload PFP
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'avatar')} />
                </label>
              </div>
            </div>

            {/* Badges Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Award size={13} className="text-[#facc15]" />
                Display Role Badges
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(BADGE_DEFS) as BadgeRole[]).map(role => {
                  const b = BADGE_DEFS[role];
                  const isSelected = selectedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                        isSelected
                          ? 'bg-[#1e2029] border-[#facc15] shadow-sm shadow-[#facc15]/10 text-white'
                          : 'bg-[#0d0e12] border-[#2c2e38] text-gray-400 hover:text-gray-200 hover:border-gray-600 opacity-60'
                      }`}
                    >
                      <BadgePill badge={b} size="sm" />
                      <span className="text-[9px] text-gray-500 truncate">{isSelected ? 'Active' : 'Toggle'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Presence selector */}
            <div className="pt-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                Presence Status
              </label>
              <select
                value={statusType}
                onChange={e => setStatusType(e.target.value as any)}
                className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl p-2.5 text-xs text-white outline-none cursor-pointer font-bold"
              >
                <option value="online">Online</option>
                <option value="idle">Away / Idle</option>
                <option value="dnd">Do Not Disturb</option>
                <option value="offline">Invisible / Offline</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-[#2c2e38]">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-black text-xs shadow-md shadow-yellow-500/20 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Save size={13} />
              Save Profile Changes
            </button>
            {saved && (
              <span className="text-xs text-green-400 font-bold animate-fade-in flex items-center gap-1">
                <ShieldCheck size={14} /> Profile & Banners saved!
              </span>
            )}
          </div>
        </form>

        {/* Right Column: Subscription & Admin Tool */}
        <div className="space-y-4">
          {/* Subscription Status Card */}
          <div className="bg-gradient-to-br from-[#1c180d] to-[#15161c] border border-yellow-500/30 p-5 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-[#facc15]" fill="currentColor" />
              <h4 className="font-black text-xs text-white">Revival Subscription Tier</h4>
            </div>

            <div className="mt-2 p-3 rounded-2xl bg-black/40 border border-yellow-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-yellow-300">
                  {SUBSCRIPTION_TIERS[sub.tier].name}
                </span>
                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  {hasSub ? 'ACTIVE' : 'FREE'}
                </span>
              </div>
              <p className="text-[10px] text-gray-300 mt-1.5 leading-relaxed">
                {SUBSCRIPTION_TIERS[sub.tier].description}
              </p>
            </div>

            <div className="mt-3 space-y-1.5 text-[10px] text-gray-400">
              {SUBSCRIPTION_TIERS[sub.tier === 'none' ? 'plus' : sub.tier].perks.map((p, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-gray-300">
                  <CheckCircle size={11} className="text-[#facc15] flex-shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Subscription Grant Panel */}
          {isAdmin && (
            <div className="bg-[#15161c] border border-purple-500/30 p-5 rounded-3xl shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2">
                <ShieldAlert size={16} className="text-purple-400" />
                <div>
                  <h4 className="font-black text-xs text-white">Admin Grant Console</h4>
                  <p className="text-[9px] text-purple-300 font-bold">Grant Subscriptions & Custom Perks</p>
                </div>
              </div>

              <form onSubmit={handleAdminGrant} className="space-y-2.5">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Target Username
                  </label>
                  <input
                    type="text"
                    value={grantTarget}
                    onChange={e => setGrantTarget(e.target.value)}
                    placeholder="friend_username or self"
                    className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-purple-400 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Select Tier
                  </label>
                  <select
                    value={grantTier}
                    onChange={e => setGrantTier(e.target.value as SubscriptionTier)}
                    className="w-full bg-[#0d0e12] border border-[#2c2e38] text-white rounded-xl p-2 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="plus">⭐ Revival PLUS+ Tier</option>
                    <option value="pro">⚡ Revival PRO Tier</option>
                    <option value="supporter">💖 Network Supporter</option>
                    <option value="none">❌ Revoke / Standard</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Zap size={12} />
                  Execute Admin Grant
                </button>

                {grantMessage && (
                  <p className="text-[10px] text-green-400 font-black text-center animate-fade-in">
                    {grantMessage}
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Network stats card */}
          <div className="bg-[#15161c] border border-[#2c2e38] p-5 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} className="text-[#facc15]" />
              <h4 className="font-black text-xs text-white">Network Stats</h4>
            </div>
            <div className="space-y-2.5 text-[11px]">
              <div className="flex justify-between items-center py-1 border-b border-[#2c2e38]">
                <span className="text-gray-400">Play Time</span>
                <span className="font-bold text-white flex items-center gap-1"><Clock size={11} /> 18.2 hrs</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400">Authority Level</span>
                <span className="font-bold text-[#facc15]">{isAdmin ? '👑 Administrator' : 'User'}</span>
              </div>
            </div>
          </div>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-3 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <LogOut size={14} />
              Sign Out Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
