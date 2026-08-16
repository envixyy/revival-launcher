import { useState, useEffect } from 'react';
import { Save, Activity, Clock, ShieldCheck, Heart } from 'lucide-react';

interface ProfileTabProps {
  user: { username: string; displayName: string; avatar: string };
  onUpdateUser: (user: { username: string; displayName: string; avatar: string }) => void;
}

const AVATARS = [
  '🦁', '🦊', '🐻', '🐼', '🐨', '🐯', '🐰', '🦄', '🐙', '🦄', '🐙', '🦖'
];

export function ProfileTab({ user, onUpdateUser }: ProfileTabProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatar, setAvatar] = useState(user.avatar);
  const [statusMsg, setStatusMsg] = useState('Exploring modpacks on Revival...');
  const [statusType, setStatusType] = useState<'online' | 'idle' | 'dnd' | 'offline'>('online');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(user.displayName);
    setAvatar(user.avatar);
    const savedStatus = localStorage.getItem('revival_user_status');
    if (savedStatus) setStatusMsg(savedStatus);
    const savedType = localStorage.getItem('revival_user_type');
    if (savedType) setStatusType(savedType as any);
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      username: user.username,
      displayName: displayName.trim() || user.username,
      avatar: avatar,
    };
    localStorage.setItem('revival_user', JSON.stringify(updated));
    localStorage.setItem('revival_user_status', statusMsg);
    localStorage.setItem('revival_user_type', statusType);
    onUpdateUser(updated);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const statusColors = {
    online: 'bg-[#facc15]',
    idle: 'bg-amber-500',
    dnd: 'bg-red-500',
    offline: 'bg-gray-600',
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl pb-8">
      {/* Banner */}
      <div className="relative bg-gradient-to-r from-amber-600 to-yellow-400 h-36 rounded-3xl overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-4 left-6 flex items-end gap-4">
          <div className="w-18 h-18 rounded-2xl bg-[#16171d] border-2 border-[#facc15] flex items-center justify-center text-4xl shadow-xl">
            {avatar}
          </div>
          <div className="pb-1">
            <h1 className="text-xl font-black text-white leading-tight flex items-center gap-2">
              {user.displayName}
              <span className={`w-3 h-3 rounded-full ${statusColors[statusType]}`} />
            </h1>
            <p className="text-xs text-yellow-100 font-medium">@{user.username}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form Column */}
        <form onSubmit={handleSave} className="md:col-span-2 space-y-5 bg-[#1c1d22] border border-[#2c2e38] p-6 rounded-3xl shadow-md">
          <h3 className="font-extrabold text-sm text-white mb-2">Edit Profile Info</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display Name"
                className="w-full bg-[#16171d] border border-[#2c2e38] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#facc15]/60 transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                Status Message
              </label>
              <input
                type="text"
                value={statusMsg}
                onChange={e => setStatusMsg(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full bg-[#16171d] border border-[#2c2e38] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#facc15]/60 transition-all font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                  Presence Status
                </label>
                <select
                  value={statusType}
                  onChange={e => setStatusType(e.target.value as any)}
                  className="w-full bg-[#16171d] border border-[#2c2e38] rounded-xl p-2.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="online">Online</option>
                  <option value="idle">Idle</option>
                  <option value="dnd">Do Not Disturb</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                  Avatar Icon
                </label>
                <div className="flex flex-wrap gap-1 bg-[#16171d] border border-[#2c2e38] rounded-xl p-1.5 max-h-24 overflow-y-auto no-scrollbar justify-center">
                  {AVATARS.map(av => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatar(av)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-base transition-all ${
                        avatar === av ? 'bg-[#facc15] text-black scale-105' : 'hover:bg-white/5'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs shadow-md shadow-yellow-500/10 flex items-center gap-1.5 transition-all"
            >
              <Save size={13} />
              Save Profile
            </button>
            {saved && (
              <span className="text-xs text-green-400 font-bold animate-fade-in flex items-center gap-1">
                <ShieldCheck size={14} /> Saved successfully!
              </span>
            )}
          </div>
        </form>

        {/* Right Stats Column */}
        <div className="space-y-4">
          <div className="bg-[#1c1d22] border border-[#2c2e38] p-5 rounded-3xl shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} className="text-[#facc15]" />
              <h4 className="font-extrabold text-xs text-white">Revival Network Stats</h4>
            </div>
            <div className="space-y-3 text-[11px]">
              <div className="flex justify-between items-center py-1.5 border-b border-[#2c2e38]">
                <span className="text-gray-400">Total Play Time</span>
                <span className="font-bold text-white flex items-center gap-1"><Clock size={11} /> 14.5 hours</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#2c2e38]">
                <span className="text-gray-400">Instances Run</span>
                <span className="font-bold text-white">42 times</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-400">Account Type</span>
                <span className="font-bold text-[#facc15]">Premium Member</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1c1d22] border border-[#2c2e38] p-5 rounded-3xl shadow-md flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Heart size={20} className="text-red-400 fill-red-400/25" />
            </div>
            <div>
              <h5 className="font-extrabold text-xs text-white leading-none">Supporter Perks</h5>
              <p className="text-[10px] text-gray-400 mt-1">Unlock animated name colors and supporter badges!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
