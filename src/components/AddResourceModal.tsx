import { useState, useEffect } from 'react';
import { X, Search, Download, FilePlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

interface AddResourceModalProps {
  instanceName: string;
  mcVersion: string;
  loader: string;
  category: 'mods' | 'shaders' | 'resourcepacks';
  onClose: () => void;
  onAdded: () => void;
}

interface ModrinthProject {
  project_id: string;
  title: string;
  description: string;
  downloads: number;
  icon_url: string | null;
  author: string;
}

interface ModrinthVersion {
  id: string;
  game_versions: string[];
  loaders: string[];
  files: { url: string; filename: string; primary: boolean }[];
}

export function AddResourceModal({
  instanceName,
  mcVersion,
  loader,
  category,
  onClose,
  onAdded,
}: AddResourceModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'local'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ModrinthProject[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [installingId, setInstallingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  const HEADERS = { 'User-Agent': 'RevivalLauncher/1.0' };

  // Map category to Modrinth project type
  const getModrinthType = () => {
    if (category === 'shaders') return 'shader';
    if (category === 'resourcepacks') return 'resourcepack';
    return 'mod';
  };

  // Map category to destination folder in instance
  const getTargetFolder = () => {
    if (category === 'shaders') return 'shaderpacks';
    if (category === 'resourcepacks') return 'resourcepacks';
    return 'mods';
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const type = getModrinthType();
      const facets = encodeURIComponent(JSON.stringify([[`project_type:${type}`]]));
      const q = searchQuery ? `query=${encodeURIComponent(searchQuery)}&` : '';
      const res = await fetch(`https://api.modrinth.com/v2/search?${q}facets=${facets}&limit=12&index=downloads`, { headers: HEADERS });
      if (!res.ok) throw new Error('Search failed.');
      const data = await res.json();
      setSearchResults(data.hits || []);
    } catch (err: any) {
      setError(err.message || 'Search error.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [category]);

  const handleInstall = async (project: ModrinthProject) => {
    const pid = project.project_id;
    setInstallingId(pid);
    setStatus(null);

    try {
      // 1. Fetch versions
      const res = await fetch(`https://api.modrinth.com/v2/project/${pid}/version`, { headers: HEADERS });
      if (!res.ok) throw new Error('Failed to load version list.');
      const versions: ModrinthVersion[] = await res.json();

      // 2. Find compatible version
      const compatible = versions.find(v => {
        const mcMatch = v.game_versions.includes(mcVersion);
        const loaderName = loader.toLowerCase();
        const loaderMatch = loaderName === 'vanilla' ? true : v.loaders.map(x => x.toLowerCase()).includes(loaderName);
        return mcMatch && loaderMatch;
      });

      if (!compatible) {
        throw new Error(`Incompatible with Minecraft ${mcVersion} (${loader})`);
      }

      const file = compatible.files.find(f => f.primary) ?? compatible.files[0];
      if (!file) throw new Error('No files found for this version.');

      // 3. Download and save to target subfolder
      const folder = getTargetFolder();
      await safeInvoke<any>('install_mod_file', {
        instanceName,
        fileUrl: file.url,
        fileName: file.filename,
        folder,
      });

      setStatus({ id: pid, ok: true, msg: `Installed ${project.title}!` });
      onAdded();
    } catch (err: any) {
      setStatus({ id: pid, ok: false, msg: err.message || 'Install failed.' });
    } finally {
      setInstallingId(null);
    }
  };

  const handleAddLocal = async () => {
    setStatus(null);
    try {
      const folder = getTargetFolder();
      const ext = category === 'mods' ? 'jar' : 'zip';
      const nameLabel = category === 'mods' ? 'Minecraft Mod (.jar)' : 'Archive (.zip)';

      const res = await safeInvoke<{ canceled: boolean; filePaths: string[] }>('show_open_dialog', {
        title: `Select ${nameLabel} File`,
        filters: [{ name: nameLabel, extensions: [ext] }],
        properties: ['openFile'],
      });

      if (!res.canceled && res.filePaths[0]) {
        const path = res.filePaths[0];
        const copyRes = await safeInvoke<{ ok: boolean; filename: string }>('copy_local_file', {
          srcPath: path,
          instanceName,
          folder,
        });

        setStatus({ id: 'local', ok: true, msg: `Successfully added ${copyRes.filename}!` });
        onAdded();
      }
    } catch (err: any) {
      setStatus({ id: 'local', ok: false, msg: err.message || 'Failed to add file.' });
    }
  };

  const displayCategory = category === 'mods' ? 'Mods' : category === 'shaders' ? 'Shaders' : 'Resource Packs';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#16171d] border border-[#2c2e38] rounded-3xl w-full max-w-xl h-[75vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2c2e38] bg-[#0e0f13]">
          <div>
            <h2 className="text-base font-extrabold text-white">Add {displayCategory}</h2>
            <p className="text-[10px] text-gray-400">Install to instance: <span className="text-yellow-400 font-bold">{instanceName}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-[#0e0f13]/50 border-b border-[#2c2e38] px-6 py-2 gap-4 text-xs font-bold">
          <button
            onClick={() => { setActiveTab('search'); setStatus(null); }}
            className={`py-1.5 transition-all ${activeTab === 'search' ? 'text-[#facc15] border-b-2 border-[#facc15]' : 'text-gray-400 hover:text-white'}`}
          >
            Search Modrinth
          </button>
          <button
            onClick={() => { setActiveTab('local'); setStatus(null); }}
            className={`py-1.5 transition-all ${activeTab === 'local' ? 'text-[#facc15] border-b-2 border-[#facc15]' : 'text-gray-400 hover:text-white'}`}
          >
            Local File
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          {activeTab === 'search' ? (
            <div className="space-y-4 h-full flex flex-col">
              {/* Search form */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={`Search compatible ${category}...`}
                    className="w-full bg-[#1c1d22] border border-[#2c2e38] rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-[#facc15]/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl transition-all"
                >
                  Search
                </button>
              </form>

              {error && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Search Results list */}
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {searching ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#facc15]" size={24} />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                    {searchResults.map(project => (
                      <div
                        key={project.project_id}
                        className="bg-[#1c1d22] border border-[#2c2e38] rounded-2xl p-3.5 flex flex-col justify-between h-36"
                      >
                        <div className="flex gap-2.5">
                          {project.icon_url ? (
                            <img src={project.icon_url} alt={project.title} className="w-10 h-10 rounded-xl object-cover bg-slate-800" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl">🧩</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-xs text-white truncate">{project.title}</h4>
                            <p className="text-[9px] text-gray-500 truncate">by {project.author}</p>
                            <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 leading-relaxed">{project.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#2c2e38]/60 pt-2.5 mt-2">
                          <span className="text-[9px] text-gray-500 flex items-center gap-1">
                            <Download size={9} /> {project.downloads.toLocaleString()}
                          </span>

                          <button
                            onClick={() => handleInstall(project)}
                            disabled={installingId !== null}
                            className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1
                              ${status?.id === project.project_id
                                ? status.ok
                                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                  : 'bg-red-500/10 border-red-500/20 text-red-400'
                                : 'bg-[#facc15]/10 border-[#facc15]/20 text-[#facc15] hover:bg-[#facc15] hover:text-black'
                              }`}
                          >
                            {installingId === project.project_id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : status?.id === project.project_id ? (
                              status.ok ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />
                            ) : (
                              <Download size={10} />
                            )}
                            <span>
                              {installingId === project.project_id
                                ? 'Installing'
                                : status?.id === project.project_id
                                  ? status.ok
                                    ? 'Installed'
                                    : 'Error'
                                  : 'Install'
                              }
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500 text-xs">No resources found.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center max-w-sm mx-auto space-y-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#facc15]/10 border border-[#facc15]/30 flex items-center justify-center text-[#facc15]">
                <FilePlus size={32} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm">Add Local file</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Browse your computer to copy a local resource file directly to this instance.
                  Supports <span className="text-[#facc15] font-semibold">{category === 'mods' ? '.jar' : '.zip'}</span> archives.
                </p>
              </div>
              <button
                onClick={handleAddLocal}
                className="px-6 py-3 rounded-2xl bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-yellow-500/10"
              >
                <FilePlus size={14} /> Choose File
              </button>

              {status?.id === 'local' && (
                <div className={`text-[10px] rounded-xl px-3 py-2 border ${
                  status.ok
                    ? 'text-green-400 bg-green-950/10 border-green-500/20'
                    : 'text-red-400 bg-red-950/10 border-red-500/20'
                }`}>
                  {status.msg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
