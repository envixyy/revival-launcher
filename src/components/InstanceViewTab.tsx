import { useEffect, useState, useRef } from 'react';
import {
  Play, StopCircle, RefreshCw, Trash2, ToggleLeft, ToggleRight, Search, ChevronLeft, Plus,
  FolderOpen, Settings2, Globe, Copy, Check, X,
  Layers, Hammer, Cpu, Box, Boxes, Gamepad2, CheckCircle2,
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

export function InstanceViewTab({ instance, onBack, onLaunch }: InstanceViewTabProps) {
  const [subTab, setSubTab] = useState<'mods' | 'shaders' | 'resourcepacks' | 'worlds' | 'logs'>('mods');
  const [items, setItems] = useState<ModItem[]>([]);
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

  const isContentTab = subTab === 'mods' || subTab === 'shaders' || subTab === 'resourcepacks';

  const fetchItems = async () => {
    if (!isContentTab) return;
    setLoading(true);
    try {
      const folder = categoryToFolder(subTab as any);
      const list = await safeInvoke<ModItem[]>('list_mods', { name: instance.name, folder });
      setItems(list || []);
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
        setLogsContent('No logs found for this instance.');
      }
    } catch (err) {
      setLogsContent('Error fetching logs: ' + err);
    }
  };

  useEffect(() => {
    checkRunning();
    if (isContentTab) {
      fetchItems();
    } else if (subTab === 'worlds') {
      fetchWorlds();
    } else if (subTab === 'logs') {
      fetchLogs();
    }
  }, [instance.name, subTab]);

  const handleToggle = async (filename: string) => {
    try {
      const folder = categoryToFolder(subTab as any);
      await safeInvoke('toggle_mod', { name: instance.name, filename, folder });
      fetchItems();
    } catch (err) {
      console.error('Failed to toggle resource:', err);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      const folder = categoryToFolder(subTab as any);
      await safeInvoke('delete_mod', { name: instance.name, filename, folder });
      fetchItems();
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
    const folder = categoryToFolder(subTab as any);
    for (const item of items) {
      if (item.enabled !== enable) {
        await safeInvoke('toggle_mod', { name: instance.name, filename: item.filename, folder });
      }
    }
    fetchItems();
  };

  const filteredItems = items.filter(m =>
    m.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.filename.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto w-full select-none pb-8 animate-fade-in">
      
      {/* ── Breadcrumb Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} /> Instances
          </button>
          <span>/</span>
          <span className="text-white font-semibold">{instance.name}</span>
          <span>/</span>
          <span className="capitalize text-gray-400">{subTab}</span>
        </div>
      </div>

      {/* ── Clean Hero Header ─────────────────────────────────────── */}
      <div className="rounded-xl border border-[#1f2128] bg-[#121318] p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Avatar + Details */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-13 h-13 rounded-xl bg-[#181920] border border-[#242630] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {instance.icon ? (
              <img src={instance.icon} alt={instance.name} className="w-full h-full object-cover" />
            ) : (
              <Gamepad2 size={24} className="text-gray-400" />
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white tracking-tight truncate">{instance.name}</h1>
              {isRunning && (
                <span className="text-[10px] font-bold uppercase bg-[#facc15] text-black px-1.5 py-0.2 rounded">
                  RUNNING
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
              <LoaderTag loader={instance.loader} />
              <span>{instance.mc_version}</span>
              <span>·</span>
              <span>{items.length} {subTab}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Shortcuts & Play Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenFolder()}
            className="p-2 rounded-lg bg-[#181920] hover:bg-[#20222a] border border-[#242630] text-gray-300 hover:text-white transition-all text-xs font-semibold"
            title="Open Folder"
          >
            <FolderOpen size={14} />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-lg bg-[#181920] hover:bg-[#20222a] border border-[#242630] text-gray-300 hover:text-white transition-all text-xs font-semibold"
            title="Settings"
          >
            <Settings2 size={14} />
          </button>

          {isRunning ? (
            <button
              onClick={() => onLaunch(instance.name)}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
            >
              <StopCircle size={14} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={() => onLaunch(instance.name)}
              className="px-5 py-2 rounded-lg bg-[#facc15] hover:bg-yellow-300 text-black font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <Play size={14} fill="currentColor" />
              <span>Play</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sub-Tab Navigation Bar ─────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-[#1f2128] pb-1">
        {(['mods', 'shaders', 'resourcepacks', 'worlds', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              subTab === tab
                ? 'bg-[#1f2128] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#15161c]'
            }`}
          >
            {tab === 'mods' ? 'Mods' : tab === 'shaders' ? 'Shader Packs' : tab === 'resourcepacks' ? 'Resource Packs' : tab === 'worlds' ? 'Worlds' : 'Logs'}
          </button>
        ))}
      </div>

      {/* ── CONTENT (MODS, SHADERS, RESOURCE PACKS) ─────────────────────── */}
      {isContentTab && (
        <div className="space-y-3">
          {/* Search & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#121318] border border-[#1f2128] px-3 py-2 rounded-xl">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
              <input
                type="text"
                placeholder={`Search ${items.length} installed...`}
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#1f2128] focus:border-[#facc15]/50 rounded-lg py-1.5 pl-8 pr-7 text-xs text-white outline-none transition-all placeholder:text-gray-600"
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => handleBulkToggle(true)}
                className="px-2.5 py-1 bg-[#0b0c10] hover:bg-[#181920] border border-[#1f2128] rounded-lg text-gray-300 hover:text-white transition-all font-medium"
              >
                Enable All
              </button>
              <button
                onClick={() => handleBulkToggle(false)}
                className="px-2.5 py-1 bg-[#0b0c10] hover:bg-[#181920] border border-[#1f2128] rounded-lg text-gray-300 hover:text-white transition-all font-medium"
              >
                Disable All
              </button>
              <button
                onClick={fetchItems}
                className="p-1.5 bg-[#0b0c10] hover:bg-[#181920] border border-[#1f2128] rounded-lg text-gray-400 hover:text-white transition-all"
                title="Refresh"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin text-[#facc15]' : ''} />
              </button>
              <button
                onClick={() => setShowAddResourceModal(true)}
                className="flex items-center gap-1 px-3 py-1 bg-[#facc15] hover:bg-yellow-300 text-black font-bold rounded-lg transition-all active:scale-95"
              >
                <Plus size={13} />
                <span>Add {subTab === 'mods' ? 'Mods' : subTab === 'shaders' ? 'Shaders' : 'Packs'}</span>
              </button>
            </div>
          </div>

          {/* Mod Table */}
          <div className="bg-[#121318] border border-[#1f2128] rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2.5 bg-[#0e0f14] border-b border-[#1f2128] text-[11px] font-semibold text-gray-400">
              <span className="col-span-6">Name</span>
              <span className="col-span-4">File</span>
              <span className="col-span-2 text-right">Status</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500 text-xs">Loading items...</div>
            ) : filteredItems.length > 0 ? (
              <div className="divide-y divide-[#181920]">
                {filteredItems.map((mod) => (
                  <div
                    key={mod.filename}
                    className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-[#15161c] transition-colors group"
                  >
                    {/* Name Column */}
                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#181920] border border-[#242630] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {mod.icon_url ? (
                          <img src={mod.icon_url} alt={mod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Box size={16} className="text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-semibold text-xs truncate ${mod.enabled ? 'text-white' : 'text-gray-500 line-through'}`}>
                          {mod.name}
                        </p>
                        {mod.icon_url && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 size={10} /> Modrinth
                          </span>
                        )}
                      </div>
                    </div>

                    {/* File Column */}
                    <div className="col-span-4 text-xs font-mono text-gray-400 truncate pr-3">
                      {mod.filename}
                    </div>

                    {/* Status & Actions Column */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(mod.filename)}
                        title={mod.enabled ? 'Disable' : 'Enable'}
                        className={`transition-colors ${mod.enabled ? 'text-[#facc15]' : 'text-gray-600'}`}
                      >
                        {mod.enabled ? <ToggleRight size={22} className="fill-current" /> : <ToggleLeft size={22} />}
                      </button>
                      <button
                        onClick={() => handleDelete(mod.filename)}
                        title="Delete"
                        className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-2">
                <Box size={24} className="text-gray-600" />
                <p className="font-semibold text-white">No {subTab} installed</p>
                <button
                  onClick={() => setShowAddResourceModal(true)}
                  className="mt-1 px-3 py-1 bg-[#facc15] hover:bg-yellow-300 text-black font-bold rounded-lg text-xs"
                >
                  + Add {subTab === 'mods' ? 'Mods' : subTab === 'shaders' ? 'Shaders' : 'Packs'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WORLDS SUB-TAB ─────────────────────── */}
      {subTab === 'worlds' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-300">Singleplayer Saves ({worlds.length})</h3>
            <button
              onClick={() => handleOpenFolder('saves')}
              className="text-xs text-[#facc15] hover:underline flex items-center gap-1"
            >
              Open Saves Folder <ArrowUpRight size={11} />
            </button>
          </div>

          {worlds.length === 0 ? (
            <div className="bg-[#121318] border border-[#1f2128] rounded-xl p-12 text-center text-gray-500 text-xs">
              No saved worlds found in this instance.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {worlds.map(w => (
                <div key={w.folderName} className="bg-[#121318] border border-[#1f2128] rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#181920] border border-[#242630] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {w.icon ? (
                      <img src={w.icon} alt={w.name} className="w-full h-full object-cover" />
                    ) : (
                      <Globe size={20} className="text-gray-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-white truncate">{w.name}</h4>
                    <p className="text-[11px] text-gray-500">
                      {new Date(w.lastModified).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LOGS SUB-TAB ─────────────────────── */}
      {subTab === 'logs' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">latest.log</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLogs}
                className="px-2.5 py-1 bg-[#121318] hover:bg-[#181920] border border-[#1f2128] text-gray-300 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
              >
                {copiedLog ? <><Check size={12} className="text-green-400" /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
              <button
                onClick={fetchLogs}
                className="p-1 bg-[#121318] hover:bg-[#181920] border border-[#1f2128] text-gray-400 hover:text-white rounded-lg"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          <div className="bg-[#0b0c10] border border-[#1f2128] rounded-xl p-3 font-mono text-[11px] text-gray-300 max-h-[450px] overflow-y-auto custom-scrollbar leading-relaxed whitespace-pre-wrap">
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
          category={subTab === 'shaders' ? 'shaders' : subTab === 'resourcepacks' ? 'resourcepacks' : 'mods'}
          onClose={() => setShowAddResourceModal(false)}
          onAdded={fetchItems}
        />
      )}

      {showSettingsModal && (
        <InstanceSettingsModal
          instance={instance}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={fetchItems}
        />
      )}
    </div>
  );
}
