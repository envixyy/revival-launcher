import { useEffect, useState } from 'react';
import { X, FileCode, AlertCircle } from 'lucide-react';
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

export function CreateInstanceModal({ onClose, onCreate }: CreateInstanceModalProps) {
  const [tab, setTab] = useState<'create' | 'import'>('create');
  
  // Custom instance state
  const [name, setName] = useState('');
  const [mcVersion, setMcVersion] = useState('1.20.4');
  const [loader, setLoader] = useState('Vanilla');
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
        const filtered = list
          .filter((v: McVersionMeta) => showSnapshots || v.type === 'release')
          .map((v: McVersionMeta) => v.id);
        
        setMcVersions(filtered);
        if (filtered.length > 0) {
          setMcVersion(filtered[0]);
        }
      } catch (err) {
        console.error('Error fetching Minecraft versions via IPC:', err);
        const fallback = ['1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9'];
        setMcVersions(fallback);
        setMcVersion('1.21.1');
      } finally {
        setLoadingVersions(false);
      }
    };
    fetchVersions();
  }, [showSnapshots]);

  useEffect(() => {
    // Setup IPC listener for modpack progress
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
    if (!name.trim()) return;
    onCreate(name, mcVersion, loader, loaderVersion);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-revival-card border border-gray-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        {!importing ? (
          <>
            <button 
              onClick={onClose} 
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold mb-4">New Instance</h3>

            {/* Tab Selection */}
            <div className="flex gap-2 border-b border-gray-800 pb-3 mb-4">
              <button 
                onClick={() => setTab('create')}
                className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${tab === 'create' ? 'bg-revival-accent text-revival-dark' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                Custom
              </button>
              <button 
                onClick={() => setTab('import')}
                className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${tab === 'import' ? 'bg-revival-accent text-revival-dark' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                Import Modpack
              </button>
            </div>

            {importError && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-300 flex items-center gap-2 mb-4">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {tab === 'create' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Instance Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. My Survival World"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-revival-accent transition-colors"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-400">Minecraft Version</label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                      <input 
                        type="checkbox" 
                        checked={showSnapshots} 
                        onChange={e => setShowSnapshots(e.target.checked)} 
                        className="rounded bg-gray-900 border-gray-700 accent-revival-accent" 
                      />
                      Show Snapshots
                    </label>
                  </div>
                  {loadingVersions ? (
                    <div className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-500 text-sm animate-pulse">
                      Fetching Mojang version manifest...
                    </div>
                  ) : (
                    <select 
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-revival-accent transition-colors max-h-40"
                      value={mcVersion}
                      onChange={e => setMcVersion(e.target.value)}
                    >
                      {mcVersions.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Modloader</label>
                  <select 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-revival-accent transition-colors"
                    value={loader}
                    onChange={e => setLoader(e.target.value)}
                  >
                    <option>Vanilla</option>
                    <option>Fabric</option>
                    <option>Forge</option>
                    <option>NeoForge</option>
                    <option>Quilt</option>
                  </select>
                </div>

                {loader !== 'Vanilla' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Loader Version</label>
                    <input 
                      type="text" 
                      placeholder="latest"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-revival-accent transition-colors"
                      value={loaderVersion}
                      onChange={e => setLoaderVersion(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex gap-3 justify-end mt-8">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-revival-accent hover:opacity-90 text-revival-dark rounded-xl text-sm font-semibold transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleImport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Select Modpack File (.mrpack, .zip)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly
                      required
                      placeholder="No file selected"
                      value={modpackPath ? modpackPath.split(/[\\/]/).pop() : ''}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none"
                    />
                    <button 
                      type="button"
                      onClick={handleSelectFile}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors text-white"
                    >
                      Browse
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">RAM Allocation (MB)</label>
                    <input 
                      type="number"
                      min="1024"
                      max="16384"
                      value={ramMb}
                      onChange={e => setRamMb(parseInt(e.target.value) || 4096)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-revival-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Download Workers</label>
                    <input 
                      type="number"
                      min="1"
                      max="16"
                      value={workers}
                      onChange={e => setWorkers(parseInt(e.target.value) || 4)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-revival-accent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-8">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={!modpackPath}
                    className="px-5 py-2 bg-revival-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-revival-dark rounded-xl text-sm font-semibold transition-colors"
                  >
                    Import Modpack
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center space-y-6">
            <FileCode size={48} className="text-revival-accent animate-bounce" />
            <div className="text-center space-y-2 w-full">
              <h4 className="text-lg font-bold">Importing Modpack</h4>
              <p className="text-sm text-revival-accent font-semibold">{importProgress?.phase.toUpperCase() || 'processing'}</p>
              <p className="text-xs text-gray-400 truncate max-w-[280px] mx-auto">{importProgress?.message || 'Please wait...'}</p>
              {importProgress?.detail && (
                <p className="text-[10px] text-gray-600 truncate max-w-[240px] mx-auto">{importProgress.detail}</p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-revival-accent h-full transition-all duration-300"
                style={{ width: `${importProgress?.percent || 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 font-bold">{importProgress?.percent || 0}% Complete</span>
          </div>
        )}
      </div>
    </div>
  );
}
