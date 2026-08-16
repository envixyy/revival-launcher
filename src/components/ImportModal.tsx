import { useState, useRef } from 'react';
import { Upload, X, FolderOpen, Package, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

type ImportState = 'idle' | 'picking' | 'loading' | 'success' | 'error';

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [file, setFile] = useState<{ path: string; name: string } | null>(null);
  const [instanceName, setInstanceName] = useState('');
  const [progress, setProgress] = useState<{ task: number; total: number; name: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<any>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const handlePickFile = async () => {
    setState('picking');
    try {
      const res = await safeInvoke<{ canceled: boolean; filePaths: string[] }>('show_open_dialog', {
        title: 'Select a .mrpack or .zip file',
        filters: [
          { name: 'Modpack / Archive', extensions: ['mrpack', 'zip'] },
        ],
        properties: ['openFile'],
      });
      if (!res.canceled && res.filePaths[0]) {
        const fp = res.filePaths[0];
        const name = fp.split(/[\\/]/).pop() ?? fp;
        setFile({ path: fp, name });
        // Auto-fill name from filename
        setInstanceName(name.replace(/\.(mrpack|zip)$/i, '').replace(/[-_]/g, ' ').trim());
      }
    } catch (e) {
      setErrorMsg(String(e));
      setState('error');
      return;
    }
    setState('idle');
  };

  const handleImport = async () => {
    if (!file) return;
    setState('loading');
    setProgress(null);
    setErrorMsg('');

    // Listen for import progress
    if ((window as any).electronAPI?.onImportProgress) {
      (window as any).electronAPI.onImportProgress((p: any) => {
        if (p?.task != null) setProgress({ task: p.task, total: p.total, name: p.name ?? '' });
      });
    }

    try {
      const res = await safeInvoke<any>('import_pack_native', {
        filePath: file.path,
        instanceName: instanceName.trim() || undefined,
      });
      setResult(res);
      setState('success');
      onImported();
    } catch (e: any) {
      setErrorMsg(e?.message ?? String(e));
      setState('error');
    } finally {
      (window as any).electronAPI?.removeListeners?.();
    }
  };

  const isMrpack = file?.name.endsWith('.mrpack');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#16171d] border border-[#2c2e38] rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#facc15]/10 border border-[#facc15]/30 flex items-center justify-center">
              <Upload size={18} className="text-[#facc15]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Import Pack</h2>
              <p className="text-[11px] text-gray-400">Supports .mrpack and .minecraft .zip</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {state === 'success' ? (
          <div className="text-center py-6">
            <CheckCircle size={40} className="text-[#facc15] mx-auto mb-3" />
            <h3 className="font-extrabold text-white mb-1">Import Complete!</h3>
            <p className="text-sm text-gray-400">
              <strong className="text-white">{result?.name}</strong> is ready to play.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2.5 rounded-xl bg-[#facc15] text-black font-extrabold text-sm hover:bg-yellow-300 transition-all"
            >
              Done
            </button>
          </div>
        ) : state === 'error' ? (
          <div className="text-center py-6">
            <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
            <h3 className="font-extrabold text-white mb-1">Import Failed</h3>
            <p className="text-xs text-gray-400 font-mono bg-black/30 p-3 rounded-xl mt-2 text-left break-all">{errorMsg}</p>
            <button
              onClick={() => setState('idle')}
              className="mt-4 px-6 py-2.5 rounded-xl bg-[#1c1d22] border border-[#2c2e38] text-white font-bold text-sm hover:border-[#facc15]/40 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              ref={dragRef}
              onClick={handlePickFile}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                file
                  ? 'border-[#facc15]/50 bg-[#facc15]/5'
                  : 'border-[#2c2e38] hover:border-[#facc15]/40 hover:bg-[#1c1d22]'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#facc15]/10 flex items-center justify-center flex-shrink-0">
                    {isMrpack ? <Package size={20} className="text-[#facc15]" /> : <FolderOpen size={20} className="text-[#facc15]" />}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-bold text-sm text-white truncate">{file.name}</p>
                    <p className="text-[11px] text-gray-400">{isMrpack ? 'Modrinth pack' : '.minecraft zip'} · Click to change</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={24} className="text-gray-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-400">Click to select file</p>
                  <p className="text-[11px] text-gray-500 mt-1">.mrpack or .zip of .minecraft folder</p>
                </div>
              )}
            </div>

            {/* Instance name */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                Instance Name
              </label>
              <input
                type="text"
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                placeholder="My Modpack"
                className="w-full bg-[#1c1d22] border border-[#2c2e38] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#facc15]/60 transition-all"
              />
            </div>

            {/* Info box */}
            <div className="bg-[#1c1d22] border border-[#2c2e38] rounded-xl p-3 text-[11px] text-gray-400 leading-relaxed">
              {isMrpack
                ? '📦 Modrinth pack: Mods will be downloaded automatically. Overrides and config files will be extracted.'
                : '🗂️ .minecraft zip: All files will be imported into the new instance folder. Create the instance first if you need a specific loader version.'}
            </div>

            {/* Progress */}
            {state === 'loading' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 size={14} className="animate-spin text-[#facc15]" />
                  {progress
                    ? `Downloading ${progress.task}/${progress.total}: ${progress.name}`
                    : 'Extracting files...'}
                </div>
                {progress && (
                  <div className="w-full bg-[#1c1d22] rounded-full h-1.5">
                    <div
                      className="bg-[#facc15] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((progress.task / progress.total) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                disabled={state === 'loading'}
                className="flex-1 py-2.5 rounded-xl bg-[#1c1d22] border border-[#2c2e38] text-gray-300 font-bold text-sm hover:border-[#facc15]/30 hover:text-white transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || state === 'loading' || !instanceName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {state === 'loading' ? (
                  <><Loader2 size={14} className="animate-spin" /> Importing...</>
                ) : (
                  <><Upload size={14} /> Import</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
