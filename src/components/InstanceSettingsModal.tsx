import { useEffect, useState } from 'react';
import { X, Folder, Trash2, Save, HardDrive } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

interface Instance {
  name: string;
  mc_version: string;
  loader: string;
  loader_version: string;
  max_memory?: number;
  min_memory?: number;
  java_path?: string | null;
}

interface InstanceSettingsModalProps {
  instance: Instance;
  onClose: () => void;
  onUpdate: () => void;
}

export function InstanceSettingsModal({ instance, onClose, onUpdate }: InstanceSettingsModalProps) {
  const [name, setName] = useState(instance.name);
  const [mcVersion, setMcVersion] = useState(instance.mc_version);
  const [loader, setLoader] = useState(instance.loader);
  const [loaderVersion, setLoaderVersion] = useState(instance.loader_version || 'latest');
  const [maxMemory, setMaxMemory] = useState(instance.max_memory || 4096);
  const [minMemory] = useState(instance.min_memory || 2048);
  const [javaPath, setJavaPath] = useState(instance.java_path || '');
  const [loading, setLoading] = useState(false);
  const [mcVersions, setMcVersions] = useState<string[]>([]);
  const [javaPaths, setJavaPaths] = useState<string[]>([]);

  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const list = await safeInvoke<any[]>('get_minecraft_versions');
        const filtered = list
          .filter((v: any) => v.type === 'release')
          .map((v: any) => v.id);
        setMcVersions(filtered);
      } catch (err) {
        console.error('Error fetching Minecraft versions via IPC:', err);
        setMcVersions(['1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9']);
      }
    };

    const detectJava = async () => {
      try {
        const paths = await safeInvoke<string[]>('detect_java');
        setJavaPaths(paths);
      } catch (err) {
        console.error(err);
      }
    };

    fetchManifest();
    detectJava();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await safeInvoke('update_instance_settings', {
        oldName: instance.name,
        name,
        mc_version: mcVersion,
        loader,
        loader_version: loaderVersion,
        max_memory: maxMemory,
        min_memory: minMemory,
        java_path: javaPath || null
      });
      onUpdate();
      onClose();
    } catch (err) {
      alert('Failed to save settings: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await safeInvoke('open_instance_folder', { name: instance.name });
    } catch (err) {
      alert('Failed to open folder: ' + err);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete instance "${instance.name}"? This action cannot be undone.`)) {
      setLoading(true);
      try {
        await safeInvoke('delete_instance', { name: instance.name });
        onUpdate();
        onClose();
      } catch (err) {
        alert('Failed to delete instance: ' + err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-revival-card border border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800/60">
          <div>
            <h3 className="text-xl font-bold">Instance Settings</h3>
            <p className="text-xs text-gray-400 mt-1">Configure {instance.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          
          {/* General Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Instance Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-revival-accent transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Minecraft Version</label>
                <select 
                  value={mcVersion} 
                  onChange={e => setMcVersion(e.target.value)}
                  className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-revival-accent transition-colors"
                >
                  {mcVersions.length > 0 ? (
                    mcVersions.map(v => <option key={v} value={v}>{v}</option>)
                  ) : (
                    <option value={mcVersion}>{mcVersion}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Mod Loader</label>
                <select 
                  value={loader} 
                  onChange={e => setLoader(e.target.value)}
                  className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-revival-accent transition-colors"
                >
                  <option value="Vanilla">Vanilla</option>
                  <option value="Fabric">Fabric</option>
                  <option value="Forge">Forge</option>
                  <option value="Quilt">Quilt</option>
                  <option value="NeoForge">NeoForge</option>
                </select>
              </div>
            </div>

            {loader !== 'Vanilla' && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Loader Version</label>
                <input 
                  type="text" 
                  value={loaderVersion} 
                  onChange={e => setLoaderVersion(e.target.value)} 
                  className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-revival-accent transition-colors"
                  placeholder="e.g. latest, 0.15.7"
                />
              </div>
            )}
          </div>

          {/* JVM & Memory Settings */}
          <div className="border-t border-gray-800/60 pt-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={16} className="text-revival-accent" />
              <h4 className="text-sm font-bold text-gray-200">System & Performance</h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Maximum RAM (MB)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1024" 
                  max="16384" 
                  step="512" 
                  value={maxMemory} 
                  onChange={e => setMaxMemory(parseInt(e.target.value))}
                  className="flex-1 accent-revival-accent cursor-pointer h-1.5 bg-gray-800 rounded-lg"
                />
                <span className="text-sm font-mono font-bold text-revival-accent w-16 text-right">{maxMemory}MB</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Java Path (Optional)</label>
              <select 
                value={javaPath} 
                onChange={e => setJavaPath(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-revival-accent transition-colors"
              >
                <option value="">Use Default System Java</option>
                {javaPaths.map((p, idx) => (
                  <option key={idx} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions & Buttons */}
          <div className="border-t border-gray-800/60 pt-6 flex flex-wrap gap-3">
            <button 
              type="button" 
              onClick={handleOpenFolder}
              className="flex-1 min-w-[140px] bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-gray-200 py-3 rounded-2xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Folder size={14} />
              Open Folder
            </button>
            <button 
              type="button" 
              onClick={handleDelete}
              className="flex-1 min-w-[140px] bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 py-3 rounded-2xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={14} />
              Delete Instance
            </button>
          </div>

        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800/60 bg-gray-900/10 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="bg-revival-accent text-revival-dark hover:opacity-90 px-6 py-2.5 rounded-xl text-sm font-bold transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
