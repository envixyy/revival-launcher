import { useState, useEffect, useRef } from 'react';
import {
  LogOut, Users, MessageSquare, ChevronDown, RefreshCw,
  UserCheck, Settings, UserPlus, X, Check, Gamepad2, User as UserIcon
} from 'lucide-react';
import { safeInvoke } from '../utils/tauri';
import { getBadgesForUser, BadgeRole, saveBadgesForUser } from '../utils/badges';
import { getSubscription } from '../utils/subscription';
import { UserAvatar } from './UserAvatar';
import { BadgePill } from './BadgePill';

export interface Friend {
  username: string;
  displayName: string;
  avatar: string;
  addedAt: number;
  status?: string;
  role?: BadgeRole;
}

interface SocialSidebarProps {
  user: { username: string; displayName: string; avatar: string };
  onStartChat: (friend: Friend) => void;
  onSignOut: () => void;
  onNavigateToTab: (tab: string) => void;
}

interface MinecraftAccount {
  id: string;
  type: 'microsoft' | 'offline';
  username: string;
  uuid: string;
}

interface AccountData {
  accounts: MinecraftAccount[];
  active_id: string | null;
}

function loadFriends(): Friend[] {
  try {
    return JSON.parse(localStorage.getItem('revival_friends') || '[]');
  } catch {
    return [];
  }
}

function saveFriends(friends: Friend[]) {
  localStorage.setItem('revival_friends', JSON.stringify(friends));
}

const VECTOR_AVATAR_KEYS = ['crown', 'swords', 'zap', 'gamepad', 'shield', 'flame', 'sparkles', 'terminal', 'bot', 'rocket', 'compass', 'star'];

export function SocialSidebar({ user, onStartChat, onSignOut, onNavigateToTab }: SocialSidebarProps) {
  const [statusMsg, setStatusMsg] = useState('Exploring modpacks on Revival...');
  const [statusType, setStatusType] = useState<'online' | 'idle' | 'dnd' | 'offline'>('online');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [mcAccounts, setMcAccounts] = useState<AccountData>({ accounts: [], active_id: null });
  const [showMcSwitcher, setShowMcSwitcher] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addRole, setAddRole] = useState<BadgeRole>('early_access');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const syncData = async () => {
    const savedStatus = localStorage.getItem('revival_user_status');
    if (savedStatus) setStatusMsg(savedStatus);
    const savedType = localStorage.getItem('revival_user_type');
    if (savedType) setStatusType(savedType as 'online' | 'idle' | 'dnd' | 'offline');

    setFriends(loadFriends());

    setLoadingAccounts(true);
    try {
      const res = await safeInvoke<AccountData>('list_accounts');
      setMcAccounts(res || { accounts: [], active_id: null });
    } catch {
      // ignore
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    syncData();
    const interval = setInterval(() => setFriends(loadFriends()), 3000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (showAddFriend) setTimeout(() => addInputRef.current?.focus(), 50);
    else { setAddUsername(''); setAddError(''); setAddSuccess(''); }
  }, [showAddFriend]);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMcSwitcher(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleSetActiveMc = async (id: string) => {
    try {
      await safeInvoke('set_active_account', { id });
      setShowMcSwitcher(false);
      syncData();
    } catch { /* ignore */ }
  };

  const handleAddFriend = () => {
    const uname = addUsername.trim().toLowerCase().replace(/\s+/g, '_');
    if (!uname) { setAddError('Enter a username.'); return; }
    if (uname === user.username.toLowerCase()) { setAddError("That's you!"); return; }

    const existing = loadFriends();
    if (existing.some(f => f.username.toLowerCase() === uname)) {
      setAddError('Already in friends list.');
      return;
    }

    const randomAvatar = VECTOR_AVATAR_KEYS[uname.charCodeAt(0) % VECTOR_AVATAR_KEYS.length];
    const newFriend: Friend = {
      username: uname,
      displayName: uname,
      avatar: randomAvatar,
      addedAt: Date.now(),
      status: 'Online',
      role: addRole,
    };

    saveBadgesForUser(uname, [addRole]);

    const updated = [...existing, newFriend];
    saveFriends(updated);
    setFriends(updated);
    setAddSuccess(`${uname} added!`);
    setAddUsername('');
    setTimeout(() => { setAddSuccess(''); setShowAddFriend(false); }, 1500);
  };

  const handleRemoveFriend = (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = loadFriends().filter(f => f.username !== username);
    saveFriends(updated);
    setFriends(updated);
  };

  const statusColors = {
    online: 'bg-[#facc15]',
    idle: 'bg-amber-500',
    dnd: 'bg-red-500',
    offline: 'bg-gray-600',
  };

  const activeMcAccount = mcAccounts.accounts.find(a => a.id === mcAccounts.active_id);
  const myBadges = getBadgesForUser(user.username);
  const mySub = getSubscription(user.username);

  return (
    <div className="w-64 h-full bg-[#0d0e12] border-l border-[#1e2028] flex flex-col select-none flex-shrink-0 overflow-hidden">
      {/* Upper scrollable area */}
      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3.5 gap-4">

        {/* Profile Card with Badges & Vector Avatar */}
        <div className="bg-[#15161c] border border-[#2c2e38] rounded-2xl p-3 flex flex-col gap-2.5 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <UserAvatar
                avatarKeyOrUrl={user.avatar}
                name={user.displayName}
                size="md"
                isSubscribed={mySub.active}
              />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#15161c] ${statusColors[statusType]}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-black text-xs text-white truncate leading-tight">{user.displayName}</h4>
                {myBadges.slice(0, 2).map(b => (
                  <BadgePill key={b.role} badge={b} size="sm" />
                ))}
              </div>
              <p className="text-[9px] text-gray-500 truncate mt-0.5 font-semibold">@{user.username}</p>
            </div>

            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>

          <div className="border-t border-[#2c2e38]/50 pt-1.5">
            <p className="text-[10px] text-gray-400 italic truncate" title={statusMsg}>"{statusMsg}"</p>
          </div>
        </div>

        {/* Friends Section */}
        <div className="flex flex-col gap-1.5 flex-1 min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-1 mb-1">
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-[#facc15]" />
              <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-300">Friends & Network</h4>
              {friends.length > 0 && (
                <span className="text-[9px] font-black text-[#facc15] bg-[#facc15]/10 px-1.5 py-0.2 rounded-md border border-[#facc15]/20">
                  {friends.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowAddFriend(v => !v)}
              title="Add a friend"
              className={`p-1.5 rounded-lg transition-all ${
                showAddFriend 
                  ? 'bg-[#facc15] text-black shadow-md' 
                  : 'hover:bg-[#1c1d22] text-gray-400 hover:text-white border border-[#2c2e38]'
              }`}
            >
              {showAddFriend ? <X size={12} /> : <UserPlus size={12} />}
            </button>
          </div>

          {/* Add Friend Form */}
          {showAddFriend && (
            <div className="bg-[#15161c] border border-[#facc15]/30 rounded-xl p-2.5 flex flex-col gap-2 animate-fade-in shadow-xl">
              <p className="text-[9px] text-[#facc15] font-black uppercase tracking-wide">Add Friend</p>
              <input
                ref={addInputRef}
                type="text"
                value={addUsername}
                onChange={e => { setAddUsername(e.target.value); setAddError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                placeholder="friend_username..."
                className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-[#facc15] font-semibold"
              />

              {/* Role selector for added friend */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-400 font-bold">Role:</span>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value as BadgeRole)}
                  className="flex-1 bg-[#0d0e12] border border-[#2c2e38] text-white rounded-lg px-1.5 py-1 text-[9px] font-bold outline-none cursor-pointer"
                >
                  <option value="early_access">VIP Member</option>
                  <option value="plus">PLUS+ Subscriber</option>
                  <option value="developer">Developer</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                  <option value="supporter">Supporter</option>
                </select>

                <button
                  onClick={handleAddFriend}
                  className="px-2.5 py-1 bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold rounded-lg text-[10px] transition-all flex-shrink-0 flex items-center gap-0.5"
                >
                  <Check size={11} /> Add
                </button>
              </div>

              {addError && <p className="text-[9px] text-red-400 font-semibold">{addError}</p>}
              {addSuccess && <p className="text-[9px] text-green-400 font-semibold">{addSuccess}</p>}
            </div>
          )}

          {/* Friends List */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            {friends.length === 0 ? (
              <div className="text-center py-8 flex flex-col items-center gap-2 bg-[#15161c]/40 rounded-2xl border border-dashed border-[#2c2e38] p-4">
                <Users size={24} className="text-gray-500" />
                <p className="text-[10px] text-gray-400 font-bold">No friends added yet</p>
                <button
                  onClick={() => setShowAddFriend(true)}
                  className="text-[9px] text-[#facc15] font-extrabold hover:underline"
                >
                  + Add your first friend
                </button>
              </div>
            ) : (
              friends.map(friend => {
                const fBadges = getBadgesForUser(friend.username);
                const fSub = getSubscription(friend.username);

                return (
                  <div
                    key={friend.username}
                    className="flex items-center gap-2 hover:bg-[#181920] p-2 rounded-xl border border-transparent hover:border-[#2c2e38] transition-all group cursor-pointer"
                    onClick={() => onStartChat(friend)}
                  >
                    <div className="relative flex-shrink-0">
                      <UserAvatar
                        avatarKeyOrUrl={friend.avatar}
                        name={friend.displayName}
                        size="sm"
                        isSubscribed={fSub.active}
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0d0e12] bg-[#facc15]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className="font-extrabold text-xs text-white truncate group-hover:text-[#facc15] transition-colors">
                            {friend.displayName}
                          </p>
                          {fBadges[0] && (
                            <BadgePill badge={fBadges[0]} size="sm" />
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <MessageSquare size={11} className="text-[#facc15]" />
                          <button
                            onClick={e => handleRemoveFriend(friend.username, e)}
                            className="p-0.5 hover:text-red-400 text-gray-600 transition-colors ml-0.5"
                            title="Remove friend"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-500 truncate leading-tight mt-0.5 font-medium">
                        {friend.status ?? 'Online'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Minecraft Account Footer */}
      <div className="p-3.5 border-t border-[#1e2028] bg-[#08090c] relative" ref={dropdownRef}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Minecraft Player</span>
          {loadingAccounts && <RefreshCw size={9} className="animate-spin text-[#facc15]" />}
        </div>

        <button
          onClick={() => setShowMcSwitcher(v => !v)}
          className="w-full flex items-center gap-2 bg-[#15161c] hover:bg-[#1a1c24] border border-[#2c2e38] hover:border-[#facc15]/40 p-2 rounded-xl transition-all text-left relative shadow-sm"
        >
          <div className="w-6 h-6 rounded-lg bg-[#242630] flex items-center justify-center text-xs flex-shrink-0 text-gray-300">
            {activeMcAccount?.type === 'microsoft' ? <Gamepad2 size={13} className="text-[#facc15]" /> : <UserIcon size={13} />}
          </div>
          <div className="min-w-0 flex-1 pr-3">
            <p className="font-extrabold text-[11px] text-white truncate leading-tight">
              {activeMcAccount?.username ?? 'No Account'}
            </p>
            <p className="text-[7.5px] text-gray-400 uppercase font-black tracking-widest mt-0.5">
              {activeMcAccount?.type === 'microsoft' ? 'Microsoft Auth' : 'Offline Mode'}
            </p>
          </div>
          <ChevronDown size={12} className="text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" />
        </button>

        {showMcSwitcher && (
          <div className="absolute left-3.5 right-3.5 bottom-full mb-1.5 bg-[#15161c] border border-[#2c2e38] rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto no-scrollbar animate-fade-in">
            <div className="p-2 border-b border-[#2c2e38]/50 text-[8.5px] font-black uppercase text-gray-400 tracking-wider">
              Switch Minecraft Profile
            </div>
            {mcAccounts.accounts.length === 0 ? (
              <div className="px-3 py-3 text-[10px] text-gray-500 text-center font-bold">No player accounts added</div>
            ) : (
              mcAccounts.accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => handleSetActiveMc(acc.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-all text-left hover:bg-[#20222d] ${
                    acc.id === mcAccounts.active_id ? 'text-[#facc15] bg-[#facc15]/5' : 'text-white'
                  }`}
                >
                  <span className="text-xs">{acc.type === 'microsoft' ? <Gamepad2 size={12} className="text-[#facc15]" /> : <UserIcon size={12} />}</span>
                  <span className="truncate flex-1">{acc.username}</span>
                  {acc.id === mcAccounts.active_id && <UserCheck size={12} className="text-[#facc15]" />}
                </button>
              ))
            )}
            <button
              onClick={() => { setShowMcSwitcher(false); onNavigateToTab('accounts'); }}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-gray-300 hover:text-white bg-[#0d0e12] border-t border-[#2c2e38] transition-all text-left"
            >
              <Settings size={11} /> Manage Accounts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
