import { Home, Compass, Library, Plus, Settings, Users, User } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onPlusClick?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onPlusClick }: SidebarProps) {
  const primaryNav = [
    { id: 'home',    icon: <Home size={22} />,    label: 'Dashboard' },
    { id: 'library', icon: <Library size={22} />, label: 'Library' },
    { id: 'search',  icon: <Compass size={22} />, label: 'Discover' },
    { id: 'profile', icon: <User size={22} />,    label: 'Profile' },
  ];

  return (
    <div className="w-[62px] h-full flex flex-col items-center py-3 bg-[#0e0f13] border-r border-[#1e2028] select-none flex-shrink-0">
      {/* Brand Icon */}
      <button
        onClick={() => setActiveTab('home')}
        className="mb-4 mt-1 w-10 h-10 rounded-2xl bg-[#1c1d22] border border-[#2e303b] flex items-center justify-center p-1.5 hover:border-[#facc15]/50 transition-all"
        title="Revival Launcher"
      >
        <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
      </button>

      {/* Primary Navigation Icons */}
      <div className="flex-1 flex flex-col items-center gap-2 w-full px-1.5">
        {primaryNav.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-[#facc15] text-black shadow-lg shadow-yellow-400/25'
                  : 'text-gray-500 hover:text-white hover:bg-[#1c1d22]'
              }`}
            >
              {item.icon}
              {isActive && (
                <div className="absolute -left-1.5 w-1 h-5 rounded-r-full bg-[#facc15]" />
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-6 h-px bg-[#2c2e38] my-1" />

        {/* Add Instance */}
        <button
          onClick={onPlusClick}
          title="New Instance"
          className="w-11 h-11 rounded-2xl border border-dashed border-[#343744] hover:border-[#facc15]/60 text-gray-500 hover:text-[#facc15] flex items-center justify-center transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Footer Icons */}
      <div className="flex flex-col items-center gap-2 w-full px-1.5 mt-2">
        <button
          onClick={() => setActiveTab('accounts')}
          title="Accounts"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            activeTab === 'accounts'
              ? 'bg-[#facc15] text-black shadow-lg shadow-yellow-400/25'
              : 'text-gray-500 hover:text-white hover:bg-[#1c1d22]'
          }`}
        >
          <Users size={20} />
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          title="Settings"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            activeTab === 'settings'
              ? 'bg-[#facc15] text-black shadow-lg shadow-yellow-400/25'
              : 'text-gray-500 hover:text-white hover:bg-[#1c1d22]'
          }`}
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}
