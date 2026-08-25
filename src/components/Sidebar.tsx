import { useState } from 'react';
import { Home, Compass, Library, Plus, Settings, Users, User, Sparkles, Gamepad2 } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onPlusClick?: () => void;
}

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

export function Sidebar({ activeTab, setActiveTab, onPlusClick }: SidebarProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [tooltipY, setTooltipY] = useState(0);

  // Main Instance & Launcher Navigation
  const gameNav: NavItem[] = [
    { id: 'home',    icon: <Home size={19} />,    label: 'Dashboard' },
    { id: 'library', icon: <Library size={19} />, label: 'Library' },
    { id: 'search',  icon: <Compass size={19} />, label: 'Discover' },
  ];

  // Community & Social Hub
  const socialNav: NavItem[] = [
    { id: 'friends',     icon: <Users size={19} />,    label: 'Friends Hub' },
    { id: 'suggestions', icon: <Sparkles size={19} />, label: 'Suggestions' },
    { id: 'profile',     icon: <User size={19} />,     label: 'My Profile' },
  ];

  // System & Accounts Footer
  const systemNav: NavItem[] = [
    { id: 'accounts', icon: <Gamepad2 size={19} />, label: 'MC Accounts' },
    { id: 'settings', icon: <Settings size={19} />, label: 'Settings' },
  ];

  const handleMouseEnter = (label: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipY(rect.top + rect.height / 2);
    setTooltip(label);
  };

  const renderNavButton = (item: NavItem) => {
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        onMouseEnter={e => handleMouseEnter(item.label, e)}
        onMouseLeave={() => setTooltip(null)}
        className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 group ${
          isActive
            ? 'bg-[#facc15] text-black shadow-lg shadow-yellow-400/30 scale-105'
            : 'text-gray-500 hover:text-white hover:bg-[#1c1d24] hover:scale-105 active:scale-95'
        }`}
        style={isActive ? { boxShadow: '0 0 16px rgba(250,204,21,0.25), 0 4px 12px rgba(0,0,0,0.3)' } : {}}
      >
        {/* Active indicator bar */}
        {isActive && (
          <div className="absolute -left-[7px] w-1 h-5 rounded-r-full bg-[#facc15] animate-fade-in-flat" />
        )}
        {/* Active pulse ring */}
        {isActive && (
          <div className="absolute inset-0 rounded-2xl border-2 border-yellow-400/30 animate-pulse-glow pointer-events-none" />
        )}
        {item.icon}
      </button>
    );
  };

  return (
    <div className="w-[62px] h-full flex flex-col items-center py-3 bg-[#0a0b0e] border-r border-[#1a1b22] select-none flex-shrink-0 relative"
      style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.4)' }}
    >
      {/* Floating Tooltip */}
      {tooltip && (
        <div
          className="fixed left-[70px] z-[200] pointer-events-none animate-slide-in-right"
          style={{ top: tooltipY - 14 }}
        >
          <div className="bg-[#0d0e12] border border-[#2c2e38] text-white text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-2xl whitespace-nowrap"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
          >
            {tooltip}
            {/* Arrow */}
            <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0d0e12] border-l border-b border-[#2c2e38] rotate-45" />
          </div>
        </div>
      )}

      {/* Brand Logo */}
      <button
        onClick={() => setActiveTab('home')}
        onMouseEnter={e => handleMouseEnter('Revival Launcher', e)}
        onMouseLeave={() => setTooltip(null)}
        className="mb-4 mt-1 w-10 h-10 rounded-2xl bg-[#1a1b22] border border-[#2c2e38] flex items-center justify-center p-1.5 hover:border-[#facc15]/60 transition-all active:scale-90 hover:scale-105"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
      >
        <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
      </button>

      {/* Main Navigation */}
      <div className="flex-1 flex flex-col items-center gap-1.5 w-full px-1.5 overflow-y-auto no-scrollbar">

        {/* Section 1: Launcher */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          {gameNav.map(renderNavButton)}

          {/* New Instance Plus Button */}
          <button
            onClick={onPlusClick}
            onMouseEnter={e => handleMouseEnter('New Instance', e)}
            onMouseLeave={() => setTooltip(null)}
            className="w-11 h-11 rounded-2xl border-2 border-dashed border-[#2c2e38] hover:border-[#facc15]/60 text-gray-600 hover:text-[#facc15] flex items-center justify-center transition-all duration-200 hover:bg-[#facc15]/5 hover:scale-105 active:scale-95 mt-1"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Divider */}
        <div className="w-7 h-px bg-gradient-to-r from-transparent via-[#2c2e38] to-transparent my-2" />

        {/* Section 2: Social */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          {socialNav.map(renderNavButton)}
        </div>
      </div>

      {/* Divider */}
      <div className="w-7 h-px bg-gradient-to-r from-transparent via-[#2c2e38] to-transparent my-2" />

      {/* Section 3: System */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
        {systemNav.map(renderNavButton)}
      </div>
    </div>
  );
}
