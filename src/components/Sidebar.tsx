import { Home, Compass, Library, Plus, Settings, Users, User, Sparkles, Gamepad2 } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onPlusClick?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onPlusClick }: SidebarProps) {
  // Main Instance & Launcher Navigation
  const gameNav = [
    { id: 'home', icon: <Home size={20} />, label: 'Dashboard' },
    { id: 'library', icon: <Library size={20} />, label: 'Library' },
    { id: 'search', icon: <Compass size={20} />, label: 'Discover' },
  ];

  // Community & Social Hub
  const socialNav = [
    { id: 'friends', icon: <Users size={20} />, label: 'Friends Hub' },
    { id: 'suggestions', icon: <Sparkles size={20} />, label: 'Suggestions Forum' },
    { id: 'profile', icon: <User size={20} />, label: 'My Profile' },
  ];

  // System & Accounts Footer
  const systemNav = [
    { id: 'accounts', icon: <Gamepad2 size={20} />, label: 'Minecraft Accounts' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const renderNavButton = (item: { id: string; icon: any; label: string }) => {
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        title={item.label}
        className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
          isActive
            ? 'bg-[#facc15] text-black shadow-lg shadow-yellow-400/25 font-bold'
            : 'text-gray-400 hover:text-white hover:bg-[#1c1d22]'
        }`}
      >
        {item.icon}
        {isActive && (
          <div className="absolute -left-1.5 w-1 h-5 rounded-r-full bg-[#facc15]" />
        )}
      </button>
    );
  };

  return (
    <div className="w-[62px] h-full flex flex-col items-center py-3 bg-[#0e0f13] border-r border-[#1e2028] select-none flex-shrink-0">
      {/* Brand Icon */}
      <button
        onClick={() => setActiveTab('home')}
        className="mb-3 mt-1 w-10 h-10 rounded-2xl bg-[#1c1d22] border border-[#2e303b] flex items-center justify-center p-1.5 hover:border-[#facc15]/50 transition-all active:scale-95 shadow-md"
        title="Revival Launcher Dashboard"
      >
        <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
      </button>

      {/* Main Navigation Section */}
      <div className="flex-1 flex flex-col items-center gap-1.5 w-full px-1.5 overflow-y-auto no-scrollbar">
        {/* Section 1: Launcher & Game Navigation */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          {gameNav.map(renderNavButton)}

          {/* New Instance Plus Button */}
          <button
            onClick={onPlusClick}
            title="Create New Instance"
            className="w-11 h-11 rounded-2xl border border-dashed border-[#343744] hover:border-[#facc15]/70 text-gray-500 hover:text-[#facc15] flex items-center justify-center transition-all hover:bg-[#facc15]/5 active:scale-95 mt-0.5"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Section Divider */}
        <div className="w-6 h-px bg-[#2c2e38] my-2" />

        {/* Section 2: Social & Community Hub */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          {socialNav.map(renderNavButton)}
        </div>
      </div>

      {/* Section Divider */}
      <div className="w-6 h-px bg-[#2c2e38] my-2" />

      {/* Section 3: Footer System & Accounts */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
        {systemNav.map(renderNavButton)}
      </div>
    </div>
  );
}
