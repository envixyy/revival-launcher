import { useEffect, useState } from 'react';
import {
  Search as SearchIcon,
  Download,
  X,
  ChevronDown,
  Loader2,
  Star,
  AlertCircle,
} from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

interface ModrinthProject {
  project_id: string;
  project_type: string;
  title: string;
  description: string;
  downloads: number;
  icon_url: string | null;
  author: string;
  categories: string[];
}

interface ModrinthVersion {
  id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  date_published: string;
  downloads: number;
  version_type: 'release' | 'beta' | 'alpha';
  files: { url: string; filename: string; primary: boolean }[];
}

interface ModrinthProjectFull {
  id: string;
  title: string;
  description: string;
  body: string;
  icon_url: string | null;
  project_type: string;
  categories: string[];
  downloads: number;
  followers: number;
  team: string;
  versions: string[];
  gallery: { url: string; title: string }[];
  license: { id: string; name: string } | null;
  source_url?: string;
  issues_url?: string;
  published: string;
  updated: string;
}

interface Instance {
  name: string;
  mc_version: string;
  loader: string;
  loader_version: string;
}

interface SearchTabProps {
  activeInstance?: Instance | null;
  onSelectInstance?: (inst: Instance | null) => void;
}

function SimpleMarkdown({ body }: { body: string }) {
  const cleaned = body
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, '')
    .replace(/>\s/g, '')
    .replace(/---/g, '')
    .trim();
  return (
    <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">
      {cleaned.slice(0, 1800)}{cleaned.length > 1800 ? '…' : ''}
    </p>
  );
}

export function SearchTab({ activeInstance, onSelectInstance }: SearchTabProps) {
  const [installing, setInstalling] = useState<string | null>(null);
  const [installStatus, setInstallStatus] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ModrinthProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [platform, setPlatform] = useState<'modrinth' | 'curseforge' | 'ftb' | 'technic'>('modrinth');
  const [resourceType, setResourceType] = useState<'mod' | 'modpack' | 'resourcepack' | 'shader'>('mod');
  const [quickInstalling, setQuickInstalling] = useState<Record<string, boolean>>({});
  const [quickInstallStatus, setQuickInstallStatus] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Details Overlay state
  const [detailProject, setDetailProject] = useState<ModrinthProjectFull | null>(null);
  const [detailVersions, setDetailVersions] = useState<ModrinthVersion[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [detailError, setDetailError] = useState<string | null>(null);

  const HEADERS = { 'User-Agent': 'RevivalLauncher/1.0' };

  const handleInstall = async (project: any, versionId?: string) => {
    // If it's a modpack, we download and import it as a new instance
    const isPack = resourceType === 'modpack' || project.project_type === 'modpack';
    
    setInstalling(versionId || project.project_id || project.id);
    setInstallStatus(null);

    try {
      let versionsList = detailVersions;
      if (versionsList.length === 0) {
        const res = await fetch(`https://api.modrinth.com/v2/project/${project.project_id || project.id}/version`, { headers: HEADERS });
        versionsList = await res.json();
      }

      // Pick target version
      let targetVer = versionId ? versionsList.find(v => v.id === versionId) : null;
      if (!targetVer) {
        if (activeInstance && !isPack) {
          // Find first compatible with active instance, with smart fallbacks
          targetVer = versionsList.find(v => {
            const mcMatch = v.game_versions.includes(activeInstance.mc_version);
            const loaderName = activeInstance.loader.toLowerCase();
            const loaderMatch = loaderName === 'vanilla' ? true : v.loaders.map(x => x.toLowerCase()).includes(loaderName);
            return mcMatch && loaderMatch;
          });

          if (!targetVer) {
            const parts = activeInstance.mc_version.split('.');
            const majorMinor = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : activeInstance.mc_version;
            targetVer = versionsList.find(v => {
              const mcMatch = v.game_versions.some(gv => gv.startsWith(majorMinor));
              const loaderName = activeInstance.loader.toLowerCase();
              const loaderMatch = loaderName === 'vanilla' ? true : v.loaders.map(x => x.toLowerCase()).includes(loaderName);
              return mcMatch && loaderMatch;
            });
          }

          if (!targetVer) {
            const loaderName = activeInstance.loader.toLowerCase();
            targetVer = versionsList.find(v => {
              return loaderName === 'vanilla' ? true : v.loaders.map(x => x.toLowerCase()).includes(loaderName);
            });
          }
        }
        if (!targetVer && versionsList.length > 0) targetVer = versionsList[0];
      }

      if (!targetVer) throw new Error('No compatible version found.');

      const primaryFile = targetVer.files.find(f => f.primary) ?? targetVer.files[0];
      if (!primaryFile) throw new Error('No installable files found.');

      if (isPack) {
        // Natively import modpack URL as a new instance
        await safeInvoke<any>('import_pack_native', {
          filePath: primaryFile.url,
          instanceName: project.title,
        });
        setInstallStatus({
          id: targetVer.id,
          ok: true,
          msg: `✓ Pack "${project.title}" installed successfully as a new instance!`,
        });
      } else {
        if (!activeInstance) throw new Error('Please select an active instance first.');

        // Determine destination folder based on resourceType
        let targetFolder = 'mods';
        if (resourceType === 'shader') targetFolder = 'shaderpacks';
        else if (resourceType === 'resourcepack') targetFolder = 'resourcepacks';

        await safeInvoke<any>('install_mod_file', {
          instanceName: activeInstance.name,
          fileUrl: primaryFile.url,
          fileName: primaryFile.filename,
          folder: targetFolder,
        });

        setInstallStatus({
          id: targetVer.id,
          ok: true,
          msg: `✓ Installed ${project.title} to "${activeInstance.name}"`,
        });
      }
    } catch (err: any) {
      setInstallStatus({
        id: versionId || project.project_id || project.id,
        ok: false,
        msg: err.message || 'Installation failed.',
      });
    } finally {
      setInstalling(null);
    }
  };

  const handleQuickInstall = async (project: ModrinthProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const pid = project.project_id;
    setQuickInstalling(prev => ({ ...prev, [pid]: true }));
    setQuickInstallStatus(prev => {
      const copy = { ...prev };
      delete copy[pid];
      return copy;
    });

    try {
      const isPack = resourceType === 'modpack' || project.project_type === 'modpack';
      if (isPack) {
        await handleInstall(project);
        setQuickInstallStatus(prev => ({ ...prev, [pid]: { ok: true, msg: 'Pack Installed!' } }));
      } else {
        if (!activeInstance) throw new Error('Select active instance.');
        await handleInstall(project);
        setQuickInstallStatus(prev => ({ ...prev, [pid]: { ok: true, msg: 'Installed!' } }));
      }
    } catch (err: any) {
      setQuickInstallStatus(prev => ({ ...prev, [pid]: { ok: false, msg: err.message || 'Failed' } }));
    } finally {
      setQuickInstalling(prev => ({ ...prev, [pid]: false }));
    }
  };

  const searchModrinth = async (searchQuery: string, _currentPlatform = platform, currentCategory = resourceType) => {
    setLoading(true);
    setError(null);
    try {
      const mrCategoryMap: Record<string, string> = { mod: 'mod', modpack: 'modpack', resourcepack: 'resourcepack', shader: 'shader' };
      const projectType = mrCategoryMap[currentCategory] || 'mod';
      const facets = encodeURIComponent(JSON.stringify([[`project_type:${projectType}`]]));
      const qParam = searchQuery ? `query=${encodeURIComponent(searchQuery)}&` : '';
      const url = `https://api.modrinth.com/v2/search?${qParam}facets=${facets}&limit=20&index=downloads`;
      
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) throw new Error(`Search query failed: ${response.statusText}`);
      const data = await response.json();
      setResults(data.hits || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch search results.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchModrinth(query, platform, resourceType);
  }, [platform, resourceType]);

  const openDetails = async (project: ModrinthProject) => {
    setDetailProject(null);
    setDetailVersions([]);
    setDetailError(null);
    setSelectedVersion('');
    setDetailLoading(true);
    setInstallStatus(null);

    try {
      const [projRes, versRes] = await Promise.all([
        fetch(`https://api.modrinth.com/v2/project/${project.project_id}`, { headers: HEADERS }),
        fetch(`https://api.modrinth.com/v2/project/${project.project_id}/version`, { headers: HEADERS }),
      ]);

      if (!projRes.ok) throw new Error(`Failed to load project details.`);
      if (!versRes.ok) throw new Error(`Failed to load project versions.`);

      const proj: ModrinthProjectFull = await projRes.json();
      const vers: ModrinthVersion[] = await versRes.json();

      setDetailProject(proj);
      setDetailVersions(vers);
      if (vers.length > 0) setSelectedVersion(vers[0].id);
    } catch (err: any) {
      setDetailError(err.message || 'Failed to load details.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    searchModrinth('');
    safeInvoke<Instance[]>('list_instances').then(setInstances).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchModrinth(query);
  };

  const filteredVersions = detailVersions.filter(v => {
    if (!activeInstance || resourceType === 'modpack') return true;
    const mcMatch = v.game_versions.includes(activeInstance.mc_version);
    const loaderName = activeInstance.loader.toLowerCase();
    const loaderMatch = loaderName === 'vanilla' ? true : v.loaders.map(x => x.toLowerCase()).includes(loaderName);
    return mcMatch && loaderMatch;
  });

  useEffect(() => {
    if (filteredVersions.length > 0) {
      if (!filteredVersions.some(x => x.id === selectedVersion)) {
        setSelectedVersion(filteredVersions[0].id);
      }
    } else {
      setSelectedVersion('');
    }
  }, [detailVersions, activeInstance]);

  return (
    <div className="h-full flex flex-col animate-fade-in pb-8 space-y-6">
      {/* Search Header */}
      <div className="flex flex-col gap-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={`Search ${resourceType}s on ${platform.toUpperCase()}...`}
              className="w-full bg-[#1c1d22] border border-[#2c2e38] rounded-2xl py-3 pl-12 pr-4 text-xs text-white outline-none focus:border-[#facc15]/60 transition-all"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-6 bg-[#facc15] hover:bg-yellow-300 text-black rounded-2xl flex items-center gap-2 transition-all font-extrabold text-xs shadow-md shadow-yellow-500/10"
          >
            Search
          </button>
        </form>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5 bg-[#16171d] p-1.5 rounded-xl border border-[#2c2e38]">
            <span className="text-gray-400 font-extrabold px-1.5 uppercase text-[10px] tracking-wider">Provider:</span>
            {[
              { id: 'modrinth', name: 'Modrinth' },
              { id: 'curseforge', name: 'CurseForge' },
              { id: 'ftb', name: 'FTB' },
              { id: 'technic', name: 'Technic' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id as any)}
                className={`px-3 py-1 rounded-lg font-extrabold transition-all text-xs ${
                  platform === p.id
                    ? 'bg-[#facc15] text-black shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#20222a]'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-[#16171d] p-1.5 rounded-xl border border-[#2c2e38]">
            <span className="text-gray-400 font-extrabold px-1.5 uppercase text-[10px] tracking-wider">Type:</span>
            {(['mod', 'modpack', 'resourcepack', 'shader'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setResourceType(t)}
                className={`px-3 py-1 rounded-lg font-extrabold transition-all text-xs ${
                  resourceType === t
                    ? 'bg-[#facc15] text-black shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#20222a]'
                }`}
              >
                {t === 'resourcepack' ? 'Resource Pack' : t === 'modpack' ? 'Modpack' : t === 'shader' ? 'Shader' : 'Mod'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Results Catalog (Premium Card Design) */}
      {error && (
        <div className="p-4 bg-red-900/10 border border-red-500/20 text-red-400 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-[#1c1d22] border border-[#2c2e38] rounded-3xl h-48 animate-pulse" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((project) => (
              <div
                key={project.project_id}
                onClick={() => openDetails(project)}
                className="bg-[#1c1d22] border border-[#2c2e38] hover:border-[#facc15]/40 rounded-3xl p-4 flex flex-col justify-between h-48 shadow-lg cursor-pointer transition-all hover:-translate-y-1 group relative"
              >
                <div className="flex gap-3">
                  {project.icon_url ? (
                    <img
                      src={project.icon_url}
                      alt={project.title}
                      className="w-12 h-12 bg-[#2c2e38] rounded-xl flex-shrink-0 object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-[#2c2e38] rounded-xl flex-shrink-0 flex items-center justify-center text-xl">🧩</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm text-white truncate group-hover:text-[#facc15] transition-colors leading-tight">
                      {project.title}
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">by {project.author}</p>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-1.5 leading-relaxed">{project.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#2c2e38] pt-3 mt-3">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Download size={10} />
                    <span>{project.downloads.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={e => handleQuickInstall(project, e)}
                    disabled={quickInstalling[project.project_id]}
                    className={`text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5
                      ${quickInstallStatus[project.project_id]?.ok
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : quickInstallStatus[project.project_id]
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-[#facc15]/10 border-[#facc15]/20 text-[#facc15] hover:bg-[#facc15] hover:text-black'
                      }`}
                  >
                    {quickInstalling[project.project_id] ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Download size={10} />
                    )}
                    <span>
                      {quickInstalling[project.project_id]
                        ? 'Installing'
                        : quickInstallStatus[project.project_id]?.ok
                          ? 'Installed'
                          : resourceType === 'modpack' ? 'Get Pack' : 'Install'
                      }
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500 text-xs">No projects found. Try adjusting your query.</div>
        )}
      </div>

      {/* Details Full Screen Modal Overlay (Less Modrinth, cleaner design) */}
      {detailProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-[#16171d] border border-[#2c2e38] rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2c2e38] bg-[#0e0f13]">
              <div className="flex items-center gap-3">
                {detailProject.icon_url ? (
                  <img src={detailProject.icon_url} alt={detailProject.title} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#2c2e38] flex items-center justify-center text-xl">🧩</div>
                )}
                <div>
                  <h3 className="font-extrabold text-sm text-white">{detailProject.title}</h3>
                  <p className="text-[10px] text-gray-400">Project Details</p>
                </div>
              </div>
              <button
                onClick={() => setDetailProject(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
              {detailLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-[#facc15]" />
                </div>
              ) : detailError ? (
                <div className="text-red-400 text-center py-10 flex flex-col items-center gap-2">
                  <AlertCircle size={32} />
                  <p className="text-sm">{detailError}</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Column: Body content */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Description</h4>
                        <p className="text-xs text-gray-300 leading-relaxed bg-[#1c1d22]/40 border border-[#2c2e38] p-4 rounded-2xl">
                          {detailProject.description}
                        </p>
                      </div>

                      {detailProject.body && (
                        <div>
                          <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">About</h4>
                          <div className="bg-[#1c1d22]/40 border border-[#2c2e38] p-4 rounded-2xl">
                            <SimpleMarkdown body={detailProject.body} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Meta & Actions */}
                    <div className="w-full md:w-60 flex flex-col gap-4">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 bg-[#1c1d22] border border-[#2c2e38] p-3 rounded-2xl">
                        <div className="text-center">
                          <Download size={12} className="text-[#facc15] mx-auto mb-1" />
                          <div className="font-extrabold text-xs text-white">{detailProject.downloads.toLocaleString()}</div>
                          <div className="text-[9px] text-gray-500">Downloads</div>
                        </div>
                        <div className="text-center">
                          <Star size={12} className="text-[#facc15] mx-auto mb-1" />
                          <div className="font-extrabold text-xs text-white">{detailProject.followers.toLocaleString()}</div>
                          <div className="text-[9px] text-gray-500">Followers</div>
                        </div>
                      </div>

                      {/* Select target instance */}
                      {resourceType !== 'modpack' && (
                        <div className="bg-[#1c1d22] border border-[#2c2e38] p-3 rounded-2xl space-y-2">
                          <label className="text-[10px] text-gray-400 font-extrabold uppercase block">Target Instance</label>
                          <div className="relative">
                            <select
                              value={activeInstance?.name ?? ''}
                              onChange={e => {
                                const found = instances.find(i => i.name === e.target.value) ?? null;
                                onSelectInstance?.(found);
                              }}
                              className="w-full bg-[#16171d] border border-[#2c2e38] rounded-xl p-2 pr-8 text-xs text-white outline-none cursor-pointer appearance-none"
                            >
                              <option value="">— Select Instance —</option>
                              {instances.map(inst => (
                                <option key={inst.name} value={inst.name}>
                                  {inst.name} ({inst.mc_version})
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      )}

                      {/* Versions */}
                      <div className="bg-[#1c1d22] border border-[#2c2e38] p-3 rounded-2xl space-y-2">
                        <label className="text-[10px] text-gray-400 font-extrabold uppercase block">Versions</label>
                        {filteredVersions.length === 0 ? (
                          <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/10 p-2.5 rounded-xl">
                            No compatible versions.
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value={selectedVersion}
                              onChange={e => setSelectedVersion(e.target.value)}
                              className="w-full bg-[#16171d] border border-[#2c2e38] rounded-xl p-2 pr-8 text-xs text-white outline-none cursor-pointer appearance-none"
                            >
                              {filteredVersions.map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.version_number} ({v.version_type})
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        )}
                      </div>

                      {/* Install Action */}
                      <div className="mt-auto">
                        <button
                          disabled={(resourceType !== 'modpack' && !activeInstance) || !selectedVersion || installing !== null}
                          onClick={() => handleInstall(detailProject, selectedVersion)}
                          className="w-full py-3 bg-[#facc15] text-black font-extrabold rounded-2xl text-xs hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-yellow-500/10"
                        >
                          {installing ? (
                            <><Loader2 size={12} className="animate-spin" /> Installing…</>
                          ) : (
                            <><Download size={12} /> {resourceType === 'modpack' ? 'Install Modpack' : 'Install'}</>
                          )}
                        </button>
                      </div>

                      {installStatus && (
                        <div className={`text-[10px] rounded-xl px-3 py-2 border ${
                          installStatus.ok
                            ? 'text-green-400 bg-green-950/10 border-green-500/20'
                            : 'text-red-400 bg-red-950/10 border-red-500/20'
                        }`}>
                          {installStatus.msg}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
