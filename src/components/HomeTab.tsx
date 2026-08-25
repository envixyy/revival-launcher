import { useEffect, useState, useRef } from 'react';
import {
  Play, Settings2, Plus, RefreshCw, Terminal, X,
  StopCircle, ChevronDown, Upload, FolderOpen,
  Copy, Trash2, Megaphone, Sparkles, ChevronRight,
  Layers, Hammer, Cpu, Box, Boxes, Gamepad2, Swords,
  Zap, Package, Flame
} from 'lucide-react';
import { safeInvoke, isElectron } from '../utils/tauri';
import { CreateInstanceModal } from './CreateInstanceModal';
import { InstanceSettingsModal } from './InstanceSettingsModal';
import { ImportModal } from './ImportModal';
import { SEVERITY_STYLES, getAnnouncements, addAnnouncement, deleteAnnouncement, Announcement, AnnouncementSeverity } from '../utils/announcements';
import { canAssignRoles } from '../utils/userCatalog';

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

interface HomeTabProps {
  onSelectInstance?: (instance: Instance) => void;
  onLaunch?: (name: string) => void;
  currentUser?: { username: string; displayName: string; avatar: string };
}

function LoaderIconComp({ loader }: { loader: string }) {
  const l = (loader || '').toLowerCase();
  if (l.includes('fabric')) return <Layers size={20} className="text-[#38bdf8]" />;
  if (l.includes('forge') && !l.includes('neo')) return <Hammer size={20} className="text-[#f97316]" />;
  if (l.includes('neoforge')) return <Cpu size={20} className="text-[#f59e0b]" />;
  if (l.includes('quilt')) return <Boxes size={20} className="text-[#a855f7]" />;
  return <Box size={20} className="text-[#22c55e]" />;
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
        className="flex items-center gap-1.5 pl-3.5 pr-2 py-1.5 rounded-l-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs shadow-md shadow-red-500/25 transition-all active:scale-95"
      >
        <StopCircle size={13} />
        Stop
      </button>
      {/* Dropdown arrow */}
      <button
        onClick={() => setOpen(v => !v)}
        className="py-1.5 px-1.5 rounded-r-xl bg-red-600 hover:bg-red-500 text-white border-l border-red-700 transition-all"
      >
        <ChevronDown size={13} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-[#16171d] border border-[#2c2e38] rounded-xl shadow-2xl z-30 overflow-hidden animate-fade-in">
          <button
            onClick={() => { setOpen(false); onStop(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors"
          >
            <StopCircle size={13} className="text-red-400" />
            Stop (graceful)
          </button>
          <button
            onClick={() => { setOpen(false); onKill(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border-t border-[#2c2e38]"
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
        className="p-2 rounded-xl bg-[#20222a] hover:bg-[#2c2f3b] text-gray-400 hover:text-white transition-colors"
        title="Instance Options"
      >
        <Settings2 size={13} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-[#16171d] border border-[#2c2e38] rounded-xl shadow-2xl z-30 overflow-hidden animate-fade-in">
          <button onClick={() => { setOpen(false); onSettings(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors">
            <Settings2 size={13} className="text-gray-400" /> Settings
          </button>
          <button onClick={() => { setOpen(false); onOpenFolder(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors">
            <FolderOpen size={13} className="text-gray-400" /> Open Folder
          </button>
          <button onClick={() => { setOpen(false); onDuplicate(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-[#1c1d22] transition-colors border-t border-[#2c2e38]">
            <Copy size={13} className="text-gray-400" /> Duplicate
          </button>
          <button onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border-t border-[#2c2e38]">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function HomeTab({ onSelectInstance: _onSelectInstance, onLaunch, currentUser }: HomeTabProps) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeInstanceForSettings, setActiveInstanceForSettings] = useState<Instance | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [runningInstances, setRunningInstances] = useState<Set<string>>(new Set());
  const [activeAnnouncementIdx, setActiveAnnouncementIdx] = useState(0);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Dynamic announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getAnnouncements());
  const isOwner = canAssignRoles(currentUser?.username);

  // Owner announcement manager state
  const [showAnnManager, setShowAnnManager] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnBody, setNewAnnBody] = useState('');
  const [newAnnSeverity, setNewAnnSeverity] = useState<AnnouncementSeverity>('info');
  const [newAnnUrl, setNewAnnUrl] = useState('');
  const [newAnnUrlLabel, setNewAnnUrlLabel] = useState('');
  const [annFeedback, setAnnFeedback] = useState('');

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

  const handlePublishAnnouncement = () => {
    if (!newAnnTitle.trim() || !newAnnBody.trim()) {
      setAnnFeedback('Title and body are required.');
      return;
    }
    const result = addAnnouncement(currentUser?.username || '', {
      severity: newAnnSeverity,
      title: newAnnTitle.trim(),
      body: newAnnBody.trim(),
      url: newAnnUrl.trim() || undefined,
      urlLabel: newAnnUrlLabel.trim() || undefined,
    });
    if (result.success) {
      setAnnouncements(getAnnouncements());
      setActiveAnnouncementIdx(0);
      setNewAnnTitle(''); setNewAnnBody(''); setNewAnnUrl(''); setNewAnnUrlLabel('');
      setAnnFeedback('✓ Published!');
    } else {
      setAnnFeedback(result.message);
    }
    setTimeout(() => setAnnFeedback(''), 3000);
  };

  const handleDeleteAnnouncement = (id: string) => {
    const result = deleteAnnouncement(currentUser?.username || '', id);
    if (result.success) {
      setAnnouncements(getAnnouncements());
      setActiveAnnouncementIdx(0);
    }
  };

  const currentAnn = announcements[activeAnnouncementIdx] ?? announcements[0];
  const annStyle = SEVERITY_STYLES[currentAnn.severity];

  return (
    <div className="animate-fade-in relative space-y-5 max-w-5xl">
      {/* Console overlay */}
      {showConsole && (
        <div className="fixed bottom-5 right-5 w-96 bg-[#0d0e11] border border-[#facc15]/30 rounded-2xl shadow-2xl z-50 flex flex-col max-h-64 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-3 py-2 bg-[#16171d] border-b border-[#2c2e38]">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-[#facc15]" />
              <span className="text-[11px] font-black text-white">Launcher Console</span>
            </div>
            <button onClick={() => setShowConsole(false)} className="text-gray-400 hover:text-white">
              <X size={13} />
            </button>
          </div>
          <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] text-gray-300 space-y-1 bg-[#090a0d]">
            {consoleLogs.map((l, i) => (
              <div key={i} className="leading-tight break-all">{l}</div>
            ))}
            <div ref={consoleBottomRef} />
          </div>
        </div>
      )}

      {/* PLATFORM-WIDE ANNOUNCEMENTS BANNER */}
      {currentAnn && (
        <div className={`relative rounded-2xl border ${annStyle.border} ${annStyle.bg} p-3.5 flex items-center justify-between gap-3 shadow-lg overflow-hidden`}>
          <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${annStyle.bar}`} />

          <div className="flex items-center gap-3 min-w-0 pl-1.5">
            <div className="w-8 h-8 rounded-xl bg-[#16171d] border border-[#2c2e38] flex items-center justify-center flex-shrink-0 shadow-sm">
              <Megaphone size={15} className={annStyle.text} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded bg-black/40 text-gray-300 border border-white/5">
                  Announcement
                </span>
                <h4 className="font-extrabold text-xs text-white truncate">{currentAnn.title}</h4>
                <span className="text-[9px] text-gray-500 font-bold hidden sm:inline">({currentAnn.date})</span>
              </div>
              <p className="text-[11px] text-gray-300 truncate mt-0.5 font-medium">{currentAnn.body}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Pagination dots */}
            {announcements.length > 1 && (
              <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5">
                {announcements.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveAnnouncementIdx(i)}
                    className={`h-2 rounded-full transition-all ${i === activeAnnouncementIdx ? `${annStyle.bar} w-4` : 'bg-gray-600 w-2'}`}
                  />
                ))}
              </div>
            )}

            {/* Owner controls */}
            {isOwner && (
              <>
                <button
                  onClick={() => handleDeleteAnnouncement(currentAnn.id)}
                  title="Delete this announcement"
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
                <button
                  onClick={() => setShowAnnManager(v => !v)}
                  title="Manage announcements"
                  className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[9px] font-black ${showAnnManager ? 'bg-amber-400/20 text-amber-300' : 'bg-black/30 hover:bg-amber-400/10 text-amber-400'}`}
                >
                  <Megaphone size={11} /> Post
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* OWNER ANNOUNCEMENT MANAGER (only visible to envixyy) */}
      {isOwner && showAnnManager && (
        <div className="bg-[#15161c] border border-amber-400/30 rounded-2xl p-4 space-y-3 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone size={14} className="text-amber-400" />
              <span className="text-xs font-black text-white">Post Platform Announcement</span>
              <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">OWNER ONLY</span>
            </div>
            <button onClick={() => setShowAnnManager(false)} className="text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newAnnTitle}
              onChange={e => setNewAnnTitle(e.target.value)}
              placeholder="Announcement title..."
              className="col-span-2 bg-[#0d0e12] border border-[#2c2e38] focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-semibold"
            />
            <textarea
              value={newAnnBody}
              onChange={e => setNewAnnBody(e.target.value)}
              placeholder="Announcement body..."
              rows={2}
              className="col-span-2 bg-[#0d0e12] border border-[#2c2e38] focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-medium resize-none"
            />
            <select
              value={newAnnSeverity}
              onChange={e => setNewAnnSeverity(e.target.value as AnnouncementSeverity)}
              className="bg-[#0d0e12] border border-[#2c2e38] text-white rounded-xl px-2 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="celebration">🎉 Celebration</option>
              <option value="info">ℹ️ Info</option>
              <option value="warning">⚠️ Warning</option>
              <option value="critical">🚨 Critical</option>
            </select>
            <input
              type="text"
              value={newAnnUrl}
              onChange={e => setNewAnnUrl(e.target.value)}
              placeholder="Link URL (optional)"
              className="bg-[#0d0e12] border border-[#2c2e38] focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePublishAnnouncement}
              className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/10"
            >
              <Megaphone size={13} /> Publish Announcement
            </button>
          </div>

          {/* List all announcements with delete */}
          {announcements.length > 0 && (
            <div className="space-y-1 border-t border-[#2c2e38] pt-2">
              <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">All Announcements ({announcements.length})</p>
              {announcements.map(ann => (
                <div key={ann.id} className="flex items-center justify-between gap-2 bg-[#0d0e12] border border-[#2c2e38] rounded-lg px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white truncate">{ann.title}</p>
                    <p className="text-[8.5px] text-gray-500 font-medium">{ann.date} · {ann.severity}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors flex-shrink-0"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {annFeedback && (
            <p className="text-[10px] font-bold text-center animate-fade-in text-amber-300">{annFeedback}</p>
          )}
        </div>
      )}

      {/* Header with Title & Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Revival Dashboard
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#facc15]/10 text-[#facc15] border border-[#facc15]/20">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Quickly launch, manage, and customize your Minecraft instances</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#16171d] border border-[#2c2e38] text-gray-300 font-bold text-xs hover:border-[#facc15]/40 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Upload size={13} /> Import .mrpack / Zip
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-black text-xs shadow-md shadow-yellow-500/20 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus size={14} /> New Instance
          </button>
        </div>
      </div>

      {/* Quick Play Banner */}
      <div className="relative bg-gradient-to-r from-[#1b170c] via-[#221c0e] to-[#121318] border border-[#facc15]/20 rounded-3xl p-6 overflow-hidden shadow-xl min-h-[130px] flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-80 h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#facc15]/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className="bg-[#facc15]/10 text-[#facc15] border border-[#facc15]/20 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
              <Flame size={12} className="text-[#facc15]" /> Ready to Play
            </span>
            <h2 className="text-xl font-black text-white mt-1.5 leading-tight">Instant Modded Minecraft</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fabric, Forge, Quilt, NeoForge & Vanilla with custom menus and mods.</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#262832] border border-[#3a3d4d] flex items-center justify-center text-[#facc15] shadow-lg">
            <Swords size={24} />
          </div>
        </div>

        <div className="relative z-10 flex gap-2.5 mt-3">
          <button
            onClick={() => {
              const latest = instances[0];
              if (latest) handleLaunch(latest.name);
              else setShowCreateModal(true);
            }}
            className="px-5 py-2.5 bg-[#facc15] hover:bg-yellow-300 text-black font-black text-xs rounded-xl shadow-md shadow-yellow-500/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Play size={13} fill="currentColor" /> {instances[0] ? `Play "${instances[0].name}"` : 'Create First Instance'}
          </button>
        </div>
      </div>

      {/* Instances Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <span>Installed Instances</span>
            <span className="text-[10px] font-bold text-gray-500 bg-[#16171d] px-2 py-0.5 rounded-md border border-[#2c2e38]">
              {instances.length}
            </span>
          </h3>
          <button
            onClick={fetchInstances}
            className="text-[10px] text-gray-400 hover:text-gray-200 font-bold uppercase flex items-center gap-1 transition-colors"
          >
            Refresh <RefreshCw size={10} className={loading ? 'animate-spin text-[#facc15]' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map(n => <div key={n} className="h-20 bg-[#16171d] border border-[#2c2e38] rounded-2xl animate-pulse" />)}
          </div>
        ) : instances.length === 0 ? (
          <div className="bg-[#16171d]/60 border border-[#2c2e38] rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#20222a] border border-[#343744] flex items-center justify-center text-gray-400">
              <Package size={26} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-white">No instances installed yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Create your first custom instance or import a pack from Modrinth/CurseForge!</p>
            </div>
            <div className="flex gap-2 mt-1 w-full max-w-xs">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 py-2.5 bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl transition-all shadow-md"
              >
                Create New Instance
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex-1 py-2.5 bg-[#20222a] border border-[#2c2e38] text-gray-300 font-bold text-xs hover:border-[#facc15]/40 hover:text-white transition-all rounded-xl"
              >
                Import Pack
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {instances.map((inst, idx) => {
              const isRunning = runningInstances.has(inst.name);
              return (
                <div
                  key={idx}
                  className={`border rounded-2xl p-3.5 flex items-center justify-between transition-all group cursor-pointer shadow-md ${
                    isRunning
                      ? 'bg-[#facc15]/5 border-[#facc15]/40 ring-1 ring-[#facc15]/20'
                      : 'bg-[#15161c] border-[#2c2e38] hover:border-[#facc15]/50 hover:bg-[#1a1b22]'
                  }`}
                  onClick={(e) => {
                    const t = e.target as HTMLElement;
                    if (t.closest('button') || t.closest('[role="menu"]')) return;
                    if (_onSelectInstance) _onSelectInstance(inst);
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-[#20222a] border border-[#343744] flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                        {inst.icon ? (
                          <img src={inst.icon} alt={inst.name} className="w-full h-full object-cover" />
                        ) : (
                          <LoaderIconComp loader={inst.loader} />
                        )}
                      </div>
                      {isRunning && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#facc15] ring-2 ring-[#15161c] animate-pulse" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm text-white truncate group-hover:text-[#facc15] transition-colors">{inst.name}</p>
                        {isRunning && (
                          <span className="text-[9px] font-black text-[#facc15] bg-[#facc15]/10 px-1.5 py-0.2 rounded border border-[#facc15]/20">
                            RUNNING
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                        {inst.mc_version} · <span className="text-gray-300 font-bold">{inst.loader || 'Vanilla'}</span> · {inst.last_played ? new Date(inst.last_played).toLocaleDateString() : 'Never played'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
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
                        className="p-2.5 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-black transition-all flex items-center justify-center shadow-md active:scale-95"
                        title="Launch Instance"
                      >
                        <Play size={13} fill="currentColor" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Featured Packs Grid */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#facc15]" />
            Featured Modpacks
          </h2>
          <span className="text-xs text-[#facc15] font-bold">Modrinth & CurseForge Supported</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'Cobblemon Official', iconComp: <Gamepad2 size={20} className="text-purple-400" />, desc: 'Pokémon inside Minecraft', tag: 'Fabric 1.20.1' },
            { name: 'Origin Realms', iconComp: <Swords size={20} className="text-emerald-400" />, desc: 'Custom biomes & quests', tag: 'Vanilla / Fabric' },
            { name: 'All of Fabric 6', iconComp: <Boxes size={20} className="text-sky-400" />, desc: 'Curated modpack experience', tag: 'Fabric 1.20.1' },
            { name: 'Fabulously Optimized', iconComp: <Zap size={20} className="text-yellow-400" />, desc: 'OptiFine replacement pack', tag: 'Performance' },
          ].map(pack => (
            <div
              key={pack.name}
              className="bg-[#15161c] border border-[#2c2e38] hover:border-[#facc15]/40 rounded-2xl p-3.5 group cursor-pointer transition-all flex flex-col justify-between shadow-md"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#20222a] border border-[#343744] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  {pack.iconComp}
                </div>
                <h4 className="font-black text-xs text-white group-hover:text-[#facc15] transition-colors">{pack.name}</h4>
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{pack.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#2c2e38]/50 flex items-center justify-between">
                <span className="text-[8.5px] font-bold text-gray-500 uppercase">{pack.tag}</span>
                <ChevronRight size={12} className="text-gray-500 group-hover:text-[#facc15] transition-colors" />
              </div>
            </div>
          ))}
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
