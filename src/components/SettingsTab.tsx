import { useEffect, useState } from 'react';
import { safeInvoke } from '../utils/tauri';
import { ShieldCheck, HardDrive, Palette, Save } from 'lucide-react';

interface SettingsTabProps {
  config: any;
  onSaveConfig: (newCfg: any) => void;
}

export function SettingsTab({ config, onSaveConfig }: SettingsTabProps) {
  const [javaPaths, setJavaPaths] = useState<string[]>([]);
  const [loadingJava, setLoadingJava] = useState(true);
  const [selectedJava, setSelectedJava] = useState(config.java_path || 'java');
  const [memory, setMemory] = useState(config.ram_mb || 4096);
  
  // Theme state
  const [accent, setAccent] = useState(config.theme_accent || '#fef08a');
  const [bg, setBg] = useState(config.theme_bg || '#b45309');
  const [gradEnd, setGradEnd] = useState(config.theme_grad_end || '#ca8a04');
  
  // Workers state
  const [workers, setWorkers] = useState(config.modpack_download_workers || 4);

  useEffect(() => {
    const detect = async () => {
      setLoadingJava(true);
      try {
        const paths = await safeInvoke<string[]>('detect_java');
        setJavaPaths(paths);
        if (paths.length > 0 && !paths.includes(selectedJava) && selectedJava === 'java') {
          setSelectedJava(paths[0]);
        }
      } catch (err) {
        console.error('Error detecting Java:', err);
      } finally {
        setLoadingJava(false);
      }
    };
    detect();
  }, [selectedJava]);

  const handleSave = () => {
    const updated = {
      ...config,
      ram_mb: memory,
      java_path: selectedJava,
      theme_accent: accent,
      theme_bg: bg,
      theme_grad_end: gradEnd,
      modpack_download_workers: workers,
    };
    onSaveConfig(updated);
  };

  return (
    <div className="max-w-3xl animate-fade-in space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Settings</h2>
        <button 
          onClick={handleSave}
          className="bg-revival-accent text-revival-dark hover:opacity-90 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
        >
          <Save size={16} />
          Save Settings
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Java & Memory */}
        <section className="bg-revival-card border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-800 pb-3">
            <HardDrive className="text-revival-accent" size={20} />
            <h3 className="text-lg font-bold">Java & Memory</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Maximum Memory Allocation (MB)</label>
              <input 
                type="range" 
                min="1024" 
                max="16384" 
                step="1024" 
                value={memory} 
                onChange={e => setMemory(parseInt(e.target.value))}
                className="w-full accent-revival-accent cursor-pointer bg-slate-800 rounded-lg h-2" 
              />
              <div className="text-right text-sm text-revival-accent font-semibold mt-2">{memory} MB</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Java Path</label>
              <div className="space-y-2">
                {loadingJava ? (
                  <div className="text-xs text-gray-500 animate-pulse">Detecting JDK installations...</div>
                ) : javaPaths.length > 0 ? (
                  <select 
                    value={selectedJava}
                    onChange={e => setSelectedJava(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-revival-accent"
                  >
                    <option value="java">Default System Java (java)</option>
                    {javaPaths.map((path, idx) => (
                      <option key={idx} value={path}>{path}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedJava}
                    onChange={e => setSelectedJava(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-revival-accent"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Theme Settings (Custom Colors) */}
        <section className="bg-revival-card border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-800 pb-3">
            <Palette className="text-revival-accent" size={20} />
            <h3 className="text-lg font-bold">Appearance (Themes)</h3>
          </div>
          
          <p className="text-sm text-gray-400 mb-6">Customize the launcher colors to your personal preference. The application layout surfaces will automatically balance with your choices.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Background Color */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">Background Color</label>
              <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl p-2">
                <input 
                  type="color" 
                  value={bg} 
                  onChange={e => setBg(e.target.value)} 
                  className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer"
                />
                <input 
                  type="text" 
                  value={bg} 
                  onChange={e => setBg(e.target.value)} 
                  className="flex-1 bg-transparent border-0 text-sm outline-none text-white font-mono"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-amber-200/80">Accent Color</label>
              <div className="flex items-center gap-3 bg-black/40 border border-amber-500/20 rounded-xl p-2.5">
                <input 
                  type="color" 
                  value={accent} 
                  onChange={e => {
                    const newAccent = e.target.value;
                    setAccent(newAccent);
                    onSaveConfig({ ...config, theme_accent: newAccent, theme_bg: bg, theme_grad_end: gradEnd });
                  }} 
                  className="w-10 h-10 rounded-lg border-0 bg-transparent cursor-pointer"
                />
                <input 
                  type="text" 
                  value={accent} 
                  onChange={e => setAccent(e.target.value)} 
                  className="flex-1 bg-transparent border-0 text-sm outline-none text-white font-mono"
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-amber-200/80">Background Base Color</label>
              <div className="flex items-center gap-3 bg-black/40 border border-amber-500/20 rounded-xl p-2.5">
                <input 
                  type="color" 
                  value={bg} 
                  onChange={e => {
                    const newBg = e.target.value;
                    setBg(newBg);
                    onSaveConfig({ ...config, theme_accent: accent, theme_bg: newBg, theme_grad_end: gradEnd });
                  }} 
                  className="w-10 h-10 rounded-lg border-0 bg-transparent cursor-pointer"
                />
                <input 
                  type="text" 
                  value={bg} 
                  onChange={e => setBg(e.target.value)} 
                  className="flex-1 bg-transparent border-0 text-sm outline-none text-white font-mono"
                />
              </div>
            </div>

            {/* Gradient End Color */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-amber-200/80">Gradient End Color</label>
              <div className="flex items-center gap-3 bg-black/40 border border-amber-500/20 rounded-xl p-2.5">
                <input 
                  type="color" 
                  value={gradEnd} 
                  onChange={e => {
                    const newGradEnd = e.target.value;
                    setGradEnd(newGradEnd);
                    onSaveConfig({ ...config, theme_accent: accent, theme_bg: bg, theme_grad_end: newGradEnd });
                  }} 
                  className="w-10 h-10 rounded-lg border-0 bg-transparent cursor-pointer"
                />
                <input 
                  type="text" 
                  value={gradEnd} 
                  onChange={e => setGradEnd(e.target.value)} 
                  className="flex-1 bg-transparent border-0 text-sm outline-none text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-200/70 font-semibold">Presets:</span>
              <button
                type="button"
                onClick={() => {
                  const p = { accent: '#eab308', bg: '#0a0a0c', gradEnd: '#ca8a04' };
                  setAccent(p.accent); setBg(p.bg); setGradEnd(p.gradEnd);
                  onSaveConfig({ ...config, theme_accent: p.accent, theme_bg: p.bg, theme_grad_end: p.gradEnd });
                }}
                className="px-3 py-1 bg-amber-950/60 border border-amber-500/30 rounded-lg text-xs font-bold text-yellow-300 hover:bg-amber-900/80 transition-all"
              >
                Revival Dark (Default)
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = { accent: '#06b6d4', bg: '#082f49', gradEnd: '#0284c7' };
                  setAccent(p.accent); setBg(p.bg); setGradEnd(p.gradEnd);
                  onSaveConfig({ ...config, theme_accent: p.accent, theme_bg: p.bg, theme_grad_end: p.gradEnd });
                }}
                className="px-3 py-1 bg-sky-950/60 border border-sky-500/30 rounded-lg text-xs font-bold text-cyan-300 hover:bg-sky-900/80 transition-all"
              >
                Cyan Sky
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = { accent: '#10b981', bg: '#064e3b', gradEnd: '#059669' };
                  setAccent(p.accent); setBg(p.bg); setGradEnd(p.gradEnd);
                  onSaveConfig({ ...config, theme_accent: p.accent, theme_bg: p.bg, theme_grad_end: p.gradEnd });
                }}
                className="px-3 py-1 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-xs font-bold text-emerald-300 hover:bg-emerald-900/80 transition-all"
              >
                Emerald
              </button>
            </div>

            <button 
              onClick={() => {
                setAccent('#eab308');
                setBg('#0a0a0c');
                setGradEnd('#ca8a04');
                onSaveConfig({ ...config, theme_accent: '#eab308', theme_bg: '#0a0a0c', theme_grad_end: '#ca8a04' });
              }}
              className="text-xs text-amber-200/50 hover:text-white transition-colors"
            >
              Reset Theme
            </button>
          </div>
        </section>

        {/* Modpack Download Workers */}
        <section className="bg-revival-card border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-800 pb-3">
            <ShieldCheck className="text-revival-accent" size={20} />
            <h3 className="text-lg font-bold">Modpack Downloader Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Simultaneous Download Workers</label>
              <input 
                type="number"
                min="1"
                max="16"
                value={workers}
                onChange={e => setWorkers(parseInt(e.target.value) || 4)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-revival-accent"
              />
              <p className="text-xs text-gray-500 mt-1">Number of parallel downloads allowed when downloading modpacks (Default is 4).</p>
            </div>
          </div>
        </section>

        {/* Updates & Version Information */}
        <section className="bg-revival-card border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#facc15]/10 border border-[#facc15]/30 flex items-center justify-center text-[#facc15]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Launcher Updates &amp; Build</h3>
                <p className="text-xs text-gray-400">Keep your Revival Launcher updated with the latest fixes and features.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-[#0d0e12] border border-[#2c2e38] rounded-xl p-3.5">
              <p className="text-[10px] font-black uppercase text-gray-500">Current Version</p>
              <p className="text-sm font-black text-white mt-0.5">v0.3.0</p>
              <span className="text-[9px] text-[#facc15] font-bold">Pre-Release Milestone</span>
            </div>
            <div className="bg-[#0d0e12] border border-[#2c2e38] rounded-xl p-3.5">
              <p className="text-[10px] font-black uppercase text-gray-500">Update Channel</p>
              <p className="text-sm font-black text-white mt-0.5">GitHub Releases</p>
              <span className="text-[9px] text-green-400 font-bold">Automatic Sync</span>
            </div>
            <div className="bg-[#0d0e12] border border-[#2c2e38] rounded-xl p-3.5">
              <p className="text-[10px] font-black uppercase text-gray-500">Author &amp; Dev</p>
              <p className="text-sm font-black text-amber-400 mt-0.5">@envixyy</p>
              <span className="text-[9px] text-gray-400 font-bold">Revival Core Team</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-400">Checks against GitHub for the newest releases and setup installers.</span>
            <button
              type="button"
              onClick={async () => {
                if ((window as any).__revivalCheckUpdates) {
                  (window as any).__revivalCheckUpdates(true);
                }
              }}
              className="px-4 py-2 bg-[#facc15] hover:bg-yellow-300 text-black text-xs font-black rounded-xl shadow-md shadow-yellow-500/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              Check for Updates Now
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
