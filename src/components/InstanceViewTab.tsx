import { useEffect, useState } from 'react';
import { Play, RefreshCw, Trash2, ToggleLeft, ToggleRight, Search, ChevronLeft, Plus } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';
import { AddResourceModal } from './AddResourceModal';

interface Instance {
  name: string;
  mc_version: string;
  loader: string;
  loader_version: string;
  icon?: string | null;
}

interface ModItem {
  filename: string;
  name: string;
  enabled: boolean;
  icon_url?: string | null;
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

export function InstanceViewTab({ instance, onBack, onLaunch }: InstanceViewTabProps) {
  const [subTab, setSubTab] = useState<'content' | 'worlds' | 'logs'>('content');
  const [contentCategory, setContentCategory] = useState<'mods' | 'shaders' | 'resourcepacks'>('mods');
  const [mods, setMods] = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);

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

  useEffect(() => {
    fetchMods();
  }, [instance.name, contentCategory]);

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

  const filteredMods = mods.filter(m => m.name.toLowerCase().includes(filterQuery.toLowerCase()));

  return (
    <div className="animate-fade-in space-y-6">
      {/* Top Breadcrumb & Return Button */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <button onClick={onBack} className="flex items-center gap-1 hover:text-white transition-colors">
          <ChevronLeft size={14} /> Back
        </button>
        <span>/</span>
        <span className="text-white font-bold">{instance.name}</span>
        <span>/</span>
        <span className="capitalize">{subTab}</span>
      </div>

      {/* Modpack Header Bar */}
      <div className="bg-[#1c1d22] border border-[#2c2e38] rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-3xl font-black text-yellow-300 overflow-hidden">
            {instance.icon ? (
              <img src={instance.icon} alt={instance.name} className="w-full h-full object-cover" />
            ) : (
              instance.loader === 'Vanilla' ? '🌳' : '🧵'
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{instance.name}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
              <span>{instance.loader || 'Vanilla'} {instance.mc_version}</span>
              <span>•</span>
              <span>{mods.length} {contentCategory === 'resourcepacks' ? 'resource packs' : contentCategory}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onLaunch(instance.name)}
            className="px-6 py-3 rounded-2xl bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold flex items-center gap-2 shadow-lg shadow-yellow-400/20 transition-all transform active:scale-95"
          >
            <Play size={18} fill="currentColor" />
            <span>Play</span>
          </button>
        </div>
      </div>

      {/* Content / Worlds / Logs Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-[#2c2e38] pb-3">
        {(['content', 'worlds', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              subTab === tab
                ? 'bg-[#facc15] text-black shadow-md shadow-yellow-400/20'
                : 'text-gray-400 hover:text-white hover:bg-[#1c1d22]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {subTab === 'content' && (
        <div className="space-y-4">
          {/* Search Filter & Category Chips */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder={`Search ${mods.length} projects...`}
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="w-full bg-[#1c1d22] border border-[#2c2e38] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-yellow-400 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['mods', 'shaders', 'resourcepacks'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setContentCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    contentCategory === cat
                      ? 'bg-[#262830] text-yellow-300 border border-yellow-400/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {cat === 'resourcepacks' ? 'Resource Packs' : cat}
                </button>
              ))}
              <button onClick={fetchMods} className="p-2 bg-[#1c1d22] rounded-lg text-gray-400 hover:text-white">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setShowAddResourceModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs transition-all active:scale-95 shadow-md shadow-yellow-500/10"
              >
                <Plus size={13} />
                <span>Add {contentCategory === 'mods' ? 'Mods' : contentCategory === 'shaders' ? 'Shaders' : 'Packs'}</span>
              </button>
            </div>
          </div>

          {/* Mod Table List matching Modrinth Content View */}
          <div className="bg-[#1c1d22] border border-[#2c2e38] rounded-2xl overflow-hidden shadow-md">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-[#2c2e38] text-[11px] font-extrabold uppercase text-gray-400">
              <span className="col-span-6">Name</span>
              <span className="col-span-4">File</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400 text-xs">Loading resources...</div>
            ) : filteredMods.length > 0 ? (
              <div className="divide-y divide-[#242630]">
                {filteredMods.map((mod) => (
                  <div key={mod.filename} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-[#22242c] transition-colors">
                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#2a2c36] border border-[#3c3e4a]/40 flex items-center justify-center text-base flex-shrink-0 overflow-hidden">
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
                        <p className={`font-bold text-xs truncate ${mod.enabled ? 'text-white' : 'text-gray-500 line-through'}`}>
                          {mod.name}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {mod.icon_url ? 'Modrinth Verified' : contentCategory === 'mods' ? 'Local mod jar' : contentCategory === 'shaders' ? 'Local shader pack' : 'Local resource pack'}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-4 text-xs font-mono text-gray-400 truncate pr-4">
                      {mod.filename}
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(mod.filename)}
                        title={mod.enabled ? 'Disable mod' : 'Enable mod'}
                        className={`transition-colors ${mod.enabled ? 'text-yellow-300' : 'text-gray-600'}`}
                      >
                        {mod.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <button
                        onClick={() => handleDelete(mod.filename)}
                        title="Remove mod"
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 text-xs">No resources found in this instance.</div>
            )}
          </div>
        </div>
      )}

      {subTab === 'worlds' && (
        <div className="bg-[#1c1d22] border border-[#2c2e38] rounded-2xl p-8 text-center text-gray-400 text-xs">
          World manager synced with local save directory.
        </div>
      )}

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
    </div>
  );
}
