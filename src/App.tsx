import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { HomeTab } from './components/HomeTab';
import { SearchTab } from './components/SearchTab';
import { SettingsTab } from './components/SettingsTab';
import { AccountsTab } from './components/AccountsTab';
import { InstanceViewTab } from './components/InstanceViewTab';
import { LibraryTab } from './components/LibraryTab';
import { ProfileTab } from './components/ProfileTab';
import { AuthScreen } from './components/AuthScreen';
import { ChatOverlay } from './components/ChatOverlay';
import { TitleBar } from './components/TitleBar';
import { CreateInstanceModal } from './components/CreateInstanceModal';
import { ImportModal } from './components/ImportModal';
import { SocialSidebar } from './components/SocialSidebar';
import type { Friend } from './components/SocialSidebar';
import { safeInvoke } from './utils/tauri';
import { applyTheme } from './utils/theme';

export interface Instance {
  name: string;
  mc_version: string;
  loader: string;
  loader_version: string;
  last_played?: string | null;
}

const PAGE_LABELS: Record<string, string> = {
  home: 'Dashboard',
  library: 'Library',
  search: 'Discover',
  profile: 'Profile',
  'instance-view': 'Instance',
  accounts: 'Accounts',
  settings: 'Settings',
};

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [tabHistory, setTabHistory] = useState<string[]>(['home']);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [instancesRunning, setInstancesRunning] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Authentication & Chat overlay states (Persists 1-time login permanently)
  const [currentUser, setCurrentUser] = useState<{ username: string; displayName: string; avatar: string } | null>(() => {
    try {
      const saved = localStorage.getItem('revival_user');
      if (saved) return JSON.parse(saved);
      // Persistent default account on 1st run
      const defaultUser = { username: 'vix', displayName: 'vix', avatar: 'crown' };
      localStorage.setItem('revival_user', JSON.stringify(defaultUser));
      return defaultUser;
    } catch {
      return { username: 'vix', displayName: 'vix', avatar: 'crown' };
    }
  });
  const [activeChatFriend, setActiveChatFriend] = useState<Friend | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const cfg = await safeInvoke<any>('load_config');
        setConfig(cfg);
        applyTheme(cfg);
      } catch (err) {
        console.error('Failed to load config:', err);
      }
    };
    fetchConfig();
  }, []);

  const navigateTo = (tab: string) => {
    setTabHistory(prev => {
      const next = [...prev];
      if (next[next.length - 1] !== tab) next.push(tab);
      return next;
    });
    if (tab !== 'instance-view' && tab !== 'search') setSelectedInstance(null);
    setActiveTab(tab);
  };

  const handleBack = () => {
    setTabHistory(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const lastTab = next[next.length - 1];
      setActiveTab(lastTab);
      if (lastTab !== 'instance-view' && lastTab !== 'search') setSelectedInstance(null);
      return next;
    });
  };

  const handleSaveConfig = async (newCfg: any) => {
    setConfig(newCfg);
    applyTheme(newCfg);
    try {
      await safeInvoke('save_config', { config: newCfg });
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  const handleLaunch = async (name: string) => {
    try {
      setInstancesRunning(n => n + 1);
      await safeInvoke('launch_instance', { name });
      setTimeout(() => setInstancesRunning(n => Math.max(0, n - 1)), 5000);
    } catch (err) {
      setInstancesRunning(n => Math.max(0, n - 1));
      console.error('Launch failed:', err);
    }
  };

  const canGoBack = tabHistory.length > 1;
  const currentPageLabel = activeTab === 'instance-view' && selectedInstance
    ? selectedInstance.name
    : PAGE_LABELS[activeTab] || 'Home';

  // If not authenticated, force AuthScreen overlay
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={setCurrentUser} />;
  }

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden relative">
      <TitleBar
        currentPage={currentPageLabel}
        canGoBack={canGoBack}
        onBack={handleBack}
        instancesRunning={instancesRunning}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={navigateTo}
          onPlusClick={() => setShowCreateModal(true)}
        />

        <main className="flex-1 overflow-y-auto no-scrollbar bg-[#111216] p-6">
          {activeTab === 'home' && (
            <HomeTab
              onSelectInstance={(inst) => {
                setSelectedInstance(inst);
                navigateTo('instance-view');
              }}
              onLaunch={handleLaunch}
            />
          )}
          {activeTab === 'library' && (
            <LibraryTab
              onSelectInstance={(inst) => {
                setSelectedInstance(inst);
                navigateTo('instance-view');
              }}
              onLaunch={handleLaunch}
              refreshTrigger={refreshTrigger}
            />
          )}
          {activeTab === 'search' && (
            <SearchTab
              activeInstance={selectedInstance}
              onSelectInstance={setSelectedInstance}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileTab
              user={currentUser}
              onUpdateUser={setCurrentUser}
              onSignOut={() => {
                localStorage.removeItem('revival_user');
                setCurrentUser(null);
              }}
            />
          )}
          {activeTab === 'instance-view' && selectedInstance && (
            <InstanceViewTab
              instance={selectedInstance}
              onBack={handleBack}
              onLaunch={handleLaunch}
            />
          )}
          {activeTab === 'accounts' && <AccountsTab />}
          {activeTab === 'settings' && config && (
            <SettingsTab config={config} onSaveConfig={handleSaveConfig} />
          )}
        </main>

        <SocialSidebar
          user={currentUser}
          onStartChat={setActiveChatFriend}
          onSignOut={() => {
            localStorage.removeItem('revival_user');
            setCurrentUser(null);
          }}
          onNavigateToTab={navigateTo}
        />
      </div>

      {showCreateModal && (
        <CreateInstanceModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (name, mcVersion, loader, loaderVersion) => {
            try {
              await safeInvoke('create_instance', { name, mc_version: mcVersion, loader, loader_version: loaderVersion });
              setShowCreateModal(false);
              setRefreshTrigger(v => v + 1);
            } catch (err) {
              alert('Failed to create instance: ' + err);
            }
          }}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            setRefreshTrigger(v => v + 1);
          }}
        />
      )}

      {/* Floating Chat Overlay */}
      {activeChatFriend && (
        <ChatOverlay
          friend={activeChatFriend}
          myUsername={currentUser.username}
          onClose={() => setActiveChatFriend(null)}
        />
      )}
    </div>
  );
}

export default App;
