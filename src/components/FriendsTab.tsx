import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search, MessageSquare, Eye, Crown, Trash2, Clock, Check, X, Inbox, Globe
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { BadgePill } from './BadgePill';
import { getBadgesForUser, getRoleTag, BadgeRole, BADGE_DEFS } from '../utils/badges';
import { getSubscription } from '../utils/subscription';
import {
  getNetworkCatalog, CatalogUser, canAssignRoles, assignUserRolesByOwner,
  getFriendRequests, sendFriendRequest, respondToFriendRequest
} from '../utils/userCatalog';
import { UserProfileModal } from './UserProfileModal';
import type { Friend } from './SocialSidebar';

interface FriendsTabProps {
  user: { username: string; displayName: string; avatar: string };
  onStartChat: (friend: Friend) => void;
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

export function FriendsTab({ user, onStartChat }: FriendsTabProps) {
  const [subTab, setSubTab] = useState<'online' | 'all' | 'requests' | 'add'>('all');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [catalog, setCatalog] = useState<CatalogUser[]>([]);
  const [requests, setRequests] = useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [addUsernameInput, setAddUsernameInput] = useState('');
  const [addFeedback, setAddFeedback] = useState('');

  // Profile Modal
  const [profileUser, setProfileUser] = useState<{ username: string; displayName: string; avatar: string } | null>(null);

  // Owner Role Modal
  const [roleModalUser, setRoleModalUser] = useState<CatalogUser | Friend | null>(null);
  const [selectedRolesToAssign, setSelectedRolesToAssign] = useState<BadgeRole[]>([]);
  const [roleAssignedSuccess, setRoleAssignedSuccess] = useState(false);

  const isOwner = canAssignRoles(user.username);

  const refreshData = () => {
    setFriends(loadFriends());
    setCatalog(getNetworkCatalog());
    setRequests(getFriendRequests(user.username));
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAddFriend = (target: CatalogUser | { username: string; displayName: string; avatar: string }) => {
    const existing = loadFriends();
    if (existing.some(f => f.username.toLowerCase() === target.username.toLowerCase())) return;

    const newFriend: Friend = {
      username: target.username,
      displayName: target.displayName,
      avatar: target.avatar,
      addedAt: Date.now(),
      status: 'Online',
    };

    const updated = [...existing, newFriend];
    saveFriends(updated);
    setFriends(updated);
    setSubTab('all');
  };

  const handleRemoveFriend = (username: string) => {
    if (!confirm(`Remove @${username} from your friends list?`)) return;
    const updated = loadFriends().filter(f => f.username.toLowerCase() !== username.toLowerCase());
    saveFriends(updated);
    setFriends(updated);
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsernameInput.trim()) return;

    const res = sendFriendRequest(user.username, addUsernameInput.trim());
    setAddFeedback(res.message);
    setAddUsernameInput('');
    setRequests(getFriendRequests(user.username));
    setTimeout(() => setAddFeedback(''), 3000);
  };

  const handleRespondRequest = (reqId: string, accept: boolean) => {
    respondToFriendRequest(reqId, accept);
    refreshData();
  };

  // Owner Role Assignment Modal
  const openRoleModal = (target: CatalogUser | Friend) => {
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
    refreshData();
    setTimeout(() => {
      setRoleAssignedSuccess(false);
      setRoleModalUser(null);
    }, 1200);
  };

  const filteredFriends = friends.filter(f => {
    if (subTab === 'online') {
      const isOnline = true; // All registered active accounts
      if (!isOnline) return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return f.username.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q);
  });

  const catalogAddable = catalog.filter(u => {
    if (u.username.toLowerCase() === user.username.toLowerCase()) return false;
    if (friends.some(f => f.username.toLowerCase() === u.username.toLowerCase())) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none animate-fade-in max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2c2e38]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#facc15]/10 border border-[#facc15]/30 flex items-center justify-center text-[#facc15]">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              Friends Network
            </h1>
            <p className="text-xs text-gray-400">
              Manage your friends, pending invites, and discover players across Revival.
            </p>
          </div>
        </div>

        {/* Discord-style Navigation Sub-tabs */}
        <div className="flex bg-[#14151b] border border-[#2c2e38] p-1 rounded-2xl gap-1">
          <button
            onClick={() => setSubTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              subTab === 'all'
                ? 'bg-[#facc15] text-black shadow-md shadow-yellow-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={14} /> All Friends ({friends.length})
          </button>

          <button
            onClick={() => setSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 relative ${
              subTab === 'requests'
                ? 'bg-[#facc15] text-black shadow-md shadow-yellow-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Inbox size={14} /> Requests
            {requests.incoming.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#14151b] absolute top-1 right-1 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setSubTab('add')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              subTab === 'add'
                ? 'bg-[#22c55e] text-black shadow-md shadow-green-500/10'
                : 'text-green-400 hover:text-green-300 bg-green-500/10'
            }`}
          >
            <UserPlus size={14} /> Add Friend
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
        {/* ADD FRIEND TAB VIEW */}
        {subTab === 'add' && (
          <div className="space-y-6 max-w-2xl mx-auto py-4">
            <div className="bg-[#15161c] border border-[#2c2e38] rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <UserPlus size={18} className="text-[#22c55e]" />
                Add Friend by Username
              </h3>
              <p className="text-xs text-gray-400">
                You can add friends by entering their Revival account username below.
              </p>

              <form onSubmit={handleSendRequest} className="flex gap-2">
                <input
                  type="text"
                  value={addUsernameInput}
                  onChange={e => setAddUsernameInput(e.target.value)}
                  placeholder="Enter @username..."
                  className="flex-1 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#22c55e] font-semibold"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#22c55e] hover:bg-green-400 text-black font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-green-500/20 active:scale-95"
                >
                  Send Invite
                </button>
              </form>

              {addFeedback && (
                <p className="text-xs text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl animate-fade-in">
                  {addFeedback}
                </p>
              )}
            </div>

            {/* Quick Discover catalog cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Globe size={14} className="text-[#facc15]" /> Discover Revival Players
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catalogAddable.map(userItem => {
                  const sub = getSubscription(userItem.username);
                  const badges = getBadgesForUser(userItem.username);
                  const roleTag = getRoleTag(userItem.username);

                  return (
                    <div key={userItem.username} className="bg-[#15161c] border border-[#2c2e38] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md hover:border-[#facc15]/40 transition-all">
                      <div
                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                        onClick={() => setProfileUser({ username: userItem.username, displayName: userItem.displayName, avatar: userItem.avatar })}
                      >
                        <UserAvatar avatarKeyOrUrl={sub.customAvatarUrl || userItem.avatar} name={userItem.displayName} size="md" isSubscribed={sub.active} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {roleTag && (
                              <span className={`text-[9px] font-black uppercase ${roleTag.colorClass}`}>
                                {roleTag.tag}
                              </span>
                            )}
                            <h5 className="font-extrabold text-xs text-white truncate">{userItem.displayName}</h5>
                            {badges[0] && <BadgePill badge={badges[0]} size="sm" />}
                          </div>
                          <p className="text-[10px] text-gray-500 font-bold truncate">@{userItem.username}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddFriend(userItem)}
                        className="px-3 py-1.5 bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 flex-shrink-0"
                      >
                        <UserPlus size={12} /> Add
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PENDING REQUESTS TAB VIEW */}
        {subTab === 'requests' && (
          <div className="space-y-4 max-w-2xl mx-auto py-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Incoming Friend Invites ({requests.incoming.length})
            </h3>

            {requests.incoming.length === 0 ? (
              <div className="text-center py-12 bg-[#15161c]/40 rounded-3xl border border-dashed border-[#2c2e38] p-6 text-gray-400 text-xs font-bold space-y-1">
                <Inbox size={28} className="mx-auto text-gray-600 mb-2" />
                <p>No pending incoming requests.</p>
              </div>
            ) : (
              requests.incoming.map((req: any) => (
                <div key={req.id} className="bg-[#15161c] border border-[#2c2e38] rounded-2xl p-4 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <UserAvatar avatarKeyOrUrl="crown" name={req.fromUsername} size="md" />
                    <div>
                      <h5 className="font-extrabold text-sm text-white">@{req.fromUsername}</h5>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={10} /> Wants to add you as a friend</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRespondRequest(req.id, true)}
                      className="px-4 py-2 rounded-xl bg-green-500/20 text-green-300 hover:bg-green-500/30 text-xs font-extrabold flex items-center gap-1 transition-all"
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button
                      onClick={() => handleRespondRequest(req.id, false)}
                      className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-extrabold flex items-center gap-1 transition-all"
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ALL FRIENDS TAB VIEW */}
        {(subTab === 'all' || subTab === 'online') && (
          <div className="space-y-4">
            {/* Search Filter input */}
            <div className="relative max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full bg-[#14151b] border border-[#2c2e38] rounded-2xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-[#facc15] font-semibold"
              />
            </div>

            {/* Friends Cards Grid */}
            {filteredFriends.length === 0 ? (
              <div className="text-center py-16 bg-[#14151b]/40 rounded-3xl border border-dashed border-[#2c2e38] p-8 space-y-2 max-w-md mx-auto">
                <Users size={32} className="mx-auto text-gray-600" />
                <p className="text-xs text-gray-400 font-bold">No friends added yet.</p>
                <button
                  onClick={() => setSubTab('add')}
                  className="text-xs text-[#facc15] font-black hover:underline"
                >
                  + Browse Player Catalog & Add Friends
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFriends.map(friend => {
                  const badges = getBadgesForUser(friend.username);
                  const sub = getSubscription(friend.username);
                  const roleTag = getRoleTag(friend.username);

                  return (
                    <div
                      key={friend.username}
                      className="bg-[#15161c] border border-[#2c2e38] hover:border-[#facc15]/50 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md hover:shadow-xl transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex items-center gap-3 min-w-0 cursor-pointer"
                          onClick={() => setProfileUser({ username: friend.username, displayName: friend.displayName, avatar: sub.customAvatarUrl || friend.avatar })}
                        >
                          <div className="relative">
                            <UserAvatar
                              avatarKeyOrUrl={sub.customAvatarUrl || friend.avatar}
                              name={friend.displayName}
                              size="md"
                              isSubscribed={sub.active}
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#15161c] bg-[#facc15]" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {roleTag && (
                                <span className={`text-[9px] font-black uppercase ${roleTag.colorClass}`}>
                                  {roleTag.tag}
                                </span>
                              )}
                              <h4 className="font-extrabold text-sm text-white truncate leading-snug group-hover:text-[#facc15] transition-colors">
                                {friend.displayName}
                              </h4>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold truncate">@{friend.username}</p>
                          </div>
                        </div>

                        {badges[0] && <BadgePill badge={badges[0]} size="sm" />}
                      </div>

                      {/* Status message */}
                      <p className="text-[11px] text-yellow-300/90 font-medium italic bg-[#0d0e12] border border-[#2c2e38] p-2 rounded-xl truncate">
                        "{friend.status || 'Exploring modpacks on Revival...'}"
                      </p>

                      {/* Actions */}
                      <div className="flex items-center justify-between border-t border-[#2c2e38]/50 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onStartChat(friend)}
                            className="px-3 py-1.5 bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-95"
                          >
                            <MessageSquare size={12} /> Message
                          </button>

                          <button
                            onClick={() => setProfileUser({ username: friend.username, displayName: friend.displayName, avatar: sub.customAvatarUrl || friend.avatar })}
                            className="p-1.5 bg-[#20222a] border border-[#2c2e38] hover:bg-[#2c2e38] text-gray-300 hover:text-white rounded-xl transition-all text-xs"
                            title="View Profile Card"
                          >
                            <Eye size={13} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {isOwner && (
                            <button
                              onClick={() => openRoleModal(friend)}
                              className="p-1.5 rounded-xl bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 text-xs transition-colors"
                              title="👑 Owner: Manage User Roles"
                            >
                              <Crown size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveFriend(friend.username)}
                            className="p-1.5 hover:bg-red-500/10 rounded-xl text-gray-500 hover:text-red-400 transition-colors"
                            title="Remove Friend"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* OWNER ROLE ASSIGNMENT MODAL */}
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
                ✓ Roles updated for @{roleModalUser.username}!
              </p>
            )}
          </div>
        </div>
      )}

      {/* User Profile Modal */}
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
