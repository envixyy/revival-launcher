import { useEffect, useState, useRef } from 'react';
import { Play, Settings2, Plus, RefreshCw, Terminal, X, UserCircle, Newspaper, Users, ExternalLink, StopCircle, ChevronDown, Upload, FolderOpen, Copy, Trash2 } from 'lucide-react';
import { safeInvoke, isElectron } from '../utils/tauri';
import { CreateInstanceModal } from './CreateInstanceModal';
import { InstanceSettingsModal } from './InstanceSettingsModal';
import { ImportModal } from './ImportModal';

interface Instance {
  name: string;
  mc_version: string;
  loader: string;
  loader_version: string;
  max_memory?: number;
  min_memory?: number;
  java_path?: string | null;
  last_played?: string | null;
}

interface Account {
  id: string;
  type: 'microsoft' | 'offline';
  username: string;
  uuid: string;
  access_token: string;
}

interface AccountData {
  accounts: Account[];
  active_id: string | null;
}

interface HomeTabProps {
  onSelectInstance?: (instance: Instance) => void;
  onLaunch?: (name: string) => void;
  onStartChat?: (friendName: string) => void;
}

const NEWS_ITEMS = [
  {
    tag: 'UPDATE',
    title: 'Revival Launcher v0.1.0 Released',
    body: 'Full Modrinth + CurseForge integration, Prism backend, one-click mod installs.',
    url: 'https://github.com',
    date: 'Aug 2026',
  },
  {
    tag: 'MINECRAFT',
    title: 'Minecraft 1.21.4 is Now Available',
    body: 'The latest Minecraft release is supported. Create a new instance to try it out.',
    url: 'https://minecraft.net',
    date: 'Aug 2026',
  },
];

function loaderIcon(loader: string) {
  if (loader === 'Fabric') return '🧵';
  if (loader === 'Forge') return '🔨';
  if (loader === 'Quilt') return '🪡';
  if (loader === 'NeoForge') return '⚙️';
  return '🌳';
}

function AvatarPill({ name }: { name: string }) {
  const colors = ['#b45309','#1d4ed8','#7c3aed','#be185d','#0f766e'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
      style={{ background: colors[idx] }}
    >
      {name[0].toUpperCase()}
    </div>
  );
}

// Stop/Kill dropdown button for running instances
function RunningButtons({ name: _name, onStop, onKill }: { name: string; onStop: () => void; onKill: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center">
      {/* Main Stop button */}
      <button
        onClick={onStop}
        className="flex items-center gap-1.5 pl-4 pr-2 py-2 rounded-l-xl bg-red-500 hover:bg-red-400 text-white font-extrabold text-sm shadow-lg shadow-red-500/25 transition-all active:scale-95"
      >
        <StopCircle size={14} />
        Stop
      </button>
      {/* Dropdown arrow */}
      <button
        onClick={() => setOpen(v => !v)}
        className="py-2 px-1.5 rounded-r-xl bg-red-600 hover:bg-red-500 text-white border-l border-red-700 transition-all"
      >
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-[#16171d] border border-[#2c2e38] rounded-xl shadow-2xl z-30 overflow-hidden animate-fade-in">
          <button
            onClick={() => { setOpen(false); onStop(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors"
          >
            <StopCircle size={13} className="text-red-400" />
            Stop (graceful)
          </button>
          <button
            onClick={() => { setOpen(false); onKill(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border-t border-[#2c2e38]"
          >
            <X size={13} />
            Force Kill
          </button>
        </div>
      )}
    </div>
  );
}

// Per-instance context menu (right-click or ⋮ button)
function InstanceMenu({ instance: _instance, onSettings, onDuplicate, onDelete, onOpenFolder }: {
  instance: Instance;
  onSettings: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenFolder: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-2 rounded-lg bg-[#262830] hover:bg-[#343744] text-gray-400 hover:text-white transition-colors"
        title="More options"
      >
        <Settings2 size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-[#16171d] border border-[#2c2e38] rounded-xl shadow-2xl z-30 overflow-hidden animate-fade-in">
          <button onClick={() => { setOpen(false); onSettings(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors">
            <Settings2 size={13} className="text-gray-400" /> Settings
          </button>
          <button onClick={() => { setOpen(false); onOpenFolder(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors">
            <FolderOpen size={13} className="text-gray-400" /> Open Folder
          </button>
          <button onClick={() => { setOpen(false); onDuplicate(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors border-t border-[#2c2e38]">
            <Copy size={13} className="text-gray-400" /> Duplicate
          </button>
          <button onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border-t border-[#2c2e38]">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function HomeTab({ onSelectInstance: _onSelectInstance, onLaunch, onStartChat }: HomeTabProps) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeInstanceForSettings, setActiveInstanceForSettings] = useState<Instance | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [runningInstances, setRunningInstances] = useState<Set<string>>(new Set());
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const [accountData, setAccountData] = useState<AccountData>({ accounts: [], active_id: null });
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const data = await safeInvoke<Instance[]>('list_instances');
      setInstances(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await safeInvoke<AccountData>('list_accounts');
      setAccountData(res);
    } catch {}
  };

  // Sync running instances from backend on mount
  const syncRunning = async () => {
    try {
      const running = await safeInvoke<string[]>('list_running');
      setRunningInstances(new Set(running ?? []));
    } catch {}
  };

  useEffect(() => {
    fetchInstances();
    fetchAccounts();
    syncRunning();

    if (isElectron()) {
      (window as any).electronAPI.onLog((log: string) => {
        setConsoleLogs(prev => [...prev.slice(-150), log]);
        setShowConsole(true);
      });
      (window as any).electronAPI.onProgress((progress: any) => {
        if (progress) {
          const pct = Math.round((progress.task / progress.total) * 100) || 0;
          setConsoleLogs(prev => [...prev.slice(-150), `[DOWNLOAD] ${pct}% — ${progress.type}`]);
          setShowConsole(true);
        }
      });
      // Listen for instance state changes
      const api = (window as any).electronAPI;
      if (api.onInstanceState) {
        api.onInstanceState((data: { name: string; running: boolean }) => {
          setRunningInstances(prev => {
            const next = new Set(prev);
            if (data.running) next.add(data.name);
            else { next.delete(data.name); fetchInstances(); }
            return next;
          });
        });
      }
    }
    return () => {
      if (isElectron()) {
        (window as any).electronAPI.removeListeners?.();
        (window as any).electronAPI.removeInstanceListeners?.();
      }
    };
  }, []);

  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs, showConsole]);

  const handleCreate = async (name: string, mcVersion: string, loader: string, loaderVersion: string) => {
    try {
      await safeInvoke('create_instance', { name, mc_version: mcVersion, loader, loader_version: loaderVersion });
      setShowCreateModal(false);
      fetchInstances();
    } catch (err) {
      alert('Failed to create instance: ' + err);
    }
  };

  const handleLaunch = async (name: string) => {
    setConsoleLogs([`▶ Starting "${name}"...`]);
    setShowConsole(true);
    setRunningInstances(prev => new Set([...prev, name]));
    if (onLaunch) onLaunch(name);
    try {
      const msg = await safeInvoke<string>('launch_instance', { name });
      setConsoleLogs(prev => [...prev, msg]);
      fetchInstances();
    } catch (err) {
      setRunningInstances(prev => { const n = new Set(prev); n.delete(name); return n; });
      setConsoleLogs(prev => [...prev, `[ERROR] ${err}`]);
    }
  };

  const handleStop = async (name: string) => {
    await safeInvoke('stop_instance', { name });
  };

  const handleKill = async (name: string) => {
    await safeInvoke('kill_instance', { name });
    setRunningInstances(prev => { const n = new Set(prev); n.delete(name); return n; });
  };

  const handleDuplicate = async (name: string) => {
    try {
      await safeInvoke('duplicate_instance', { name });
      fetchInstances();
    } catch (e) {
      alert('Duplicate failed: ' + e);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await safeInvoke('delete_instance', { name });
    fetchInstances();
  };

  const handleOpenFolder = async (name: string) => {
    await safeInvoke('open_instance_folder', { name });
  };

  const handleSetActiveAccount = async (id: string) => {
    try {
      await safeInvoke('set_active_account', { id });
      fetchAccounts();
      setShowAccountSwitcher(false);
    } catch {}
  };

  const activeAccount = accountData.accounts.find(a => a.id === accountData.active_id);

  return (
    <div className="animate-fade-in relative">
      {/* Console overlay */}
      {showConsole && (
        <div className="fixed bottom-5 right-5 w-96 bg-[#0d0e11] border border-[#facc15]/20 rounded-2xl shadow-2xl z-50 flex flex-col max-h-64 overflow-hidden">
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#1c1d22]">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-[#facc15]" />
              <span className="text-xs font-bold text-gray-300">Launch Log</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setConsoleLogs([])} className="text-[10px] text-gray-500 hover:text-gray-300 px-1 transition-colors">Clear</button>
              <button onClick={() => setShowConsole(false)} className="text-gray-500 hover:text-white transition-colors p-0.5"><X size={13} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2 font-mono text-[10px] space-y-0.5 select-text">
            {consoleLogs.map((log, idx) => (
              <div key={idx} className={`break-all leading-relaxed ${log.includes('[ERROR]') ? 'text-red-400' : log.includes('[DOWNLOAD]') ? 'text-[#facc15]' : 'text-slate-300'}`}>
                {log}
              </div>
            ))}
            <div ref={consoleBottomRef} />
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* ── Main column ── */}
        <div className="flex-1 space-y-5 min-w-0">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Welcome back!</h1>
              <p className="text-sm text-gray-400 mt-0.5">Jump back in</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1d22] border border-[#2c2e38] text-gray-400 hover:text-white hover:border-[#facc15]/40 transition-all text-xs font-bold"
                title="Import .mrpack or .zip"
              >
                <Upload size={13} /> Import
              </button>
              <button
                onClick={fetchInstances}
                className="p-2 rounded-xl bg-[#1c1d22] border border-[#2c2e38] text-gray-400 hover:text-white hover:border-[#facc15]/40 transition-all"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Instance rows */}
          <div className="space-y-2">
            {loading
              ? [1, 2].map(n => <div key={n} className="h-16 bg-[#1c1d22] rounded-2xl animate-pulse" />)
              : instances.length === 0
                ? (
                    <div className="bg-[#1c1d22] border border-[#2c2e38] rounded-2xl p-8 text-center">
                      <p className="text-sm text-gray-400 mb-3">No instances yet. Create or import one to get started.</p>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 rounded-xl bg-[#facc15] text-black font-bold text-xs hover:bg-yellow-300 transition-all flex items-center gap-1.5">
                          <Plus size={13} /> Create
                        </button>
                        <button onClick={() => setShowImportModal(true)} className="px-4 py-2 rounded-xl bg-[#1c1d22] border border-[#2c2e38] text-gray-300 font-bold text-xs hover:border-[#facc15]/40 transition-all flex items-center gap-1.5">
                          <Upload size={13} /> Import Pack
                        </button>
                      </div>
                    </div>
                  )
                : instances.map((inst, idx) => {
                    const isRunning = runningInstances.has(inst.name);
                    return (
                      <div
                        key={idx}
                        className={`border rounded-2xl px-4 py-3 flex items-center justify-between transition-all group cursor-pointer ${
                          isRunning
                            ? 'bg-[#facc15]/5 border-[#facc15]/30'
                            : 'bg-[#1c1d22] border-[#2c2e38] hover:border-[#facc15]/40'
                        }`}
                        onClick={(e) => {
                          const t = e.target as HTMLElement;
                          if (t.closest('button') || t.closest('[role="menu"]')) return;
                          if (_onSelectInstance) _onSelectInstance(inst);
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-[#262830] border border-[#343744] flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform">
                              {loaderIcon(inst.loader)}
                            </div>
                            {isRunning && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#facc15] ring-2 ring-[#111216] animate-pulse" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-sm text-white truncate group-hover:text-[#facc15] transition-colors">{inst.name}</p>
                              {isRunning && <span className="text-[10px] font-bold text-[#facc15] bg-[#facc15]/10 px-1.5 py-0.5 rounded-md">RUNNING</span>}
                            </div>
                            <p className="text-xs text-gray-400">{inst.mc_version} · {inst.loader || 'Vanilla'} · {inst.last_played ? new Date(inst.last_played).toLocaleDateString() : 'Never played'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <InstanceMenu
                            instance={inst}
                            onSettings={() => setActiveInstanceForSettings(inst)}
                            onDuplicate={() => handleDuplicate(inst.name)}
                            onDelete={() => handleDelete(inst.name)}
                            onOpenFolder={() => handleOpenFolder(inst.name)}
                          />
                          {isRunning ? (
                            <RunningButtons
                              name={inst.name}
                              onStop={() => handleStop(inst.name)}
                              onKill={() => handleKill(inst.name)}
                            />
                          ) : (
                            <button
                              onClick={() => handleLaunch(inst.name)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#facc15] hover:bg-[#fde047] text-black font-extrabold text-sm shadow-lg shadow-yellow-500/20 transition-all active:scale-95"
                            >
                              <Play size={14} fill="currentColor" />
                              Play
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
            }

            {instances.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 py-2.5 border-2 border-dashed border-[#2c2e38] hover:border-[#facc15]/50 rounded-2xl flex items-center justify-center gap-2 text-gray-400 hover:text-[#facc15] font-bold text-xs transition-all"
                >
                  <Plus size={14} /> Create New Instance
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex-1 py-2.5 border-2 border-dashed border-[#2c2e38] hover:border-[#facc15]/50 rounded-2xl flex items-center justify-center gap-2 text-gray-400 hover:text-[#facc15] font-bold text-xs transition-all"
                >
                  <Upload size={14} /> Import Pack
                </button>
              </div>
            )}
          </div>

          {/* Discover */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-white">Discover Featured Packs</h2>
              <button className="text-xs text-[#facc15] hover:underline font-semibold flex items-center gap-1">
                View all <ExternalLink size={11} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Origin Realms', icon: '⚔️', desc: 'Survival with custom biomes & quests.', gradient: 'from-emerald-950 to-slate-900' },
                { name: 'Cobblemon Official', icon: '🐲', desc: 'Open-world Pokémon for Fabric 1.20.1+', gradient: 'from-amber-950 to-slate-900' },
                { name: 'All of Fabric 6', icon: '🏗️', desc: 'Hundreds of Fabric mods, curated.', gradient: 'from-blue-950 to-slate-900' },
                { name: 'Better MC', icon: '🌿', desc: 'Vanilla+ quality of life improvements.', gradient: 'from-green-950 to-slate-900' },
              ].map(pack => (
                <div key={pack.name} className="bg-[#1c1d22] border border-[#2c2e38] hover:border-[#facc15]/40 rounded-2xl overflow-hidden group cursor-pointer transition-all">
                  <div className={`h-16 bg-gradient-to-br ${pack.gradient} flex items-center justify-center text-3xl`}>
                    {pack.icon}
                  </div>
                  <div className="p-3">
                    <h4 className="font-extrabold text-xs text-white group-hover:text-[#facc15] transition-colors">{pack.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{pack.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-60 space-y-4 flex-shrink-0">

          {/* Playing As */}
          <div className="bg-[#1c1d22] border border-[#2c2e38] rounded-2xl p-4 relative">
            <div className="flex items-center gap-1.5 mb-3">
              <UserCircle size={12} className="text-gray-400" />
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Playing as</h4>
            </div>
            <button
              onClick={() => setShowAccountSwitcher(v => !v)}
              className="w-full flex items-center gap-3 bg-[#262830] hover:bg-[#2e303b] border border-[#343744] hover:border-[#facc15]/40 p-2.5 rounded-xl transition-all text-left"
            >
              {activeAccount
                ? <AvatarPill name={activeAccount.username} />
                : <div className="w-9 h-9 rounded-xl bg-[#343744] flex items-center justify-center flex-shrink-0"><UserCircle size={18} className="text-gray-400" /></div>
              }
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-xs text-white truncate">{activeAccount?.username ?? 'No account'}</p>
                <p className="text-[10px] text-gray-400 capitalize">{activeAccount?.type ?? 'Add in Accounts'}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#facc15] flex-shrink-0" />
            </button>

            {showAccountSwitcher && accountData.accounts.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-[#16171d] border border-[#2c2e38] rounded-xl overflow-hidden z-20 shadow-xl animate-fade-in">
                {accountData.accounts.map(acc => (
                  <button key={acc.id} onClick={() => handleSetActiveAccount(acc.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#1c1d22] transition-colors text-left">
                    <AvatarPill name={acc.username} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{acc.username}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{acc.type}</p>
                    </div>
                    {acc.id === accountData.active_id && <div className="ml-auto w-2 h-2 rounded-full bg-[#facc15]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Friends */}
          <div className="bg-[#1c1d22] border border-[#2c2e38] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Users size={12} className="text-gray-400" />
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Friends</h4>
            </div>
            <div className="space-y-1.5">
              {[
                { name: 'Geometrically', status: 'Playing Cobblemon', online: true },
                { name: 'triphora',      status: 'In Menus',          online: true },
                { name: 'Minenash',      status: 'Offline',           online: false },
                { name: 'coolbot100s',   status: 'Playing Vanilla',   online: true },
              ].map(friend => (
                <button
                  key={friend.name}
                  onClick={() => onStartChat?.(friend.name)}
                  className="w-full flex items-center gap-2.5 hover:bg-[#262830] p-1.5 rounded-xl transition-all text-left group"
                  title={`Chat with ${friend.name}`}
                >
                  <div className="relative flex-shrink-0">
                    <AvatarPill name={friend.name} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#1c1d22] ${friend.online ? 'bg-[#facc15]' : 'bg-gray-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-white truncate group-hover:text-[#facc15] transition-colors">{friend.name}</p>
                    <p className="text-[10px] text-gray-500 truncate leading-tight">{friend.status}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* News */}
          <div className="bg-[#1c1d22] border border-[#2c2e38] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Newspaper size={12} className="text-gray-400" />
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">News</h4>
            </div>
            <div className="space-y-2">
              {NEWS_ITEMS.map(item => (
                <button key={item.title}
                  onClick={() => (window as any).electronAPI?.invoke('open_url', { url: item.url })}
                  className="block w-full text-left bg-[#24262f] hover:bg-[#2a2c38] border border-[#343744] hover:border-[#facc15]/40 rounded-xl p-3 transition-all group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold text-[#facc15] uppercase tracking-wider">{item.tag}</span>
                    <span className="text-[10px] text-gray-500">{item.date}</span>
                  </div>
                  <h5 className="font-extrabold text-xs text-white group-hover:text-[#facc15] transition-colors leading-tight">{item.title}</h5>
                  <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{item.body}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateInstanceModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
      )}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} onImported={fetchInstances} />
      )}
      {activeInstanceForSettings && (
        <InstanceSettingsModal
          instance={activeInstanceForSettings}
          onClose={() => setActiveInstanceForSettings(null)}
          onUpdate={fetchInstances}
        />
      )}
    </div>
  );
}
