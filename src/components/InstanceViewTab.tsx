import { useEffect, useState, useRef } from 'react';
import {
  Play, StopCircle, RefreshCw, Trash2, ToggleLeft, ToggleRight, Search, ChevronLeft, Plus,
  FolderOpen, Settings2, Globe, Terminal, Copy, Check, X,
  Layers, Hammer, Cpu, Box, Boxes, Gamepad2, HardDrive, CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import { safeInvoke } from '../utils/tauri';
import { AddResourceModal } from './AddResourceModal';
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
  icon?: string | null;
}

interface ModItem {
  filename: string;
  name: string;
  enabled: boolean;
  icon_url?: string | null;
}

interface WorldItem {
  folderName: string;
  name: string;
  lastModified: number;
  icon?: string | null;
}

interface InstanceViewTabProps {
  instance: Instance;
  onBack: () => void;
  onLaunch: (name: string) => void;
}

const categoryToFolder = (cat: 'mods' | 'shaders' | 'resourcepacks') => {
  if (cat === 'shaders') return 'shaderpacks';
  return cat;
};

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
  if (l.includes('fabric')) return 'from-cyan-900/60 via-blue-950/40 to-[#121319]';
  if (l.includes('forge') && !l.includes('neo')) return 'from-orange-950/70 via-amber-950/40 to-[#121319]';
  if (l.includes('neoforge')) return 'from-amber-950/70 via-yellow-950/30 to-[#121319]';
  if (l.includes('quilt')) return 'from-purple-950/70 via-fuchsia-950/30 to-[#121319]';
  return 'from-emerald-950/70 via-teal-950/30 to-[#121319]';
}

export function InstanceViewTab({ instance, onBack, onLaunch }: InstanceViewTabProps) {
  const [subTab, setSubTab] = useState<'content' | 'worlds' | 'logs'>('content');
  const [contentCategory, setContentCategory] = useState<'mods' | 'shaders' | 'resourcepacks'>('mods');
  const [mods, setMods] = useState<ModItem[]>([]);
  const [worlds, setWorlds] = useState<WorldItem[]>([]);
  const [logsContent, setLogsContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const checkRunning = async () => {
    try {
      const running = await safeInvoke<string[]>('list_running');
      setIsRunning(Boolean(running && running.includes(instance.name)));
    } catch {}
  };

  const fetchMods = async () => {
    setLoading(true);
    try {
      const folder = categoryToFolder(contentCategory);
      const list = await safeInvoke<ModItem[]>('list_mods', { name: instance.name, folder });
      setMods(list || []);
    } catch (err) {
      console.error('Failed to list resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorlds = async () => {
    try {
      const list = await safeInvoke<WorldItem[]>('list_worlds', { name: instance.name });
      setWorlds(list || []);
    } catch (err) {
      console.error('Failed to list worlds:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await safeInvoke<{ ok: boolean; content: string }>('get_instance_log', { name: instance.name });
      if (res && res.content) {
        setLogsContent(res.content);
      } else {
        setLogsContent('No logs generated yet for this instance.');
      }
    } catch (err) {
      setLogsContent('Error fetching logs: ' + err);
    }
  };

  useEffect(() => {
    checkRunning();
    if (subTab === 'content') {
      fetchMods();
    } else if (subTab === 'worlds') {
      fetchWorlds();
    } else if (subTab === 'logs') {
      fetchLogs();
    }
  }, [instance.name, contentCategory, subTab]);

  const handleToggle = async (filename: string) => {
    try {
      const folder = categoryToFolder(contentCategory);
      await safeInvoke('toggle_mod', { name: instance.name, filename, folder });
      fetchMods();
    } catch (err) {
      console.error('Failed to toggle resource:', err);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      const folder = categoryToFolder(contentCategory);
      await safeInvoke('delete_mod', { name: instance.name, filename, folder });
      fetchMods();
    } catch (err) {
      console.error('Failed to delete resource:', err);
    }
  };

  const handleOpenFolder = async (folder?: string) => {
    try {
      if (folder) {
        await safeInvoke('open_instance_folder', { name: `${instance.name}/${folder}` });
      } else {
        await safeInvoke('open_instance_folder', { name: instance.name });
      }
    } catch {
      await safeInvoke('open_instance_folder', { name: instance.name });
    }
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logsContent);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleBulkToggle = async (enable: boolean) => {
    const folder = categoryToFolder(contentCategory);
    for (const item of mods) {
      if (item.enabled !== enable) {
        await safeInvoke('toggle_mod', { name: instance.name, filename: item.filename, folder });
      }
    }
    fetchMods();
  };

  const filteredMods = mods.filter(m =>
    m.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.filename.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const enabledCount = mods.filter(m => m.enabled).length;

  return (
    <div className="animate-fade-in space-y-5 max-w-7xl mx-auto w-full select-none pb-12">
      
      {/* ── Breadcrumb & Navigation Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14151b] hover:bg-[#1f212a] border border-[#242630] text-gray-300 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            <ChevronLeft size={14} /> Back to Library
          </button>
          <span className="text-gray-600">/</span>
          <span className="text-white font-black">{instance.name}</span>
          <span className="text-gray-600">/</span>
          <span className="capitalize font-bold text-[#facc15]">{subTab}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenFolder()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14151b] hover:bg-[#1f212a] border border-[#242630] text-gray-300 hover:text-white transition-all text-xs font-bold active:scale-95"
            title="Open instance folder in Explorer"
          >
            <FolderOpen size={13} className="text-sky-400" /> Open Folder
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14151b] hover:bg-[#1f212a] border border-[#242630] text-gray-300 hover:text-white transition-all text-xs font-bold active:scale-95"
            title="Instance Settings"
          >
            <Settings2 size={13} className="text-[#facc15]" /> Settings
          </button>
        </div>
      </div>

      {/* ── 10x Cooler Hero Header Banner ─────────────────────────────────────── */}
      <div
        className={`relative rounded-3xl border border-[#242630] bg-gradient-to-r ${LoaderBannerGradient(instance.loader)} p-6 overflow-hidden shadow-2xl flex flex-wrap items-center justify-between gap-5`}
        style={{ boxShadow: isRunning ? '0 12px 40px rgba(250,204,21,0.15)' : '0 8px 32px rgba(0,0,0,0.6)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f14]/90 via-transparent to-transparent pointer-events-none" />

        {/* Left Side: Avatar + Details */}
        <div className="relative z-10 flex items-center gap-5 min-w-0">
          {/* Avatar Icon */}
          <div className="relative flex-shrink-0">
            <div className="w-18 h-18 rounded-3xl bg-[#181922] border-2 border-[#2e3140] flex items-center justify-center text-3xl font-black text-[#facc15] shadow-2xl overflow-hidden group-hover:scale-105 transition-transform">
              {instance.icon ? (
                <img src={instance.icon} alt={instance.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#262835] to-[#12131a] text-[#facc15]">
                  <Gamepad2 size={36} />
                </div>
              )}
            </div>
            {isRunning && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#facc15] ring-2 ring-[#0e0f14] animate-pulse-glow" />
            )}
          </div>

          {/* Title & Metadata */}
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight truncate">{instance.name}</h1>
              {isRunning && (
                <span className="text-[9px] font-black uppercase bg-[#facc15] text-black px-2 py-0.5 rounded-full shadow-md animate-pulse">
                  LIVE RUNNING
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-300">
              <LoaderBadge loader={instance.loader} />
              <span className="text-[11px] font-bold text-gray-400 bg-black/40 border border-white/5 px-2 py-0.5 rounded-lg">
                MC {instance.mc_version}
              </span>
              <span className="text-[11px] font-bold text-gray-400 bg-black/40 border border-white/5 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <HardDrive size={11} className="text-gray-400" /> {instance.max_memory || 4096} MB RAM
              </span>
              <span className="text-[11px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
                {mods.length} {contentCategory} installed
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Hero Play / Stop Control */}
        <div className="relative z-10 flex items-center gap-3">
          {isRunning ? (
            <button
              onClick={() => onLaunch(instance.name)}
              className="px-7 py-3.5 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-black text-sm flex items-center gap-2 shadow-xl shadow-red-500/30 transition-all active:scale-95 hover:scale-105"
            >
              <StopCircle size={18} />
              <span>Stop Game</span>
            </button>
          ) : (
            <button
              onClick={() => onLaunch(instance.name)}
              className="px-8 py-3.5 rounded-2xl bg-[#facc15] hover:bg-yellow-300 text-black font-black text-sm flex items-center gap-2.5 shadow-xl shadow-yellow-500/25 transition-all active:scale-95 hover:scale-105"
            >
              <Play size={18} fill="currentColor" />
              <span>Play Now</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sub-Tab Navigation Bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#242630] pb-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSubTab('content')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              subTab === 'content'
                ? 'bg-[#facc15] text-black shadow-md shadow-yellow-500/15'
                : 'text-gray-400 hover:text-white hover:bg-[#16171d]'
            }`}
          >
            <Layers size={14} /> Content &amp; Mods
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${subTab === 'content' ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-400'}`}>
              {mods.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('worlds')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              subTab === 'worlds'
                ? 'bg-[#facc15] text-black shadow-md shadow-yellow-500/15'
                : 'text-gray-400 hover:text-white hover:bg-[#16171d]'
            }`}
          >
            <Globe size={14} /> Worlds &amp; Saves
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${subTab === 'worlds' ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-400'}`}>
              {worlds.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              subTab === 'logs'
                ? 'bg-[#facc15] text-black shadow-md shadow-yellow-500/15'
                : 'text-gray-400 hover:text-white hover:bg-[#16171d]'
            }`}
          >
            <Terminal size={14} /> Console &amp; Logs
          </button>
        </div>
      </div>

      {/* ── 1. CONTENT SUB-TAB ─────────────────────────────────────── */}
      {subTab === 'content' && (
        <div className="space-y-4">
          
          {/* Category Chips & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#13141a] border border-[#242630] p-3 rounded-2xl">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
              <input
                type="text"
                placeholder={`Search ${mods.length} ${contentCategory}...`}
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="w-full bg-[#0d0e12] border border-[#242630] focus:border-[#facc15]/60 rounded-xl py-2 pl-10 pr-8 text-xs text-white outline-none transition-all placeholder:text-gray-600 font-medium"
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Content Category Selector */}
            <div className="flex items-center gap-1.5 bg-[#0d0e12] border border-[#242630] p-1 rounded-xl">
              {(['mods', 'shaders', 'resourcepacks'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setContentCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    contentCategory === cat
                      ? 'bg-[#facc15] text-black shadow-sm font-black'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1b22]'
                  }`}
                >
                  {cat === 'mods' ? 'Mods' : cat === 'shaders' ? 'Shaders' : 'Resource Packs'}
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkToggle(true)}
                className="px-2.5 py-1.5 bg-[#0d0e12] hover:bg-[#1c1d24] border border-[#242630] rounded-xl text-[11px] font-bold text-gray-300 hover:text-white transition-all"
                title="Enable all items"
              >
                Enable All
              </button>
              <button
                onClick={() => handleBulkToggle(false)}
                className="px-2.5 py-1.5 bg-[#0d0e12] hover:bg-[#1c1d24] border border-[#242630] rounded-xl text-[11px] font-bold text-gray-300 hover:text-white transition-all"
                title="Disable all items"
              >
                Disable All
              </button>
              <button
                onClick={fetchMods}
                className="p-2 bg-[#0d0e12] hover:bg-[#1c1d24] border border-[#242630] rounded-xl text-gray-400 hover:text-white transition-all"
                title="Refresh list"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin text-[#facc15]' : ''} />
              </button>
              <button
                onClick={() => setShowAddResourceModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-black text-xs transition-all active:scale-95 shadow-md shadow-yellow-500/20"
              >
                <Plus size={14} />
                <span>Add {contentCategory === 'mods' ? 'Mods' : contentCategory === 'shaders' ? 'Shaders' : 'Packs'}</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-xs text-gray-500 px-1 font-medium">
            <span>Showing {filteredMods.length} of {mods.length} installed ({enabledCount} active)</span>
            <button
              onClick={() => handleOpenFolder(categoryToFolder(contentCategory))}
              className="text-[#facc15] hover:underline flex items-center gap-1 text-[11px] font-bold"
            >
              Open folder in Explorer <ArrowUpRight size={12} />
            </button>
          </div>

          {/* Content Table Container */}
          <div className="bg-[#13141a] border border-[#242630] rounded-2xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 px-5 py-3 bg-[#0d0e12] border-b border-[#242630] text-[10px] font-black uppercase tracking-wider text-gray-500">
              <span className="col-span-6">Name &amp; Source</span>
              <span className="col-span-4">File Name</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw size={24} className="animate-spin text-[#facc15]" />
                <p className="font-bold">Indexing local {contentCategory} and querying Modrinth...</p>
              </div>
            ) : filteredMods.length > 0 ? (
              <div className="divide-y divide-[#1e2029]">
                {filteredMods.map((mod, idx) => (
                  <div
                    key={mod.filename}
                    className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-[#181922] transition-colors group animate-fade-in"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    {/* Name Column */}
                    <div className="col-span-6 flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#1c1d25] border border-[#2e313f] flex items-center justify-center text-lg flex-shrink-0 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                        {mod.icon_url ? (
                          <img src={mod.icon_url} alt={mod.name} className="w-full h-full object-cover" />
                        ) : contentCategory === 'resourcepacks' ? (
                          '🎨'
                        ) : contentCategory === 'shaders' ? (
                          '🔮'
                        ) : (
                          '🧩'
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-xs truncate ${mod.enabled ? 'text-white group-hover:text-[#facc15] transition-colors' : 'text-gray-500 line-through'}`}>
                          {mod.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {mod.icon_url ? (
                            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <CheckCircle2 size={9} /> Modrinth Verified
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-500 font-medium">
                              Local {contentCategory === 'mods' ? 'JAR' : 'ZIP'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* File Column */}
                    <div className="col-span-4 text-xs font-mono text-gray-400 truncate pr-4">
                      {mod.filename}
                    </div>

                    {/* Actions Column */}
                    <div className="col-span-2 flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => handleToggle(mod.filename)}
                        title={mod.enabled ? 'Disable' : 'Enable'}
                        className={`transition-all active:scale-90 ${mod.enabled ? 'text-[#facc15]' : 'text-gray-600'}`}
                      >
                        {mod.enabled ? <ToggleRight size={24} className="fill-current" /> : <ToggleLeft size={24} />}
                      </button>
                      <button
                        onClick={() => handleDelete(mod.filename)}
                        title="Delete file"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-3">
                <Box size={36} className="text-gray-600 animate-float" />
                <div>
                  <p className="font-extrabold text-sm text-white">No {contentCategory} found in this instance</p>
                  <p className="text-xs text-gray-500 mt-0.5">Browse Modrinth to install mods with 1-click automatic dependency handling!</p>
                </div>
                <button
                  onClick={() => setShowAddResourceModal(true)}
                  className="mt-2 px-5 py-2.5 bg-[#facc15] hover:bg-yellow-300 text-black font-black text-xs rounded-xl shadow-md shadow-yellow-500/20 transition-all active:scale-95"
                >
                  + Add {contentCategory === 'mods' ? 'Mods' : contentCategory === 'shaders' ? 'Shaders' : 'Resource Packs'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. WORLDS & SAVES SUB-TAB ─────────────────────────────────────── */}
      {subTab === 'worlds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Globe size={16} className="text-[#facc15]" />
              Singleplayer Worlds &amp; Saved Games ({worlds.length})
            </h3>
            <button
              onClick={() => handleOpenFolder('saves')}
              className="text-xs text-[#facc15] hover:underline flex items-center gap-1 font-bold"
            >
              Open Saves Folder <ArrowUpRight size={12} />
            </button>
          </div>

          {worlds.length === 0 ? (
            <div className="bg-[#13141a] border border-[#242630] rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-3">
              <Globe size={36} className="text-gray-600 animate-float" />
              <p className="font-extrabold text-white text-sm">No saved worlds found</p>
              <p className="text-xs text-gray-500">Launch Minecraft and create your first world to see it here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {worlds.map(w => (
                <div key={w.folderName} className="bg-[#14151b] border border-[#242630] rounded-2xl p-4 flex items-center gap-3.5 shadow-md hover:border-[#facc15]/40 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-[#1c1d25] border border-[#2e313f] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {w.icon ? (
                      <img src={w.icon} alt={w.name} className="w-full h-full object-cover" />
                    ) : (
                      <Globe size={24} className="text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm text-white truncate">{w.name}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Last played: {new Date(w.lastModified).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3. CONSOLE & LOGS SUB-TAB ─────────────────────────────────────── */}
      {subTab === 'logs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-[#facc15]" />
              <h3 className="text-sm font-black text-white">Instance Log Viewer (`latest.log`)</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLogs}
                className="px-3 py-1.5 bg-[#14151b] hover:bg-[#1f212a] border border-[#242630] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {copiedLog ? <><Check size={12} className="text-green-400" /> Copied!</> : <><Copy size={12} /> Copy Full Log</>}
              </button>
              <button
                onClick={fetchLogs}
                className="p-1.5 bg-[#14151b] hover:bg-[#1f212a] border border-[#242630] text-gray-400 hover:text-white rounded-xl transition-all"
                title="Reload logs"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          <div className="bg-[#090a0e] border border-[#242630] rounded-2xl p-4 font-mono text-[11px] text-gray-300 max-h-[500px] overflow-y-auto custom-scrollbar leading-relaxed whitespace-pre-wrap shadow-2xl">
            {logsContent}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddResourceModal && (
        <AddResourceModal
          instanceName={instance.name}
          mcVersion={instance.mc_version}
          loader={instance.loader}
          category={contentCategory}
          onClose={() => setShowAddResourceModal(false)}
          onAdded={fetchMods}
        />
      )}

      {showSettingsModal && (
        <InstanceSettingsModal
          instance={instance}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={fetchMods}
        />
      )}
    </div>
  );
}
