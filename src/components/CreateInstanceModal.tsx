import { useEffect, useState } from 'react';
import {
  X, AlertCircle, Plus, FolderDown, Layers, Hammer, Cpu, Box, Boxes, Check, Sparkles
} from 'lucide-react';
import { safeInvoke, isElectron } from '../utils/tauri';

interface CreateInstanceModalProps {
  onClose: () => void;
  onCreate: (name: string, mcVersion: string, loader: string, loaderVersion: string) => void;
}

interface McVersionMeta {
  id: string;
  type: string;
}

interface ImportProgressMeta {
  phase: string;
  message: string;
  detail: string;
  percent: number;
}

const LOADERS = [
  { id: 'Vanilla', name: 'Vanilla', desc: 'Official Mojang release', icon: Box, color: 'text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'Fabric', name: 'Fabric', desc: 'Modern & lightweight modloader', icon: Layers, color: 'text-sky-400', border: 'border-sky-500/30' },
  { id: 'Forge', name: 'Forge', desc: 'Classic Minecraft modding API', icon: Hammer, color: 'text-orange-400', border: 'border-orange-500/30' },
  { id: 'NeoForge', name: 'NeoForge', desc: 'Next-gen modern Forge fork', icon: Cpu, color: 'text-amber-400', border: 'border-amber-500/30' },
  { id: 'Quilt', name: 'Quilt', desc: 'Modular community loader', icon: Boxes, color: 'text-purple-400', border: 'border-purple-500/30' },
];

export function CreateInstanceModal({ onClose, onCreate }: CreateInstanceModalProps) {
  const [tab, setTab] = useState<'create' | 'import'>('create');
  
  // Custom instance state
  const [name, setName] = useState('');
  const [mcVersion, setMcVersion] = useState('1.21.1');
  const [loader, setLoader] = useState('Fabric');
  const [loaderVersion, setLoaderVersion] = useState('latest');
  const [mcVersions, setMcVersions] = useState<string[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [showSnapshots, setShowSnapshots] = useState(false);

  // Modpack import state
  const [modpackPath, setModpackPath] = useState('');
  const [ramMb, setRamMb] = useState(4096);
  const [workers, setWorkers] = useState(4);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgressMeta | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const list = await safeInvoke<McVersionMeta[]>('get_minecraft_versions');
        if (list && Array.isArray(list)) {
          const filtered = list
            .filter((v: McVersionMeta) => showSnapshots || v.type === 'release')
            .map((v: McVersionMeta) => v.id);
          
          if (filtered.length > 0) {
            setMcVersions(filtered);
            setMcVersion(filtered[0]);
            return;
          }
        }
        throw new Error('Fallback to default manifest');
      } catch (err) {
        console.warn('IPC version list unavailable, using fallback:', err);
        const fallback = ['1.21.4', '1.21.3', '1.21.1', '1.20.6', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9'];
        setMcVersions(fallback);
        setMcVersion('1.21.4');
      } finally {
        setLoadingVersions(false);
      }
    };
    fetchVersions();
  }, [showSnapshots]);

  useEffect(() => {
    if (isElectron() && (window as any).electronAPI.onImportProgress) {
      (window as any).electronAPI.onImportProgress((data: ImportProgressMeta) => {
        setImportProgress(data);
      });
    }
    return () => {
      if (isElectron() && (window as any).electronAPI.removeListeners) {
        (window as any).electronAPI.removeListeners();
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || `${loader} ${mcVersion}`;
    onCreate(finalName, mcVersion, loader, loaderVersion);
  };

  const handleSelectFile = async () => {
    if (!isElectron()) {
      alert('Native file picking is only supported when running the app natively.');
      return;
    }
    try {
      const res = await safeInvoke<any>('show_open_dialog', {
        title: 'Select Modpack File',
        filters: [{ name: 'Modpacks (.mrpack, .zip)', extensions: ['mrpack', 'zip'] }],
        properties: ['openFile']
      });
      if (res && !res.canceled && res.filePaths.length > 0) {
        setModpackPath(res.filePaths[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modpackPath) return;
    setImporting(true);
    setImportError(null);
    setImportProgress({ phase: 'starting', message: 'Initializing import...', detail: '', percent: 0 });

    try {
      const result = await safeInvoke<any>('import_modpack', {
        filePath: modpackPath,
        ramMb,
        workers
      });
      if (result.success) {
        onCreate(result.instance_name, result.instance_record.version, result.instance_record.loader, result.instance_record.loader_version);
      } else {
        setImportError(result.error || 'Import failed.');
      }
    } catch (err: any) {
      setImportError(err.message || String(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#121318] border border-[#1f2128] rounded-3xl w-full max-w-lg p-6 relative shadow-2xl animate-scale-up text-white select-none max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        {!importing ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#1f2128] mb-4">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  New Instance
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  Configure a custom Minecraft installation or import a pack.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[#181920] hover:bg-[#20222a] border border-[#242630] text-gray-400 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Segmented Tab Navigation */}
            <div className="grid grid-cols-2 gap-1.5 bg-[#0b0c10] border border-[#1f2128] p-1 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setTab('create')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  tab === 'create'
                    ? 'bg-[#facc15] text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Plus size={14} /> Custom Instance
              </button>
              <button
                type="button"
                onClick={() => setTab('import')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  tab === 'import'
                    ? 'bg-[#facc15] text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FolderDown size={14} /> Import Modpack
              </button>
            </div>

            {importError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2 mb-4">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {tab === 'create' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Instance Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Instance Name
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. ${loader} ${mcVersion}`}
                    className="w-full bg-[#0b0c10] border border-[#1f2128] focus:border-[#facc15]/60 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all placeholder:text-gray-600"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                {/* Modloader Visual Card Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Select Modloader
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {LOADERS.map(l => {
                      const Icon = l.icon;
                      const isSelected = loader === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setLoader(l.id)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center relative ${
                            isSelected
                              ? 'bg-[#181920] border-[#facc15] shadow-sm'
                              : 'bg-[#0b0c10] border-[#1f2128] hover:border-[#2f3240] hover:bg-[#121318]'
                          }`}
                        >
                          <Icon size={18} className={l.color} />
                          <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                            {l.name}
                          </span>
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#facc15]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Minecraft Version Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-300">
                      Minecraft Version
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={showSnapshots}
                        onChange={e => setShowSnapshots(e.target.checked)}
                        className="rounded bg-[#0b0c10] border-[#1f2128] accent-[#facc15] cursor-pointer"
                      />
                      Show Snapshots
                    </label>
                  </div>

                  {loadingVersions ? (
                    <div className="w-full bg-[#0b0c10] border border-[#1f2128] rounded-xl px-3.5 py-2.5 text-gray-500 text-xs animate-pulse">
                      Fetching version manifest...
                    </div>
                  ) : (
                    <select
                      className="w-full bg-[#0b0c10] border border-[#1f2128] focus:border-[#facc15]/60 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer transition-all"
                      value={mcVersion}
                      onChange={e => setMcVersion(e.target.value)}
                    >
                      {mcVersions.map((v, idx) => (
                        <option key={v} value={v} className="bg-[#121318] text-white py-1">
                          {v} {idx === 0 && !showSnapshots ? '(Latest Release)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Loader Version (if non-vanilla) */}
                {loader !== 'Vanilla' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      {loader} Version
                    </label>
                    <input
                      type="text"
                      placeholder="latest"
                      className="w-full bg-[#0b0c10] border border-[#1f2128] focus:border-[#facc15]/60 rounded-xl px-3.5 py-2 text-xs text-white outline-none transition-all placeholder:text-gray-600 font-mono"
                      value={loaderVersion}
                      onChange={e => setLoaderVersion(e.target.value)}
                    />
                  </div>
                )}

                {/* Submit Actions */}
                <div className="flex gap-2 justify-end border-t border-[#1f2128] pt-4 mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-[#181920] hover:bg-[#20222a] border border-[#242630] text-gray-300 hover:text-white text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                  >
                    <Check size={14} /> Create Instance
                  </button>
                </div>
              </form>
            ) : (
              /* Import Modpack Tab */
              <form onSubmit={handleImport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Modpack Package File (.mrpack, .zip)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      required
                      placeholder="Click browse to select a modpack file..."
                      value={modpackPath ? modpackPath.split(/[\\/]/).pop() : ''}
                      className="flex-1 bg-[#0b0c10] border border-[#1f2128] rounded-xl px-3.5 py-2 text-xs text-gray-300 outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={handleSelectFile}
                      className="px-4 py-2 bg-[#181920] hover:bg-[#20222a] border border-[#242630] rounded-xl text-xs font-semibold transition-all text-white"
                    >
                      Browse
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      RAM Allocation (MB)
                    </label>
                    <input
                      type="number"
                      min="1024"
                      max="16384"
                      value={ramMb}
                      onChange={e => setRamMb(parseInt(e.target.value, 10) || 4096)}
                      className="w-full bg-[#0b0c10] border border-[#1f2128] focus:border-[#facc15]/60 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Download Threads
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={workers}
                      onChange={e => setWorkers(parseInt(e.target.value, 10) || 4)}
                      className="w-full bg-[#0b0c10] border border-[#1f2128] focus:border-[#facc15]/60 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end border-t border-[#1f2128] pt-4 mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-[#181920] hover:bg-[#20222a] border border-[#242630] text-gray-300 hover:text-white text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!modpackPath}
                    className="px-5 py-2 rounded-xl bg-[#facc15] hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                  >
                    <FolderDown size={14} /> Import Modpack
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          /* Progress State */
          <div className="py-8 flex flex-col items-center justify-center space-y-5 text-center">
            <Sparkles size={36} className="text-[#facc15] animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Importing Modpack</h4>
              <p className="text-xs text-[#facc15] font-semibold uppercase tracking-wider">
                {importProgress?.phase || 'Processing'}
              </p>
              <p className="text-xs text-gray-400 truncate max-w-xs mx-auto">
                {importProgress?.message || 'Extracting files and installing mods...'}
              </p>
            </div>

            <div className="w-full bg-[#0b0c10] border border-[#1f2128] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#facc15] h-full transition-all duration-300"
                style={{ width: `${importProgress?.percent || 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 font-semibold">
              {importProgress?.percent || 0}% Complete
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
