import { useEffect, useState, useRef } from 'react';
import {
  Play, Settings2, RefreshCw, FolderOpen, Copy, Trash2, StopCircle, Search, Filter,
  Plus, Star, Grid, List, Flame, Clock, HardDrive,
  Layers, Hammer, Cpu, Box, Boxes, MoreVertical, X,
  Gamepad2, ArrowDownToLine
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

function LoaderBadge({ loader }: { loader: string }) {
  const l = (loader || 'vanilla').toLowerCase();
  if (l.includes('fabric')) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-lg shadow-sm">
        <Layers size={11} /> Fabric
      </span>
    );
  }
  if (l.includes('forge') && !l.includes('neo')) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded-lg shadow-sm">
        <Hammer size={11} /> Forge
      </span>
    );
  }
  if (l.includes('neoforge')) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg shadow-sm">
        <Cpu size={11} /> NeoForge
      </span>
    );
  }
  if (l.includes('quilt')) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-lg shadow-sm">
        <Boxes size={11} /> Quilt
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-lg shadow-sm">
      <Box size={11} /> Vanilla
    </span>
  );
}

function LoaderBannerGradient(loader: string) {
  const l = (loader || 'vanilla').toLowerCase();
  if (l.includes('fabric')) return 'from-cyan-900/60 via-blue-900/40 to-[#121319]';
  if (l.includes('forge') && !l.includes('neo')) return 'from-orange-950/70 via-amber-900/40 to-[#121319]';
  if (l.includes('neoforge')) return 'from-amber-950/70 via-yellow-900/30 to-[#121319]';
  if (l.includes('quilt')) return 'from-purple-950/70 via-fuchsia-900/30 to-[#121319]';
  return 'from-emerald-950/70 via-teal-900/30 to-[#121319]';
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
      // Favorites always pinned to the top
      const favA = favorites.has(a.name) ? 1 : 0;
      const favB = favorites.has(b.name) ? 1 : 0;
      if (favA !== favB) return favB - favA;

      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'version') return b.mc_version.localeCompare(a.mc_version);
      // default: recent
      const timeA = a.last_played ? new Date(a.last_played).getTime() : 0;
      const timeB = b.last_played ? new Date(b.last_played).getTime() : 0;
      return timeB - timeA;
    });

  const totalRunning = runningInstances.size;

  return (
    <div className="h-full flex flex-col space-y-5 animate-fade-in pb-8 max-w-7xl mx-auto w-full select-none">
      
      {/* ── Top Hero Stats & Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 border border-[#facc15]/30 flex items-center justify-center text-[#facc15] shadow-lg shadow-yellow-500/10">
              <Gamepad2 size={20} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Instance Library
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#1c1d24] text-gray-400 border border-[#2c2e38] px-2 py-0.5 rounded-lg">
                {instances.length} INSTALLED
              </span>
            </h1>
          </div>
          <p className="text-xs text-gray-400 font-medium">
            Launch, configure, duplicate, and manage all your modded and vanilla Minecraft profiles.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#16171d] hover:bg-[#20222a] border border-[#2c2e38] text-gray-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <ArrowDownToLine size={13} /> Import .mrpack
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black text-xs font-black rounded-xl shadow-md shadow-yellow-500/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={15} /> New Instance
          </button>
          <button
            onClick={fetchInstances}
            title="Refresh instances"
            className="p-2 rounded-xl bg-[#16171d] hover:bg-[#20222a] border border-[#2c2e38] text-gray-400 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#facc15]' : ''} />
          </button>
        </div>
      </div>

      {/* ── Quick Stats Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#14151b] border border-[#242630] rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Box size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500">Total Profiles</p>
            <p className="text-sm font-black text-white">{instances.length}</p>
          </div>
        </div>

        <div className="bg-[#14151b] border border-[#242630] rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500">Active Game</p>
            <p className="text-sm font-black text-[#facc15]">
              {totalRunning > 0 ? `${totalRunning} Running` : 'Idle'}
            </p>
          </div>
        </div>

        <div className="bg-[#14151b] border border-[#242630] rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Star size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500">Favorites</p>
            <p className="text-sm font-black text-white">{favorites.size} Pinned</p>
          </div>
        </div>

        <div className="bg-[#14151b] border border-[#242630] rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Clock size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500">Last Played</p>
            <p className="text-xs font-bold text-gray-300 truncate max-w-[120px]">
              {instances.find(i => i.last_played)?.name || 'None'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Search, Filters & View Toggle Bar ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#13141a] border border-[#242630] p-3 rounded-2xl">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
          <input
            type="text"
            placeholder="Search by instance name, Minecraft version, or loader..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d0e12] border border-[#242630] focus:border-[#facc15]/60 rounded-xl py-2 pl-10 pr-8 text-xs text-white outline-none transition-all placeholder:text-gray-600 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Pills & Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Loader Filter */}
          <div className="flex items-center gap-1 bg-[#0d0e12] border border-[#242630] rounded-xl px-2.5 py-1">
            <span className="text-[10px] text-gray-500 font-black uppercase">Loader:</span>
            <select
              value={selectedLoader}
              onChange={e => setSelectedLoader(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              {loaders.map(l => (
                <option key={l} value={l} className="bg-[#13141a] text-white font-medium">
                  {l === 'all' ? 'All Loaders' : l}
                </option>
              ))}
            </select>
          </div>

          {/* Version Filter */}
          <div className="flex items-center gap-1 bg-[#0d0e12] border border-[#242630] rounded-xl px-2.5 py-1">
            <span className="text-[10px] text-gray-500 font-black uppercase">Version:</span>
            <select
              value={selectedVersion}
              onChange={e => setSelectedVersion(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              {versions.map(v => (
                <option key={v} value={v} className="bg-[#13141a] text-white font-medium">
                  {v === 'all' ? 'All Versions' : v}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1 bg-[#0d0e12] border border-[#242630] rounded-xl px-2.5 py-1">
            <span className="text-[10px] text-gray-500 font-black uppercase">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              <option value="recent" className="bg-[#13141a] text-white font-medium">Recently Played</option>
              <option value="name" className="bg-[#13141a] text-white font-medium">Name (A-Z)</option>
              <option value="version" className="bg-[#13141a] text-white font-medium">MC Version</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0d0e12] border border-[#242630] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#facc15] text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
              title="Grid View"
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#facc15] text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
              title="List View"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Instance Cards (Grid / List View) ─────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-56 rounded-3xl animate-shimmer border border-[#242630]" style={{ animationDelay: `${n * 70}ms` }} />
          ))}
        </div>
      ) : filteredInstances.length === 0 ? (
        <div className="bg-[#14151b] border border-dashed border-[#2c2e38] rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-[#1c1d24] border border-[#343744] flex items-center justify-center text-gray-500 animate-float">
            <Filter size={32} />
          </div>
          <h3 className="font-extrabold text-base text-white">No instances match your filters</h3>
          <p className="text-xs text-gray-500 max-w-sm">Try clearing your search query or selecting a different mod loader / version filter.</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { setSearchQuery(''); setSelectedLoader('all'); setSelectedVersion('all'); }}
              className="px-4 py-2 bg-[#20222a] border border-[#2c2e38] text-gray-300 hover:text-white text-xs font-bold rounded-xl transition-all"
            >
              Reset Filters
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#facc15] hover:bg-yellow-300 text-black text-xs font-black rounded-xl transition-all shadow-md shadow-yellow-500/10"
            >
              Create Instance
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID VIEW (10x Cooler 3D Styled Cards) ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInstances.map((inst, idx) => {
            const isRunning = runningInstances.has(inst.name);
            const isFav = favorites.has(inst.name);
            const isDropdownOpen = openDropdownId === inst.name;

            return (
              <div
                key={inst.name}
                onClick={() => onSelectInstance?.(inst)}
                className={`relative rounded-3xl border overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-200 cursor-pointer group animate-fade-in ${
                  isRunning
                    ? 'bg-[#15161c] border-[#facc15]/50 ring-2 ring-[#facc15]/20 shadow-yellow-500/10'
                    : 'bg-[#14151b] border-[#22242e] hover:border-[#facc15]/40 hover:bg-[#181922]'
                }`}
                style={{
                  animationDelay: `${idx * 40}ms`,
                  boxShadow: isRunning ? '0 8px 32px rgba(250,204,21,0.12)' : '0 4px 20px rgba(0,0,0,0.4)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                {/* Top Banner Artwork */}
                <div className={`relative h-24 bg-gradient-to-r ${LoaderBannerGradient(inst.loader)} p-4 flex items-start justify-between overflow-hidden`}>
                  {/* Subtle Background Glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#14151b]/95 pointer-events-none" />

                  {/* Top Left: Loader Badge + Favorite */}
                  <div className="relative z-10 flex items-center gap-2">
                    <LoaderBadge loader={inst.loader} />
                    <button
                      onClick={e => toggleFavorite(inst.name, e)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isFav
                          ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-yellow-500/20'
                          : 'bg-black/40 text-gray-400 hover:text-amber-300 border-white/10'
                      }`}
                      title={isFav ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star size={11} className={isFav ? 'fill-current' : ''} />
                    </button>
                  </div>

                  {/* Top Right: Status / Icon */}
                  <div className="relative z-10 flex items-center gap-1.5">
                    {isRunning ? (
                      <span className="flex items-center gap-1.5 bg-[#facc15] text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-black" />
                        RUNNING
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                        {inst.mc_version}
                      </span>
                    )}
                  </div>

                  {/* Large Icon Preview / Avatar floating over bottom edge */}
                  <div className="absolute -bottom-3 left-4 z-20">
                    <div className="w-13 h-13 rounded-2xl bg-[#1e2029] border-2 border-[#2c2e38] group-hover:border-[#facc15]/50 flex items-center justify-center text-xl shadow-xl overflow-hidden transition-transform group-hover:scale-105">
                      {inst.icon ? (
                        <img src={inst.icon} alt={inst.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#242735] to-[#16171f] text-[#facc15]">
                          <Gamepad2 size={22} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Main Body */}
                <div className="p-4 pt-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-base font-black text-white group-hover:text-[#facc15] transition-colors leading-snug truncate">
                      {inst.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 font-medium">
                      <span>Minecraft {inst.mc_version}</span>
                      <span>·</span>
                      <span className="text-gray-300 font-bold">{inst.loader || 'Vanilla'}</span>
                    </div>
                  </div>

                  {/* Metadata Stats Strip */}
                  <div className="grid grid-cols-2 gap-2 bg-[#0d0e12] border border-[#20222a] p-2.5 rounded-xl text-[10px] font-medium text-gray-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock size={11} className="text-gray-500 flex-shrink-0" />
                      <span className="truncate">
                        {inst.last_played ? new Date(inst.last_played).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Never played'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <HardDrive size={11} className="text-gray-500 flex-shrink-0" />
                      <span>{inst.max_memory || 4096} MB</span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between border-t border-[#20222a] pt-3 mt-1" onClick={e => e.stopPropagation()}>
                    
                    {/* Settings Dropdown Button */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdownId(isDropdownOpen ? null : inst.name)}
                        className="p-2 rounded-xl bg-[#1c1d24] hover:bg-[#282a36] border border-[#2c2e38] text-gray-400 hover:text-white transition-all active:scale-90"
                        title="Options"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {isDropdownOpen && (
                        <div
                          ref={dropdownRef}
                          className="absolute left-0 bottom-full mb-1.5 w-44 bg-[#14151b] border border-[#2c2e38] rounded-2xl shadow-2xl z-40 overflow-hidden animate-scale-up"
                        >
                          <button
                            onClick={() => { setOpenDropdownId(null); setActiveInstanceForSettings(inst); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-[#1c1d24] transition-colors"
                          >
                            <Settings2 size={13} className="text-[#facc15]" /> Settings
                          </button>
                          <button
                            onClick={() => { setOpenDropdownId(null); handleOpenFolder(inst.name); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-[#1c1d24] transition-colors"
                          >
                            <FolderOpen size={13} className="text-sky-400" /> Open Folder
                          </button>
                          <button
                            onClick={() => { setOpenDropdownId(null); handleDuplicate(inst.name); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-[#1c1d24] transition-colors border-t border-[#242630]"
                          >
                            <Copy size={13} className="text-amber-400" /> Duplicate
                          </button>
                          <button
                            onClick={() => { setOpenDropdownId(null); handleDelete(inst.name); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border-t border-[#242630]"
                          >
                            <Trash2 size={13} /> Delete Profile
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Launch / Stop Button */}
                    <div>
                      {isRunning ? (
                        <button
                          onClick={e => handleStop(inst.name, e)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs shadow-md shadow-red-500/25 transition-all active:scale-95"
                        >
                          <StopCircle size={13} /> Stop
                        </button>
                      ) : (
                        <button
                          onClick={e => handleLaunch(inst.name, e)}
                          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-black text-xs shadow-md shadow-yellow-500/20 transition-all active:scale-95 hover:scale-105"
                        >
                          <Play size={13} fill="currentColor" /> Play
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW (High Density List) ── */
        <div className="space-y-2">
          {filteredInstances.map((inst, idx) => {
            const isRunning = runningInstances.has(inst.name);
            const isFav = favorites.has(inst.name);

            return (
              <div
                key={inst.name}
                onClick={() => onSelectInstance?.(inst)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer group animate-fade-in ${
                  isRunning
                    ? 'bg-[#15161c] border-[#facc15]/50 ring-1 ring-[#facc15]/20 shadow-md'
                    : 'bg-[#14151b] border-[#22242e] hover:border-[#facc15]/30 hover:bg-[#181922]'
                }`}
                style={{ animationDelay: `${idx * 25}ms` }}
              >
                {/* Left: Icon + Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={e => toggleFavorite(inst.name, e)}
                    className={`p-1.5 rounded-lg border transition-all flex-shrink-0 ${
                      isFav ? 'bg-amber-400 text-black border-amber-400' : 'bg-black/30 text-gray-500 hover:text-white border-white/5'
                    }`}
                  >
                    <Star size={12} className={isFav ? 'fill-current' : ''} />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-[#1c1d24] border border-[#2c2e38] flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                    {inst.icon ? (
                      <img src={inst.icon} alt={inst.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 size={18} className="text-[#facc15]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-white truncate group-hover:text-[#facc15] transition-colors">{inst.name}</h4>
                      {isRunning && (
                        <span className="text-[9px] font-black bg-[#facc15] text-black px-1.5 py-0.2 rounded-full uppercase">LIVE</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium">
                      MC {inst.mc_version} · <span className="text-gray-300 font-bold">{inst.loader || 'Vanilla'}</span> · {inst.last_played ? new Date(inst.last_played).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenFolder(inst.name)}
                    className="p-2 rounded-xl bg-[#1c1d24] hover:bg-[#282a36] text-gray-400 hover:text-white transition-colors"
                    title="Open Folder"
                  >
                    <FolderOpen size={13} />
                  </button>
                  <button
                    onClick={() => setActiveInstanceForSettings(inst)}
                    className="p-2 rounded-xl bg-[#1c1d24] hover:bg-[#282a36] text-gray-400 hover:text-white transition-colors"
                    title="Settings"
                  >
                    <Settings2 size={13} />
                  </button>
                  {isRunning ? (
                    <button
                      onClick={e => handleStop(inst.name, e)}
                      className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs transition-all active:scale-95"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={e => handleLaunch(inst.name, e)}
                      className="px-4 py-1.5 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-black text-xs transition-all active:scale-95"
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
