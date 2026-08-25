import { useState, useEffect } from 'react';
import {
  Save, Activity, Clock, ShieldCheck, LogOut, Award, Sparkles,
  Image as ImageIcon, Upload, Star, CheckCircle, ShieldAlert,
  Crown, Zap, Lock, Eye, KeyRound, X
} from 'lucide-react';
import {
  BADGE_DEFS, BadgeRole, getBadgesForUser, saveBadgesForUser, getRoleTag,
  getUnlockedBadges, saveDisplayedBadges
} from '../utils/badges';
import {
  getSubscription, saveSubscription, grantSubscription,
  SUBSCRIPTION_TIERS, SubscriptionTier, canUseCustomImages
} from '../utils/subscription';
import { canAssignRoles } from '../utils/userCatalog';
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
  const [unlockedRoles, setUnlockedRoles] = useState<BadgeRole[]>([]);
  const [saved, setSaved] = useState(false);

  // Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Change Password state
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Subscription state
  const [sub, setSub] = useState(getSubscription(user.username));

  // Admin Grant Tool state (restricted strictly to envixyy)
  const [grantTarget, setGrantTarget] = useState('');
  const [grantTier, setGrantTier] = useState<SubscriptionTier>('plus');
  const [grantMessage, setGrantMessage] = useState('');

  const isOwner = canAssignRoles(user.username);
  const hasSub = canUseCustomImages(user.username) || isOwner;

  useEffect(() => {
    setDisplayName(user.displayName);
    setAvatar(user.avatar || 'crown');
    
    const savedStatus = localStorage.getItem('revival_user_status');
    if (savedStatus) setStatusMsg(savedStatus);
    const savedType = localStorage.getItem('revival_user_type');
    if (savedType) setStatusType(savedType as any);

    // Get badges unlocked vs displayed
    const unlocked = getUnlockedBadges(user.username);
    setUnlockedRoles(unlocked.map(b => b.role));

    const displayed = getBadgesForUser(user.username);
    setSelectedRoles(displayed.map(b => b.role));

    const userSub = getSubscription(user.username);
    setSub(userSub);
    if (userSub.customBannerUrl) setBannerUrl(userSub.customBannerUrl);
    if (userSub.customAvatarUrl) setCustomAvatarUrl(userSub.customAvatarUrl);
  }, [user]);

  const toggleRole = (role: BadgeRole) => {
    if (!unlockedRoles.includes(role)) return; // Only allow toggling if unlocked
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
    if (!hasSub) return; // Enforce PLUS+ Subscription Perk lock
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
    const effectiveAvatar = (hasSub && customAvatarUrl.trim()) ? customAvatarUrl.trim() : avatar;
    const updated = {
      username: user.username,
      displayName: displayName.trim() || user.username,
      avatar: effectiveAvatar,
    };

    localStorage.setItem('revival_user', JSON.stringify(updated));
    localStorage.setItem('revival_user_status', statusMsg);
    localStorage.setItem('revival_user_type', statusType);
    saveDisplayedBadges(user.username, selectedRoles);

    // Save custom banner & avatar to subscription only if active subscriber
    const updatedSub = {
      ...sub,
      customBannerUrl: hasSub ? (bannerUrl.trim() || undefined) : undefined,
      customAvatarUrl: hasSub ? (customAvatarUrl.trim() || undefined) : undefined,
    };
    saveSubscription(updatedSub);
    setSub(updatedSub);

    onUpdateUser(updated);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('All fields are required.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    try {
      const raw = localStorage.getItem('revival_passwords');
      const db: Record<string, string> = raw ? JSON.parse(raw) : {};
      const currentStored = db[user.username] || 'revival2025';

      if (currentStored !== currPassword) {
        setPasswordError('Current password is incorrect.');
        return;
      }

      db[user.username] = newPassword;
      localStorage.setItem('revival_passwords', JSON.stringify(db));
      setPasswordSuccess('Password updated successfully!');
      setCurrPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordError('Failed to change password: ' + err.message);
    }
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
  const myRoleTag = getRoleTag(user.username);

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
              {myRoleTag && (
                <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-lg bg-black/50 border border-white/10 ${myRoleTag.colorClass}`}>
                  {myRoleTag.tag}
                </span>
              )}
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
            <div className={`bg-[#0d0e12] border rounded-2xl p-3.5 space-y-2.5 transition-all relative ${
              hasSub ? 'border-[#2c2e38]' : 'border-amber-500/30'
            }`}>
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
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Lock size={10} /> PLUS+ PERK (LOCKED)
                  </span>
                )}
              </div>

              {!hasSub ? (
                <div className="p-3.5 bg-[#18150e] border border-amber-500/30 rounded-xl text-xs font-medium text-amber-300 flex items-center gap-2.5">
                  <Lock size={18} className="text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="font-extrabold text-amber-400 text-xs">Locked Feature — Revival PLUS+ Required</p>
                    <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                      Custom banner URLs and preset backgrounds are reserved for Revival PLUS+ and PRO members. Ask owner <code className="bg-amber-500/20 px-1 py-0.2 rounded font-mono">@envixyy</code> to unlock your subscription!
                    </p>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
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
                {!hasSub ? (
                  <div className="w-full p-2.5 bg-[#18150e] border border-amber-500/20 rounded-xl text-[11px] text-amber-300 font-medium flex items-center gap-2">
                    <Lock size={13} className="text-amber-400 flex-shrink-0" />
                    <span>Custom image PFP uploads require Revival PLUS+. Vector icons remain unlocked for everyone.</span>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
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
                  const isUnlocked = unlockedRoles.includes(role);
                  const isSelected = selectedRoles.includes(role);
                  
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => toggleRole(role)}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                        !isUnlocked
                          ? 'bg-[#0d0e12]/40 border-[#2c2e38]/50 text-gray-600 cursor-not-allowed opacity-45'
                          : isSelected
                          ? 'bg-[#1e2029] border-[#facc15] shadow-sm shadow-[#facc15]/10 text-white'
                          : 'bg-[#0d0e12] border-[#2c2e38] text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      }`}
                    >
                      <BadgePill badge={b} size="sm" />
                      <span className="text-[9px] text-gray-500 flex items-center gap-1 flex-shrink-0">
                        {!isUnlocked ? (
                          <>
                            <Lock size={9} className="text-gray-600" />
                            <span className="text-gray-600 font-medium">Locked</span>
                          </>
                        ) : isSelected ? (
                          'Active'
                        ) : (
                          'Toggle'
                        )}
                      </span>
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

            {/* Password Section */}
            <div className="pt-3 border-t border-[#2c2e38]/60 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <KeyRound size={13} className="text-[#facc15]" />
                Change Password
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="password"
                    value={currPassword}
                    onChange={e => setCurrPassword(e.target.value)}
                    placeholder="Current Password"
                    className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#facc15]"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#facc15]"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#facc15]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  className="px-4 py-2 rounded-xl bg-[#22232b] hover:bg-[#2c2e38] text-gray-300 hover:text-white font-bold text-xs border border-[#2c2e38] transition-all flex items-center gap-1.5"
                >
                  <Lock size={12} /> Update Password
                </button>

                {passwordError && (
                  <p className="text-[11px] text-red-400 font-bold flex items-center gap-1">
                    <ShieldAlert size={12} /> {passwordError}
                  </p>
                )}
                {passwordSuccess && (
                  <p className="text-[11px] text-green-400 font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> {passwordSuccess}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#2c2e38]">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-black text-xs shadow-md shadow-yellow-500/20 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Save size={13} />
              Save Profile Changes
            </button>

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#20222a] border border-[#2c2e38] hover:bg-[#2c2e38] text-gray-300 hover:text-white font-black text-xs transition-all flex items-center gap-1.5"
            >
              <Eye size={13} />
              View Profile Card
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

          {/* Owner Subscription Grant Panel */}
          {isOwner && (
            <div className="bg-[#15161c] border border-amber-500/30 p-5 rounded-3xl shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
                <ShieldAlert size={16} className="text-amber-400" />
                <div>
                  <h4 className="font-black text-xs text-white">Owner Authority Console</h4>
                  <p className="text-[9px] text-amber-300 font-bold">Grant Subscriptions & Custom Perks</p>
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
                    className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400 font-semibold"
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
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Zap size={12} />
                  Execute Owner Grant
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
                <span className="font-bold text-[#facc15]">{isOwner ? '👑 Network Owner' : 'Member'}</span>
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

      {/* VIEW PROFILE CARD PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in p-4">
          <div className="relative w-full max-w-sm bg-[#16171d] border border-[#2c2e38] rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Header banner */}
            <div
              className="h-32 w-full relative bg-[#1c1d22] border-b border-[#2c2e38]"
              style={{
                backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <button
                onClick={() => setShowPreviewModal(false)}
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
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-4 ring-[#16171d] ${statusColors[statusType]}`} />
                </div>
              </div>

              {/* Badges/Roles list */}
              <div className="pt-14 space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="text-lg font-black text-white leading-tight">
                      {displayName || user.username}
                    </h2>
                    {myRoleTag && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.2 rounded bg-black/50 border border-white/10 ${myRoleTag.colorClass}`}>
                        {myRoleTag.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-bold">@{user.username}</p>
                </div>

                {/* Status card */}
                <div className="bg-[#0d0e12] border border-[#2c2e38] rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">Status Message</p>
                  <p className="text-xs text-yellow-300 font-semibold italic">"{statusMsg}"</p>
                </div>

                {/* Sub & Active Badges info */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-black tracking-wider text-gray-500">Active Badges</p>
                  
                  {activeBadges.length === 0 ? (
                    <p className="text-[10px] text-gray-600 font-bold italic">No badges selected for display.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {activeBadges.map(badge => (
                        <div
                          key={badge.role}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/5 shadow-sm text-xs font-bold text-gray-300`}
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
                      PRO
                    </span>
                  </div>
                )}

                {/* Network stats card */}
                <div className="grid grid-cols-2 gap-2 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl p-3 text-center">
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-wider text-gray-500">Play Time</p>
                    <p className="text-xs font-black text-white mt-0.5 flex items-center justify-center gap-1"><Clock size={11} className="text-gray-400" /> 18.2h</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-wider text-gray-500">Joined Network</p>
                    <p className="text-xs font-black text-white mt-0.5">Aug 2026</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="w-full py-2.5 bg-[#20222a] border border-[#2c2e38] hover:bg-[#2c2e38] text-gray-300 hover:text-white text-xs font-black rounded-xl transition-all"
                >
                  Close Profile View
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
