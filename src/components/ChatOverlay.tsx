import { useState, useEffect, useRef } from 'react';
import { Send, X, Trash2, User } from 'lucide-react';
import type { Friend } from './SocialSidebar';
import { getBadgesForUser, getRoleTag } from '../utils/badges';
import { getSubscription } from '../utils/subscription';
import { UserAvatar } from './UserAvatar';
import { BadgePill } from './BadgePill';
import { UserProfileModal } from './UserProfileModal';

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

  // Live sync: poll localStorage every 1.5s for new messages from the other user
  useEffect(() => {
    const chatKey = getChatKey(myUsername, friend.username);

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
    <div className="fixed bottom-4 right-[270px] w-88 h-[460px] bg-[#14151b] border border-[#facc15]/30 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-[#0c0d11] border-b border-[#2c2e38] px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setSelectedUserForProfile({ username: friend.username, displayName: friend.displayName, avatar: friendAvatarFinal })}
          title="Click to view profile"
        >
          <UserAvatar
            avatarKeyOrUrl={friendAvatarFinal}
            name={friend.displayName}
            size="sm"
            isSubscribed={friendSub.active}
          />
          <div>
            <div className="flex items-center gap-1.5">
              {friendRoleTag && (
                <span className={`text-[10px] font-black uppercase ${friendRoleTag.colorClass}`}>
                  {friendRoleTag.tag}
                </span>
              )}
              <h4 className="font-black text-xs text-white leading-none">{friend.displayName}</h4>
              {friendBadges[0] && (
                <BadgePill badge={friendBadges[0]} size="sm" />
              )}
            </div>
            <p className="text-[9px] text-[#facc15] mt-0.5 font-bold">@{friend.username} · Online</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedUserForProfile({ username: friend.username, displayName: friend.displayName, avatar: friendAvatarFinal })}
            title="View Profile"
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-[#facc15] transition-colors"
          >
            <User size={13} />
          </button>
          <button
            onClick={handleClear}
            title="Clear conversation"
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-3 bg-[#0e0f14]/80">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-6">
            <UserAvatar
              avatarKeyOrUrl={friendAvatarFinal}
              name={friend.displayName}
              size="lg"
              isSubscribed={friendSub.active}
            />
            <div className="flex items-center gap-1.5">
              {friendRoleTag && (
                <span className={`text-[10px] font-black uppercase ${friendRoleTag.colorClass}`}>
                  {friendRoleTag.tag}
                </span>
              )}
              <p className="text-xs font-black text-white">{friend.displayName}</p>
              {friendBadges[0] && (
                <BadgePill badge={friendBadges[0]} size="sm" />
              )}
            </div>
            <p className="text-[10px] text-gray-400 max-w-[200px] leading-relaxed">
              This is the start of your direct conversation. Say hello!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const dateStr = fmtDate(msg.timestamp);
          const showDate = dateStr !== lastDateStr;
          lastDateStr = dateStr;

          const isMe = msg.sender.toLowerCase() === myUsername.toLowerCase()
            || msg.sender === 'me';
          const senderBadges = isMe ? myBadges : friendBadges;
          const senderAvatar = isMe ? myAvatarFinal : friendAvatarFinal;
          const senderName = isMe ? myDisplayName : friend.displayName;
          const senderUsername = isMe ? myUsername : friend.username;
          const isSenderSubscribed = isMe ? mySub.active : friendSub.active;
          const senderRoleTag = isMe ? myRoleTag : friendRoleTag;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-[#2c2e38]" />
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{dateStr}</span>
                  <div className="flex-1 h-px bg-[#2c2e38]" />
                </div>
              )}

              {/* Message Row with Profile Picture next to bubble */}
              <div className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Clickable Profile Picture */}
                <button
                  type="button"
                  onClick={() => setSelectedUserForProfile({ username: senderUsername, displayName: senderName, avatar: senderAvatar })}
                  className="flex-shrink-0 hover:scale-105 transition-transform mt-0.5"
                  title={`View @${senderUsername}'s profile`}
                >
                  <UserAvatar
                    avatarKeyOrUrl={senderAvatar}
                    name={senderName}
                    size="sm"
                    isSubscribed={isSenderSubscribed}
                  />
                </button>

                {/* Message Content Container */}
                <div className={`flex flex-col max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Header */}
                  <div className="flex items-center gap-1.5 mb-1 px-0.5">
                    {senderRoleTag && (
                      <span className={`text-[8.5px] font-black uppercase ${senderRoleTag.colorClass}`}>
                        {senderRoleTag.tag}
                      </span>
                    )}
                    <span className="text-[9px] font-black text-gray-300">
                      {isMe ? 'You' : senderName}
                    </span>
                    {senderBadges[0] && (
                      <BadgePill badge={senderBadges[0]} size="sm" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`px-3 py-2 rounded-2xl text-[11px] font-medium leading-relaxed shadow-md break-words ${
                    isMe
                      ? 'bg-[#facc15] text-black font-semibold rounded-tr-xs'
                      : 'bg-[#1c1e27] border border-[#2c2e38] text-gray-100 rounded-tl-xs'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-gray-500 mt-0.5 px-1">{fmt(msg.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-2.5 bg-[#0c0d11] border-t border-[#2c2e38] flex gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={`Message ${friend.displayName}...`}
          className="flex-1 bg-[#181920] border border-[#2c2e38] rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-[#facc15] transition-all font-medium"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-[#facc15] text-black rounded-xl hover:bg-yellow-300 transition-all flex-shrink-0 disabled:opacity-40 shadow-sm active:scale-95"
        >
          <Send size={13} />
        </button>
      </form>

      {/* User Profile Modal when clicking profile icon or header */}
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
