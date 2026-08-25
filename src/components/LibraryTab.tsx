import { useEffect, useState, useRef } from 'react';
import {
  Play, Settings2, RefreshCw, FolderOpen, Copy, Trash2, StopCircle, Search,
  Plus, Star, Grid, List, Layers, Hammer, Cpu, Box, Boxes, MoreVertical, X,
  FolderDown, Gamepad2
} from 'lucide-react';
import { safeInvoke, isElectron } from '../utils/tauri';
import { InstanceSettingsModal } from './InstanceSettingsModal';
import { CreateInstanceModal } from './CreateInstanceModal';
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
  icon?: string | null;
}

interface LibraryTabProps {
  onSelectInstance?: (instance: Instance) => void;
  onLaunch?: (name: string) => void;
  refreshTrigger?: number;
}

function LoaderTag({ loader }: { loader: string }) {
  const l = (loader || 'vanilla').toLowerCase();
  if (l.includes('fabric')) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-md">
        <Layers size={11} /> Fabric
      </span>
    );
  }
  if (l.includes('forge') && !l.includes('neo')) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md">
        <Hammer size={11} /> Forge
      </span>
    );
  }
  if (l.includes('neoforge')) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md">
        <Cpu size={11} /> NeoForge
      </span>
    );
  }
  if (l.includes('quilt')) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md">
        <Boxes size={11} /> Quilt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
      <Box size={11} /> Vanilla
    </span>
  );
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Never played';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Never played';
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(time).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function LibraryTab({ onSelectInstance, onLaunch, refreshTrigger }: LibraryTabProps) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningInstances, setRunningInstances] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoader, setSelectedLoader] = useState<string>('all');
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'version'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('revival_favorites') || '[]'));
    } catch {
      return new Set();
    }
  });

  const [activeInstanceForSettings, setActiveInstanceForSettings] = useState<Instance | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleFavorite = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      localStorage.setItem('revival_favorites', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const data = await safeInvoke<Instance[]>('list_instances');
      setInstances(data || []);
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

  const handleLaunch = async (name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleStop = async (name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  // Filter & Sort logic
  const loaders = ['all', ...Array.from(new Set(instances.map(i => i.loader || 'Vanilla')))];
  const versions = ['all', ...Array.from(new Set(instances.map(i => i.mc_version)))];

  const filteredInstances = instances
    .filter(inst => {
      const matchSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.mc_version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inst.loader || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchLoader = selectedLoader === 'all' || (inst.loader || 'Vanilla').toLowerCase() === selectedLoader.toLowerCase();
      const matchVersion = selectedVersion === 'all' || inst.mc_version === selectedVersion;
      return matchSearch && matchLoader && matchVersion;
    })
    .sort((a, b) => {
      const favA = favorites.has(a.name) ? 1 : 0;
      const favB = favorites.has(b.name) ? 1 : 0;
      if (favA !== favB) return favB - favA;

      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'version') return b.mc_version.localeCompare(a.mc_version);
      const timeA = a.last_played ? new Date(a.last_played).getTime() : 0;
      const timeB = b.last_played ? new Date(b.last_played).getTime() : 0;
      return timeB - timeA;
    });

  return (
    <div className="h-full flex flex-col space-y-4 max-w-7xl mx-auto w-full select-none pb-8 animate-fade-in">
      
      {/* ── Clean Top Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Instances
            <span className="text-xs font-semibold text-gray-500 bg-[#16171d] border border-[#242630] px-2 py-0.5 rounded-md">
              {instances.length}
            </span>
          </h1>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 rounded-lg bg-[#16171d] hover:bg-[#1f212a] border border-[#262833] text-gray-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
          >
            <FolderDown size={13} /> Import
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#facc15] hover:bg-yellow-300 text-black text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <Plus size={14} /> New Instance
          </button>
          <button
            onClick={fetchInstances}
            title="Refresh"
            className="p-1.5 rounded-lg bg-[#16171d] hover:bg-[#1f212a] border border-[#262833] text-gray-400 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-[#facc15]' : ''} />
          </button>
        </div>
      </div>

      {/* ── Toolbar: Search & Filter ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#121318] border border-[#1f2128] px-3 py-2.5 rounded-xl">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            placeholder="Search instances..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#0b0c10] border border-[#1f2128] focus:border-[#facc15]/50 rounded-lg py-1.5 pl-9 pr-7 text-xs text-white outline-none transition-all placeholder:text-gray-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Loader Filter */}
          <select
            value={selectedLoader}
            onChange={e => setSelectedLoader(e.target.value)}
            className="bg-[#0b0c10] border border-[#1f2128] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 font-medium outline-none cursor-pointer focus:border-[#facc15]/50"
          >
            {loaders.map(l => (
              <option key={l} value={l} className="bg-[#121318] text-white">
                {l === 'all' ? 'All Loaders' : l}
              </option>
            ))}
          </select>

          {/* Version Filter */}
          <select
            value={selectedVersion}
            onChange={e => setSelectedVersion(e.target.value)}
            className="bg-[#0b0c10] border border-[#1f2128] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 font-medium outline-none cursor-pointer focus:border-[#facc15]/50"
          >
            {versions.map(v => (
              <option key={v} value={v} className="bg-[#121318] text-white">
                {v === 'all' ? 'All Versions' : v}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-[#0b0c10] border border-[#1f2128] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 font-medium outline-none cursor-pointer focus:border-[#facc15]/50"
          >
            <option value="recent" className="bg-[#121318] text-white">Recently Played</option>
            <option value="name" className="bg-[#121318] text-white">Name (A-Z)</option>
            <option value="version" className="bg-[#121318] text-white">Minecraft Version</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-[#0b0c10] border border-[#1f2128] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-[#1f2128] text-white' : 'text-gray-500 hover:text-white'}`}
              title="Grid View"
            >
              <Grid size={13} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-[#1f2128] text-white' : 'text-gray-500 hover:text-white'}`}
              title="List View"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Instance Cards Grid ─────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-40 rounded-xl bg-[#121318] border border-[#1f2128] animate-pulse" />
          ))}
        </div>
      ) : filteredInstances.length === 0 ? (
        <div className="bg-[#121318] border border-[#1f2128] rounded-xl p-12 text-center flex flex-col items-center justify-center gap-2">
          <Box size={28} className="text-gray-600" />
          <h3 className="font-bold text-sm text-white">No instances found</h3>
          <p className="text-xs text-gray-500">Create your first instance or adjust your search filters.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 px-3.5 py-1.5 bg-[#facc15] hover:bg-yellow-300 text-black text-xs font-bold rounded-lg transition-all"
          >
            Create Instance
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredInstances.map((inst) => {
            const isRunning = runningInstances.has(inst.name);
            const isFav = favorites.has(inst.name);
            const isDropdownOpen = openDropdownId === inst.name;

            return (
              <div
                key={inst.name}
                onClick={() => onSelectInstance?.(inst)}
                className={`relative rounded-xl border bg-[#121318] p-4 flex flex-col justify-between transition-all duration-150 cursor-pointer group ${
                  isRunning
                    ? 'border-[#facc15]/60 ring-1 ring-[#facc15]/20'
                    : 'border-[#1f2128] hover:border-[#2f3240] hover:bg-[#15161c]'
                }`}
              >
                {/* Top Row: Icon + Name + Star */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* Instance Icon */}
                  <div className="w-11 h-11 rounded-lg bg-[#181920] border border-[#242630] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {inst.icon ? (
                      <img src={inst.icon} alt={inst.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 size={20} className="text-gray-400" />
                    )}
                  </div>

                  {/* Title & Loader */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-[#facc15] transition-colors">
                        {inst.name}
                      </h3>
                      <button
                        onClick={e => toggleFavorite(inst.name, e)}
                        className={`p-1 rounded transition-colors ${isFav ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'}`}
                        title={isFav ? 'Unpin' : 'Pin'}
                      >
                        <Star size={12} className={isFav ? 'fill-current' : ''} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <LoaderTag loader={inst.loader} />
                      <span className="text-[11px] text-gray-400 font-medium">
                        {inst.mc_version}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Last Played + Action Buttons */}
                <div className="flex items-center justify-between border-t border-[#1a1b22] pt-3 mt-4 text-xs text-gray-500">
                  <span className="text-[11px] truncate">
                    {formatRelativeTime(inst.last_played)}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {/* More Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdownId(isDropdownOpen ? null : inst.name)}
                        className="p-1.5 rounded-md hover:bg-[#1f2128] text-gray-400 hover:text-white transition-colors"
                        title="Options"
                      >
                        <MoreVertical size={13} />
                      </button>

                      {isDropdownOpen && (
                        <div
                          ref={dropdownRef}
                          className="absolute right-0 bottom-full mb-1 w-40 bg-[#16171d] border border-[#262833] rounded-lg shadow-xl z-30 overflow-hidden py-1 text-xs"
                        >
                          <button
                            onClick={() => { setOpenDropdownId(null); setActiveInstanceForSettings(inst); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-[#1f2128]"
                          >
                            <Settings2 size={12} /> Settings
                          </button>
                          <button
                            onClick={() => { setOpenDropdownId(null); handleOpenFolder(inst.name); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-[#1f2128]"
                          >
                            <FolderOpen size={12} /> Open Folder
                          </button>
                          <button
                            onClick={() => { setOpenDropdownId(null); handleDuplicate(inst.name); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-[#1f2128]"
                          >
                            <Copy size={12} /> Duplicate
                          </button>
                          <button
                            onClick={() => { setOpenDropdownId(null); handleDelete(inst.name); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-500/10 border-t border-[#262833]"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Launch / Stop Button */}
                    {isRunning ? (
                      <button
                        onClick={e => handleStop(inst.name, e)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition-all active:scale-95"
                      >
                        <StopCircle size={12} /> Stop
                      </button>
                    ) : (
                      <button
                        onClick={e => handleLaunch(inst.name, e)}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#facc15] hover:bg-yellow-300 text-black font-bold text-xs transition-all active:scale-95"
                      >
                        <Play size={11} fill="currentColor" /> Play
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-1.5">
          {filteredInstances.map((inst) => {
            const isRunning = runningInstances.has(inst.name);
            const isFav = favorites.has(inst.name);

            return (
              <div
                key={inst.name}
                onClick={() => onSelectInstance?.(inst)}
                className={`flex items-center justify-between p-3 rounded-lg border bg-[#121318] transition-all cursor-pointer group ${
                  isRunning
                    ? 'border-[#facc15]/60 ring-1 ring-[#facc15]/20'
                    : 'border-[#1f2128] hover:border-[#2f3240] hover:bg-[#15161c]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={e => toggleFavorite(inst.name, e)}
                    className={`p-1 rounded transition-colors ${isFav ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    <Star size={12} className={isFav ? 'fill-current' : ''} />
                  </button>

                  <div className="w-8 h-8 rounded-lg bg-[#181920] border border-[#242630] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {inst.icon ? (
                      <img src={inst.icon} alt={inst.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 size={16} className="text-gray-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-white truncate group-hover:text-[#facc15] transition-colors">{inst.name}</h4>
                    <p className="text-[11px] text-gray-500 font-medium">
                      {inst.loader || 'Vanilla'} {inst.mc_version} · {formatRelativeTime(inst.last_played)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenFolder(inst.name)}
                    className="p-1.5 rounded hover:bg-[#1f2128] text-gray-400 hover:text-white"
                    title="Open Folder"
                  >
                    <FolderOpen size={13} />
                  </button>
                  <button
                    onClick={() => setActiveInstanceForSettings(inst)}
                    className="p-1.5 rounded hover:bg-[#1f2128] text-gray-400 hover:text-white"
                    title="Settings"
                  >
                    <Settings2 size={13} />
                  </button>
                  {isRunning ? (
                    <button
                      onClick={e => handleStop(inst.name, e)}
                      className="px-2.5 py-1 rounded bg-red-500 hover:bg-red-400 text-white font-bold text-xs"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={e => handleLaunch(inst.name, e)}
                      className="px-3 py-1 rounded bg-[#facc15] hover:bg-yellow-300 text-black font-bold text-xs"
                    >
                      Play
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settings Modal */}
      {activeInstanceForSettings && (
        <InstanceSettingsModal
          instance={activeInstanceForSettings}
          onClose={() => setActiveInstanceForSettings(null)}
          onUpdate={fetchInstances}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateInstanceModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (name, mcVersion, loader, loaderVersion) => {
            try {
              await safeInvoke('create_instance', { name, mc_version: mcVersion, loader, loader_version: loaderVersion });
              setShowCreateModal(false);
              fetchInstances();
            } catch (err) {
              alert('Failed to create instance: ' + err);
            }
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            fetchInstances();
          }}
        />
      )}
    </div>
  );
}
