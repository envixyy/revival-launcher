import { useState, useEffect, useRef } from 'react';
import { Send, X, Trash2, User } from 'lucide-react';
import type { Friend } from './SocialSidebar';
import { getBadgesForUser, getRoleTag } from '../utils/badges';
import { getSubscription } from '../utils/subscription';
import { UserAvatar } from './UserAvatar';
import { BadgePill } from './BadgePill';
import { UserProfileModal } from './UserProfileModal';
import { broadcastChatMessage } from '../utils/realtimeNetwork';

interface Message {
  id: string;
  sender: string; // actual username of the sender
  text: string;
  timestamp: number;
}

interface ChatOverlayProps {
  friend: Friend;
  myUsername: string;
  onClose: () => void;
}

function getChatKey(me: string, them: string) {
  const sorted = [me.toLowerCase(), them.toLowerCase()].sort();
  return `revival_chat_${sorted[0]}_${sorted[1]}`;
}

function loadMessages(me: string, them: string): Message[] {
  try {
    return JSON.parse(localStorage.getItem(getChatKey(me, them)) || '[]');
  } catch {
    return [];
  }
}

function saveMessages(me: string, them: string, msgs: Message[]) {
  const trimmed = msgs.slice(-500);
  localStorage.setItem(getChatKey(me, them), JSON.stringify(trimmed));
}

export function ChatOverlay({ friend, myUsername, onClose }: ChatOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<{ username: string; displayName: string; avatar: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // My details
  const myUserData = (() => {
    try {
      return JSON.parse(localStorage.getItem('revival_user') || '{}');
    } catch {
      return {};
    }
  })();
  const myDisplayName = myUserData.displayName || myUsername;
  const myAvatar = myUserData.avatar || 'crown';

  const friendBadges = getBadgesForUser(friend.username);
  const myBadges = getBadgesForUser(myUsername);
  const friendSub = getSubscription(friend.username);
  const mySub = getSubscription(myUsername);
  const friendRoleTag = getRoleTag(friend.username);
  const myRoleTag = getRoleTag(myUsername);

  // Custom avatars if set
  const friendAvatarFinal = friendSub.customAvatarUrl || friend.avatar;
  const myAvatarFinal = mySub.customAvatarUrl || myAvatar;

  // Load history on mount
  useEffect(() => {
    setMessages(loadMessages(myUsername, friend.username));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [friend.username, myUsername]);

  // Live sync: poll localStorage & listen to multi-PC network events for new messages
  useEffect(() => {
    const chatKey = getChatKey(myUsername, friend.username);

    const handleNetworkChat = (e: any) => {
      if (e.detail?.chatKey === chatKey) {
        setMessages(loadMessages(myUsername, friend.username));
      }
    };
    window.addEventListener('revival_chat_updated', handleNetworkChat as any);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === chatKey) {
        setMessages(loadMessages(myUsername, friend.username));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Also poll for same-window changes
    const interval = setInterval(() => {
      const fresh = loadMessages(myUsername, friend.username);
      setMessages(prev => {
        if (fresh.length !== prev.length) return fresh;
        if (fresh.length > 0 && prev.length > 0 && fresh[fresh.length - 1]?.id !== prev[prev.length - 1]?.id) return fresh;
        return prev;
      });
    }, 1500);

    return () => {
      window.removeEventListener('revival_chat_updated', handleNetworkChat as any);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [friend.username, myUsername]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const newMsg: Message = {
      id: `${Date.now()}-${Math.random()}`,
      sender: myUsername,
      text,
      timestamp: Date.now(),
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    saveMessages(myUsername, friend.username, updated);
    broadcastChatMessage(myUsername, friend.username, newMsg);
    setInputText('');
  };

  const handleClear = () => {
    if (!confirm(`Clear conversation history with ${friend.displayName}?`)) return;
    localStorage.removeItem(getChatKey(myUsername, friend.username));
    setMessages([]);
  };

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });

  let lastDateStr = '';

  return (
    <div className="fixed bottom-4 right-[270px] w-88 h-[460px] bg-[#0e0f14] border border-[#facc15]/25 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-scale-up"
      style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(250,204,21,0.1)' }}
    >
      {/* Header */}
      <div className="bg-[#0a0b0f] border-b border-[#1e2028] px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => setSelectedUserForProfile({ username: friend.username, displayName: friend.displayName, avatar: friendAvatarFinal })}
        >
          <div className="relative">
            <UserAvatar avatarKeyOrUrl={friendAvatarFinal} name={friend.displayName} size="sm" isSubscribed={friendSub.active} />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0a0b0f] bg-[#facc15] animate-status-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              {friendRoleTag && (
                <span className={`text-[9px] font-black uppercase ${friendRoleTag.colorClass}`}>{friendRoleTag.tag}</span>
              )}
              <h4 className="font-black text-xs text-white group-hover:text-[#facc15] transition-colors leading-none">{friend.displayName}</h4>
              {friendBadges[0] && <BadgePill badge={friendBadges[0]} size="sm" />}
            </div>
            <p className="text-[9px] text-[#facc15]/70 mt-0.5 font-bold">@{friend.username} · Online</p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={() => setSelectedUserForProfile({ username: friend.username, displayName: friend.displayName, avatar: friendAvatarFinal })}
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-[#facc15] transition-all active:scale-90" title="View Profile">
            <User size={13} />
          </button>
          <button onClick={handleClear}
            className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-all active:scale-90" title="Clear conversation">
            <Trash2 size={13} />
          </button>
          <button onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all active:scale-90">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-3 bg-[#090a0d]">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-6 animate-fade-in">
            <div className="relative">
              <UserAvatar avatarKeyOrUrl={friendAvatarFinal} name={friend.displayName} size="lg" isSubscribed={friendSub.active} />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-[#090a0d] bg-[#facc15] animate-pulse-glow" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {friendRoleTag && (
                <span className={`text-[10px] font-black uppercase ${friendRoleTag.colorClass}`}>{friendRoleTag.tag}</span>
              )}
              <p className="text-xs font-black text-white">{friend.displayName}</p>
              {friendBadges[0] && <BadgePill badge={friendBadges[0]} size="sm" />}
            </div>
            <p className="text-[10px] text-gray-500 max-w-[180px] leading-relaxed font-medium">
              Start of your conversation with {friend.displayName}. Say hi! 👋
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const dateStr = fmtDate(msg.timestamp);
          const showDate = dateStr !== lastDateStr;
          lastDateStr = dateStr;

          const isMe = msg.sender.toLowerCase() === myUsername.toLowerCase() || msg.sender === 'me';
          const senderBadges = isMe ? myBadges : friendBadges;
          const senderAvatar = isMe ? myAvatarFinal : friendAvatarFinal;
          const senderName = isMe ? myDisplayName : friend.displayName;
          const senderUsername = isMe ? myUsername : friend.username;
          const isSenderSubscribed = isMe ? mySub.active : friendSub.active;
          const senderRoleTag = isMe ? myRoleTag : friendRoleTag;

          const delay = Math.min(idx, 8) * 30;

          return (
            <div key={msg.id} style={{ animationDelay: `${delay}ms` }}>
              {showDate && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#2c2e38]" />
                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{dateStr}</span>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#2c2e38]" />
                </div>
              )}

              <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse animate-slide-in-right' : 'flex-row animate-slide-in-left'}`}
                style={{ animationDelay: `${delay}ms` }}>
                <button
                  type="button"
                  onClick={() => setSelectedUserForProfile({ username: senderUsername, displayName: senderName, avatar: senderAvatar })}
                  className="flex-shrink-0 hover:scale-110 transition-transform active:scale-90"
                  title={`View @${senderUsername}'s profile`}
                >
                  <UserAvatar avatarKeyOrUrl={senderAvatar} name={senderName} size="sm" isSubscribed={isSenderSubscribed} />
                </button>

                <div className={`flex flex-col max-w-[76%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1 mb-1 px-0.5">
                    {!isMe && senderRoleTag && (
                      <span className={`text-[8px] font-black uppercase ${senderRoleTag.colorClass}`}>{senderRoleTag.tag}</span>
                    )}
                    <span className="text-[9px] font-black text-gray-400">
                      {isMe ? 'You' : senderName}
                    </span>
                    {senderBadges[0] && <BadgePill badge={senderBadges[0]} size="sm" />}
                  </div>

                  <div className={`px-3 py-2 text-[11.5px] font-medium leading-relaxed shadow-lg break-words ${
                    isMe
                      ? 'bg-[#facc15] text-black font-semibold rounded-2xl rounded-br-md'
                      : 'bg-[#1a1c24] border border-[#2c2e38] text-gray-100 rounded-2xl rounded-bl-md'
                  }`}
                    style={isMe ? { boxShadow: '0 4px 16px rgba(250,204,21,0.2)' } : {}}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-gray-600 mt-1 px-1">{fmt(msg.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-2.5 bg-[#0a0b0f] border-t border-[#1e2028] flex gap-2 flex-shrink-0 items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={`Message ${friend.displayName}...`}
          className="flex-1 bg-[#14151c] border border-[#2c2e38] rounded-xl px-3 py-2 text-[11.5px] text-white outline-none focus:border-[#facc15]/60 focus:bg-[#1a1b24] transition-all font-medium placeholder:text-gray-600"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-[#facc15] text-black rounded-xl hover:bg-yellow-300 transition-all flex-shrink-0 disabled:opacity-30 shadow-md shadow-yellow-500/20 active:scale-90 hover:scale-105"
        >
          <Send size={14} />
        </button>
      </form>

      {selectedUserForProfile && (
        <UserProfileModal
          username={selectedUserForProfile.username}
          displayName={selectedUserForProfile.displayName}
          avatar={selectedUserForProfile.avatar}
          onClose={() => setSelectedUserForProfile(null)}
        />
      )}
    </div>
  );
}
