import { useEffect, useState, useRef } from 'react';
import { Play, Settings2, RefreshCw, FolderOpen, Copy, Trash2, StopCircle, Search, Filter } from 'lucide-react';
import { safeInvoke, isElectron } from '../utils/tauri';
import { InstanceSettingsModal } from './InstanceSettingsModal';

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

interface LibraryTabProps {
  onSelectInstance?: (instance: Instance) => void;
  onLaunch?: (name: string) => void;
  refreshTrigger?: number;
}

export function LibraryTab({ onSelectInstance, onLaunch, refreshTrigger }: LibraryTabProps) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningInstances, setRunningInstances] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoader, setSelectedLoader] = useState<string>('all');
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  const [activeInstanceForSettings, setActiveInstanceForSettings] = useState<Instance | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const syncRunning = async () => {
    try {
      const running = await safeInvoke<string[]>('list_running');
      setRunningInstances(new Set(running ?? []));
    } catch {}
  };

  useEffect(() => {
    fetchInstances();
    syncRunning();

    if (isElectron()) {
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
        (window as any).electronAPI.removeInstanceListeners?.();
      }
    };
  }, [refreshTrigger]);

  const handleLaunch = async (name: string) => {
    setRunningInstances(prev => new Set([...prev, name]));
    if (onLaunch) onLaunch(name);
    try {
      await safeInvoke('launch_instance', { name });
      fetchInstances();
    } catch (err) {
      setRunningInstances(prev => { const n = new Set(prev); n.delete(name); return n; });
      alert('Launch failed: ' + err);
    }
  };

  const handleStop = async (name: string) => {
    await safeInvoke('stop_instance', { name });
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

  // Click outside close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter logic
  const loaders = ['all', ...Array.from(new Set(instances.map(i => i.loader || 'Vanilla')))];
  const versions = ['all', ...Array.from(new Set(instances.map(i => i.mc_version)))];

  const filteredInstances = instances.filter(inst => {
    const matchSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLoader = selectedLoader === 'all' || (inst.loader || 'Vanilla') === selectedLoader;
    const matchVersion = selectedVersion === 'all' || inst.mc_version === selectedVersion;
    return matchSearch && matchLoader && matchVersion;
  });

  // Loader gradient picker for premium design
  const getLoaderGradient = (loader: string) => {
    const l = (loader || 'vanilla').toLowerCase();
    if (l === 'fabric') return 'from-purple-600 to-indigo-900';
    if (l === 'forge') return 'from-orange-600 to-amber-900';
    if (l === 'quilt') return 'from-pink-600 to-rose-900';
    if (l === 'neoforge') return 'from-cyan-600 to-teal-900';
    return 'from-emerald-600 to-slate-900';
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in pb-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Instance Library</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage and launch your personal Minecraft collections</p>
        </div>
        <button
          onClick={fetchInstances}
          className="p-2.5 rounded-xl bg-[#1c1d22] border border-[#2c2e38] text-gray-400 hover:text-white hover:border-[#facc15]/40 transition-all"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-[#16171d]/60 border border-[#2c2e38] p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search instances..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#1c1d22] border border-[#2c2e38] rounded-xl py-2 pl-10 pr-4 text-xs text-white outline-none focus:border-[#facc15]/60 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-bold uppercase">Loader:</span>
            <select
              value={selectedLoader}
              onChange={e => setSelectedLoader(e.target.value)}
              className="bg-[#1c1d22] border border-[#2c2e38] text-xs text-white rounded-lg p-1.5 outline-none cursor-pointer focus:border-[#facc15]/60"
            >
              {loaders.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-bold uppercase">Version:</span>
            <select
              value={selectedVersion}
              onChange={e => setSelectedVersion(e.target.value)}
              className="bg-[#1c1d22] border border-[#2c2e38] text-xs text-white rounded-lg p-1.5 outline-none cursor-pointer focus:border-[#facc15]/60"
            >
              {versions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Instance Grid (Completely Custom Premium UI) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-[#1c1d22] border border-[#2c2e38] rounded-3xl h-56 animate-pulse" />
          ))}
        </div>
      ) : filteredInstances.length === 0 ? (
        <div className="bg-[#1c1d22]/50 border border-[#2c2e38] rounded-3xl p-16 text-center">
          <Filter size={36} className="text-gray-500 mx-auto mb-3" />
          <h3 className="font-extrabold text-white mb-1">No instances found</h3>
          <p className="text-xs text-gray-400">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredInstances.map((inst) => {
            const isRunning = runningInstances.has(inst.name);
            const isDropdownOpen = openDropdownId === inst.name;

            return (
              <div
                key={inst.name}
                onClick={() => onSelectInstance?.(inst)}
                className={`bg-[#1c1d22] border rounded-3xl overflow-hidden flex flex-col justify-between h-56 shadow-xl transition-all cursor-pointer group ${
                  isRunning
                    ? 'border-[#facc15]/40 shadow-yellow-500/5 ring-1 ring-[#facc15]/20'
                    : 'border-[#2c2e38] hover:border-[#facc15]/30 hover:-translate-y-1'
                }`}
              >
                {/* Loader Header Banner */}
                <div className={`h-16 bg-gradient-to-r ${getLoaderGradient(inst.loader)} p-4 flex items-center justify-between`}>
                  <span className="text-[10px] font-black tracking-widest uppercase bg-black/40 text-white px-2 py-0.5 rounded-full">
                    {inst.loader || 'Vanilla'}
                  </span>
                  {isRunning && (
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                    </span>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-white truncate group-hover:text-[#facc15] transition-colors leading-tight">
                      {inst.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium mt-1">
                      Minecraft {inst.mc_version}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between border-t border-[#2c2e38] pt-3 mt-2">
                    {/* Settings Dropdown Button */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenDropdownId(isDropdownOpen ? null : inst.name)}
                        className="p-2 rounded-xl bg-[#262830] hover:bg-[#343744] text-gray-400 hover:text-white transition-colors"
                      >
                        <Settings2 size={14} />
                      </button>

                      {isDropdownOpen && (
                        <div
                          ref={dropdownRef}
                          className="absolute left-0 bottom-full mb-1 w-44 bg-[#16171d] border border-[#2c2e38] rounded-xl shadow-2xl z-40 overflow-hidden animate-fade-in"
                        >
                          <button
                            onClick={() => { setOpenDropdownId(null); setActiveInstanceForSettings(inst); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors"
                          >
                            <Settings2 size={13} className="text-gray-400" /> Settings
                          </button>
                          <button
                            onClick={() => { setOpenDropdownId(null); handleOpenFolder(inst.name); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors"
                          >
                            <FolderOpen size={13} className="text-gray-400" /> Open Folder
                          </button>
                          <button
                            onClick={() => { setOpenDropdownId(null); handleDuplicate(inst.name); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors border-t border-[#2c2e38]"
                          >
                            <Copy size={13} className="text-gray-400" /> Duplicate
                          </button>
                          <button
                            onClick={() => { setOpenDropdownId(null); handleDelete(inst.name); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border-t border-[#2c2e38]"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Launch / Stop Control */}
                    <div onClick={e => e.stopPropagation()}>
                      {isRunning ? (
                        <button
                          onClick={() => handleStop(inst.name)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-extrabold text-xs shadow-md shadow-red-500/25 transition-all active:scale-95"
                        >
                          <StopCircle size={12} />
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLaunch(inst.name)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs shadow-md shadow-yellow-500/10 transition-all active:scale-95"
                        >
                          <Play size={12} fill="currentColor" />
                          Launch
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
