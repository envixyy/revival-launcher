import { useState, useEffect, useRef } from 'react';
import {
  LogOut, Users, MessageSquare, ChevronDown, RefreshCw,
  UserCheck, Settings, UserPlus, X, Check, Gamepad2,
  Search, Globe, Crown, CheckCircle2, Clock, Inbox, Eye
} from 'lucide-react';
import { safeInvoke } from '../utils/tauri';
import { getBadgesForUser, BadgeRole, BADGE_DEFS, getRoleTag } from '../utils/badges';
import { getSubscription } from '../utils/subscription';
import {
  getNetworkCatalog, CatalogUser, registerUserInCatalog,
  canAssignRoles, assignUserRolesByOwner, getFriendRequests,
  sendFriendRequest, respondToFriendRequest, loadFriendsForUser, saveFriendsForUser
} from '../utils/userCatalog';
import { UserAvatar } from './UserAvatar';
import { BadgePill } from './BadgePill';
import { UserProfileModal } from './UserProfileModal';

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

export function SocialSidebar({ user, onStartChat, onSignOut, onNavigateToTab }: SocialSidebarProps) {
  const [activeSubTab, setActiveSubTab] = useState<'friends' | 'catalog' | 'requests'>('friends');
  const [statusMsg, setStatusMsg] = useState('Exploring modpacks on Revival...');
  const [statusType, setStatusType] = useState<'online' | 'idle' | 'dnd' | 'offline'>('online');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [catalog, setCatalog] = useState<CatalogUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mcAccounts, setMcAccounts] = useState<AccountData>({ accounts: [], active_id: null });
  const [showMcSwitcher, setShowMcSwitcher] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Friend Request state
  const [requests, setRequests] = useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] });
  const [quickAddUser, setQuickAddUser] = useState('');
  const [quickAddFeedback, setQuickAddFeedback] = useState('');

  // Owner Role Management Modal
  const [roleModalUser, setRoleModalUser] = useState<CatalogUser | Friend | null>(null);
  const [selectedRolesToAssign, setSelectedRolesToAssign] = useState<BadgeRole[]>([]);
  const [roleAssignedSuccess, setRoleAssignedSuccess] = useState(false);

  // Profile viewing state
  const [profileUser, setProfileUser] = useState<{ username: string; displayName: string; avatar: string } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOwner = canAssignRoles(user.username);

  const syncData = async () => {
    const savedStatus = localStorage.getItem('revival_user_status');
    if (savedStatus) setStatusMsg(savedStatus);
    const savedType = localStorage.getItem('revival_user_type');
    if (savedType) setStatusType(savedType as any);

    registerUserInCatalog(user);
    setFriends(loadFriendsForUser(user.username));
    setCatalog(getNetworkCatalog());
    setRequests(getFriendRequests(user.username));

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
    const handleNetworkRefresh = () => {
      setFriends(loadFriendsForUser(user.username));
      setCatalog(getNetworkCatalog());
      setRequests(getFriendRequests(user.username));
    };

    window.addEventListener('revival_network_updated', handleNetworkRefresh);
    window.addEventListener('revival_friend_requests_updated', handleNetworkRefresh);
    window.addEventListener('revival_friends_updated', handleNetworkRefresh);

    const interval = setInterval(handleNetworkRefresh, 2500);
    return () => {
      window.removeEventListener('revival_network_updated', handleNetworkRefresh);
      window.removeEventListener('revival_friend_requests_updated', handleNetworkRefresh);
      window.removeEventListener('revival_friends_updated', handleNetworkRefresh);
      clearInterval(interval);
    };
  }, [user]);

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

  const handleAddFriendFromCatalog = (target: CatalogUser) => {
    if (target.username.toLowerCase() === user.username.toLowerCase()) return;
    const existing = loadFriendsForUser(user.username);
    if (existing.some(f => f.username.toLowerCase() === target.username.toLowerCase())) return;

    const newFriend: Friend = {
      username: target.username,
      displayName: target.displayName,
      avatar: target.avatar,
      addedAt: Date.now(),
      status: target.activity || target.status || 'Online',
    };

    const updated = [...existing, newFriend];
    saveFriendsForUser(user.username, updated);
    setFriends(updated);
    setActiveSubTab('friends');
  };

  const handleSendQuickRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddUser.trim()) return;
    if (quickAddUser.trim().toLowerCase() === user.username.toLowerCase()) {
      setQuickAddFeedback("You cannot add yourself as a friend.");
      setTimeout(() => setQuickAddFeedback(''), 3000);
      return;
    }

    const result = sendFriendRequest(user.username, quickAddUser.trim());
    setQuickAddFeedback(result.message);
    setQuickAddUser('');
    setRequests(getFriendRequests(user.username));
    setTimeout(() => setQuickAddFeedback(''), 3000);
  };

  const handleRespondRequest = (reqId: string, accept: boolean) => {
    respondToFriendRequest(reqId, accept);
    setRequests(getFriendRequests(user.username));
    setFriends(loadFriendsForUser(user.username));
  };

  const handleRemoveFriend = (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove @${username} from your friends list?`)) return;
    const updated = loadFriendsForUser(user.username).filter(f => f.username.toLowerCase() !== username.toLowerCase());
    saveFriendsForUser(user.username, updated);
    setFriends(updated);
  };

  // Owner Role Assignment Modal
  const openRoleModal = (target: CatalogUser | Friend, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isOwner) return;
    setRoleModalUser(target);
    const existingBadges = getBadgesForUser(target.username);
    setSelectedRolesToAssign(existingBadges.map(b => b.role));
  };

  const toggleRoleInModal = (role: BadgeRole) => {
    setSelectedRolesToAssign(prev => {
      if (prev.includes(role)) {
        if (prev.length <= 1) return prev;
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleSaveAssignedRoles = () => {
    if (!roleModalUser || !isOwner) return;
    assignUserRolesByOwner(user.username, roleModalUser.username, selectedRolesToAssign);
    setRoleAssignedSuccess(true);
    setCatalog(getNetworkCatalog());
    setFriends(loadFriendsForUser(user.username));
    setTimeout(() => {
      setRoleAssignedSuccess(false);
      setRoleModalUser(null);
    }, 1200);
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
  const myRoleTag = getRoleTag(user.username);

  // Filter Catalog Search
  const filteredCatalog = catalog.filter(u => {
    if (u.username.toLowerCase() === user.username.toLowerCase()) return false;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return u.username.toLowerCase().includes(query) || u.displayName.toLowerCase().includes(query) || (u.activity && u.activity.toLowerCase().includes(query));
  });

  return (
    <div className="w-76 h-full bg-[#0d0e12] border-l border-[#1e2028] flex flex-col select-none flex-shrink-0 overflow-hidden">
      {/* Upper Area */}
      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3.5 gap-3">

        {/* Current User Profile Card */}
        <div className="bg-[#15161c] border border-[#2c2e38] rounded-2xl p-3.5 flex flex-col gap-2 shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <UserAvatar
                avatarKeyOrUrl={mySub.customAvatarUrl || user.avatar}
                name={user.displayName}
                size="md"
                isSubscribed={mySub.active}
              />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-[#15161c] ${statusColors[statusType]}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {myRoleTag && (
                  <span className={`text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-black/40 ${myRoleTag.colorClass}`}>
                    {myRoleTag.tag}
                  </span>
                )}
                <h4 className="font-black text-xs text-white truncate leading-tight">{user.displayName}</h4>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-[9.5px] text-gray-500 font-bold">@{user.username}</p>
                {myBadges[0] && (
                  <BadgePill badge={myBadges[0]} size="sm" />
                )}
              </div>
            </div>

            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>

          <div className="border-t border-[#2c2e38]/60 pt-1.5 flex items-center justify-between text-[10px]">
            <span className="text-yellow-300/90 font-medium italic truncate max-w-[170px]" title={statusMsg}>
              "{statusMsg}"
            </span>
            {isOwner && (
              <span className="text-[8px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                OWNER
              </span>
            )}
          </div>
        </div>

        {/* Clean Segmented Navigation Sub-Tabs */}
        <div className="flex bg-[#14151b] border border-[#2c2e38] p-1 rounded-2xl gap-1 shadow-inner">
          <button
            onClick={() => setActiveSubTab('friends')}
            className={`flex-1 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeSubTab === 'friends'
                ? 'bg-[#facc15] text-black shadow-md shadow-yellow-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={13} />
            <span>Friends</span>
            {friends.length > 0 && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${activeSubTab === 'friends' ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'}`}>
                {friends.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`flex-1 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeSubTab === 'catalog'
                ? 'bg-[#facc15] text-black shadow-md shadow-yellow-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe size={13} />
            <span>Directory</span>
          </button>

          <button
            onClick={() => setActiveSubTab('requests')}
            className={`py-1.5 px-3 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all relative ${
              activeSubTab === 'requests'
                ? 'bg-[#facc15] text-black shadow-md shadow-yellow-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Friend Invites"
          >
            <Inbox size={13} />
            <span>Invites</span>
            {requests.incoming.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#14151b] absolute -top-0.5 -right-0.5 animate-pulse" />
            )}
          </button>
        </div>

        {/* TAB 1: FRIENDS LIST */}
        {activeSubTab === 'friends' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            {friends.length === 0 ? (
              <div className="text-center py-8 flex flex-col items-center gap-2 bg-[#15161c]/40 rounded-2xl border border-dashed border-[#2c2e38] p-4">
                <Users size={22} className="text-gray-500" />
                <p className="text-xs text-gray-400 font-bold">No friends added yet</p>
                <button
                  onClick={() => setActiveSubTab('catalog')}
                  className="text-xs text-[#facc15] font-black hover:underline"
                >
                  + Browse Player Directory
                </button>
              </div>
            ) : (
              friends.map(friend => {
                const fBadges = getBadgesForUser(friend.username);
                const fSub = getSubscription(friend.username);
                const fRoleTag = getRoleTag(friend.username);

                return (
                  <div
                    key={friend.username}
                    className="bg-[#15161c] border border-[#2c2e38] hover:border-[#facc15]/50 rounded-2xl p-2.5 flex flex-col gap-1.5 transition-all shadow-sm group"
                  >
                    {/* Header Row: Avatar, Name, Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                        onClick={() => onStartChat(friend)}
                      >
                        <div className="relative flex-shrink-0">
                          <UserAvatar
                            avatarKeyOrUrl={fSub.customAvatarUrl || friend.avatar}
                            name={friend.displayName}
                            size="sm"
                            isSubscribed={fSub.active}
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#15161c] bg-[#facc15]" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {fRoleTag && (
                              <span className={`text-[8.5px] font-black uppercase ${fRoleTag.colorClass}`}>
                                {fRoleTag.tag}
                              </span>
                            )}
                            <h4 className="font-extrabold text-xs text-white truncate group-hover:text-[#facc15] transition-colors">
                              {friend.displayName}
                            </h4>
                          </div>
                          <p className="text-[9.5px] text-[#facc15]/90 font-semibold truncate leading-tight mt-0.5">
                            🎮 {friend.status || 'In Launcher Lobby'}
                          </p>
                        </div>
                      </div>

                      {fBadges[0] && (
                        <BadgePill badge={fBadges[0]} size="sm" />
                      )}
                    </div>

                    {/* Action Toolbar */}
                    <div className="border-t border-[#2c2e38]/50 pt-1.5 flex items-center justify-between">
                      <button
                        onClick={() => onStartChat(friend)}
                        className="px-2 py-0.5 bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-[9.5px] rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        <MessageSquare size={10} /> Chat
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setProfileUser({ username: friend.username, displayName: friend.displayName, avatar: fSub.customAvatarUrl || friend.avatar }); }}
                          className="px-1.5 py-0.5 rounded-lg bg-[#20222a] hover:bg-[#2c2e38] text-gray-300 hover:text-white text-[9.5px] font-bold transition-all flex items-center gap-0.5"
                          title="View Profile"
                        >
                          <Eye size={10} /> Profile
                        </button>
                        {isOwner && (
                          <button
                            onClick={e => openRoleModal(friend, e)}
                            className="p-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 transition-colors"
                            title="👑 Owner: Manage Roles"
                          >
                            <Crown size={11} />
                          </button>
                        )}
                        <button
                          onClick={e => handleRemoveFriend(friend.username, e)}
                          className="p-1 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                          title="Remove Friend"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: NETWORK PLAYER CATALOG */}
        {activeSubTab === 'catalog' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            {/* Search input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search network players..."
                className="w-full bg-[#15161c] border border-[#2c2e38] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-[#facc15] font-semibold"
              />
            </div>

            {/* Quick Add By Username */}
            <form onSubmit={handleSendQuickRequest} className="bg-[#15161c] border border-[#2c2e38] p-2 rounded-xl flex gap-1.5">
              <input
                type="text"
                value={quickAddUser}
                onChange={e => setQuickAddUser(e.target.value)}
                placeholder="Add @username..."
                className="flex-1 bg-[#0d0e12] border border-[#2c2e38] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#facc15] font-medium"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs rounded-lg transition-all flex items-center gap-1"
              >
                <UserPlus size={11} /> Add
              </button>
            </form>
            {quickAddFeedback && (
              <p className="text-[9.5px] text-[#facc15] font-bold px-1 animate-fade-in">{quickAddFeedback}</p>
            )}

            {/* Catalog List */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
              {filteredCatalog.map(target => {
                const targetBadges = getBadgesForUser(target.username);
                const targetRoleTag = getRoleTag(target.username);
                const targetSub = getSubscription(target.username);
                const isAlreadyFriend = friends.some(f => f.username.toLowerCase() === target.username.toLowerCase());

                return (
                  <div
                    key={target.username}
                    className="bg-[#15161c] border border-[#2c2e38] hover:border-[#facc15]/40 rounded-xl p-2.5 flex flex-col gap-1.5 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative flex-shrink-0">
                          <UserAvatar
                            avatarKeyOrUrl={targetSub.customAvatarUrl || target.avatar}
                            name={target.displayName}
                            size="sm"
                            isSubscribed={targetSub.active}
                          />
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-1 ring-[#0d0e12] ${target.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {targetRoleTag && (
                              <span className={`text-[8.5px] font-black uppercase ${targetRoleTag.colorClass}`}>
                                {targetRoleTag.tag}
                              </span>
                            )}
                            <h5 className="font-extrabold text-xs text-white truncate">{target.displayName}</h5>
                          </div>
                          <p className="text-[9px] text-gray-500 font-semibold truncate">@{target.username}</p>
                        </div>
                      </div>

                      {/* Badges */}
                      {targetBadges[0] && (
                        <BadgePill badge={targetBadges[0]} size="sm" />
                      )}
                    </div>

                    <div className="text-[9.5px] text-gray-400 flex items-center justify-between border-t border-[#2c2e38]/50 pt-1.5">
                      <span className="truncate text-yellow-300/80 font-medium max-w-[140px]">🎮 {target.activity || target.status || 'Online'}</span>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setProfileUser({ username: target.username, displayName: target.displayName, avatar: targetSub.customAvatarUrl || target.avatar })}
                          className="px-1.5 py-0.5 rounded-lg bg-[#20222a] hover:bg-[#2c2e38] text-gray-300 hover:text-white text-[9px] font-bold flex items-center gap-0.5 transition-all"
                          title="View Profile"
                        >
                          <Eye size={10} /> Profile
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => openRoleModal(target)}
                            className="px-1.5 py-0.5 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 text-[9px] font-black flex items-center gap-0.5 transition-all"
                            title="👑 Owner: Assign Roles"
                          >
                            <Crown size={10} /> Role
                          </button>
                        )}

                        {isAlreadyFriend ? (
                          <button
                            onClick={() => onStartChat({ username: target.username, displayName: target.displayName, avatar: targetSub.customAvatarUrl || target.avatar, addedAt: Date.now() })}
                            className="px-2 py-0.5 bg-[#facc15] hover:bg-yellow-300 text-black font-black text-[9.5px] rounded-lg transition-all flex items-center gap-0.5 shadow-sm"
                          >
                            <MessageSquare size={10} /> Chat
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddFriendFromCatalog(target)}
                            className="px-2 py-0.5 bg-[#20222a] hover:bg-[#facc15] hover:text-black text-gray-300 font-bold text-[9.5px] rounded-lg transition-all flex items-center gap-0.5 border border-[#2c2e38]"
                          >
                            <UserPlus size={10} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: FRIEND REQUESTS */}
        {activeSubTab === 'requests' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-1">
              Incoming Friend Requests ({requests.incoming.length})
            </h5>

            {requests.incoming.length === 0 ? (
              <div className="text-center py-6 bg-[#15161c]/40 rounded-2xl border border-dashed border-[#2c2e38] p-3 text-gray-500 text-xs font-bold">
                No pending requests
              </div>
            ) : (
              requests.incoming.map((req: any) => (
                <div key={req.id} className="bg-[#15161c] border border-[#2c2e38] rounded-xl p-2.5 flex items-center justify-between">
                  <div>
                    <h6 className="font-extrabold text-xs text-white">@{req.fromUsername}</h6>
                    <span className="text-[9px] text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={10} /> Requested friend invite</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRespondRequest(req.id, true)}
                      className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                      title="Accept"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => handleRespondRequest(req.id, false)}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title="Decline"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* OWNER ROLE ASSIGNMENT MODAL (ONLY VISIBLE TO "envixyy") */}
      {isOwner && roleModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#15161c] border border-amber-400/40 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2c2e38] pb-3">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-amber-400" />
                <div>
                  <h4 className="font-black text-sm text-white leading-tight">Owner Authority Manager</h4>
                  <p className="text-[10px] text-amber-300/80 font-bold">Assigning roles for @{roleModalUser.username}</p>
                </div>
              </div>
              <button onClick={() => setRoleModalUser(null)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-gray-400">Toggle User Badges & Role:</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(BADGE_DEFS) as BadgeRole[]).map(role => {
                  const b = BADGE_DEFS[role];
                  const isSelected = selectedRolesToAssign.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRoleInModal(role)}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all text-left ${
                        isSelected
                          ? 'bg-[#20222e] border-amber-400 text-white shadow-sm'
                          : 'bg-[#0d0e12] border-[#2c2e38] text-gray-500 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <BadgePill badge={b} size="sm" />
                      <span className="text-[9px] font-bold text-gray-400">{isSelected ? '✓' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleSaveAssignedRoles}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-xs rounded-xl shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-1"
              >
                <Check size={13} /> Save Assigned Roles
              </button>
            </div>

            {roleAssignedSuccess && (
              <p className="text-xs text-green-400 font-bold text-center animate-fade-in flex items-center justify-center gap-1">
                <CheckCircle2 size={13} /> Roles updated for @{roleModalUser.username}!
              </p>
            )}
          </div>
        </div>
      )}

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
            {activeMcAccount?.type === 'microsoft' ? <Gamepad2 size={13} className="text-[#facc15]" /> : <Users size={13} />}
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
                  <span className="text-xs">{acc.type === 'microsoft' ? <Gamepad2 size={12} className="text-[#facc15]" /> : <Users size={12} />}</span>
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

      {/* User Profile Card Modal */}
      {profileUser && (
        <UserProfileModal
          username={profileUser.username}
          displayName={profileUser.displayName}
          avatar={profileUser.avatar}
          onClose={() => setProfileUser(null)}
          onStartChat={() => {
            onStartChat({
              username: profileUser.username,
              displayName: profileUser.displayName,
              avatar: profileUser.avatar,
              addedAt: Date.now(),
            });
            setProfileUser(null);
          }}
        />
      )}
    </div>
  );
}
