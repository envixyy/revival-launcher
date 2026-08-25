import { useState } from 'react';
import { DownloadCloud, X, Minus, Square, ExternalLink, Sparkles, ArrowDownToLine } from 'lucide-react';
import { UpdateInfo, setSkippedVersion, openUpdateDownload } from '../utils/updater';

interface UpdateAvailableModalProps {
  info: UpdateInfo;
  onClose: () => void;
}

export function UpdateAvailableModal({ info, onClose }: UpdateAvailableModalProps) {
  const [downloading, setDownloading] = useState(false);

  const handleSkip = () => {
    setSkippedVersion(info.latestVersion);
    onClose();
  };

  const handleInstall = async () => {
    setDownloading(true);
    await openUpdateDownload(info.downloadUrl);
    setTimeout(() => {
      setDownloading(false);
      onClose();
    }, 2000);
  };

  // Helper to render markdown-like lines nicely
  const renderReleaseNotes = (notes: string) => {
    const lines = notes.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-xs font-black text-[#facc15] uppercase tracking-wider mt-3 mb-1 flex items-center gap-1.5">
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-sm font-black text-white mt-3 mb-1">
            {trimmed.replace('## ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        return (
          <div key={idx} className="flex items-start gap-2 pl-2 my-1 text-[11.5px] text-gray-300 leading-relaxed">
            <div className="w-1.5 h-1.5 rounded-full bg-[#facc15] mt-1.5 flex-shrink-0" />
            <div
              dangerouslySetInnerHTML={{
                __html: content
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em class="text-amber-200">$1</em>')
                  .replace(/`(.*?)`/g, '<code class="bg-black/50 text-[#facc15] px-1 py-0.5 rounded font-mono text-[10px]">$1</code>'),
              }}
            />
          </div>
        );
      }
      if (!trimmed) {
        return <div key={idx} className="h-1" />;
      }
      return (
        <p key={idx} className="text-[11.5px] text-gray-300 leading-relaxed my-1">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-[#121319] border border-[#2c2e38] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(250,204,21,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Window-Style Title Bar */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#0c0d12] border-b border-[#242630]">
          <div className="flex items-center gap-2">
            <DownloadCloud size={15} className="text-[#facc15]" />
            <span className="text-xs font-black text-gray-200 tracking-tight">
              Update Available - Revival Launcher {info.currentVersion}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <Minus size={11} />
            </button>
            <button
              disabled
              className="w-6 h-6 flex items-center justify-center rounded text-gray-600 opacity-40 cursor-not-allowed"
            >
              <Square size={10} />
            </button>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-red-500 transition-all"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 flex gap-4 overflow-hidden flex-1">
          {/* Cloud Icon (Left Column) */}
          <div className="flex-shrink-0 pt-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#252212] to-[#17161c] border border-[#facc15]/30 flex items-center justify-center text-[#facc15] shadow-lg animate-float">
              <DownloadCloud size={32} className="text-[#facc15]" />
            </div>
          </div>

          {/* Details & Changelog (Right Column) */}
          <div className="flex-1 min-w-0 flex flex-col space-y-3 overflow-hidden">
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                A new version of Revival Launcher is available!
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-1 leading-relaxed">
                Version <strong className="text-white font-black">Revival Launcher {info.latestVersion}</strong> is now available — you have <span className="text-gray-500 font-bold">{info.currentVersion}</span>. Would you like to download it now?
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-gray-300">Release Notes:</span>
                <button
                  onClick={() => openUpdateDownload(info.releaseUrl)}
                  className="text-[10px] font-bold text-[#facc15] hover:underline flex items-center gap-1"
                >
                  View on GitHub <ExternalLink size={10} />
                </button>
              </div>

              {/* Scrollable Release Notes Container */}
              <div className="h-56 bg-[#0a0b0e] border border-[#262833] rounded-xl p-3.5 overflow-y-auto custom-scrollbar font-normal text-xs text-gray-300 space-y-1">
                {renderReleaseNotes(info.releaseNotes)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Buttons */}
        <div className="px-5 py-3 bg-[#0a0b0e] border-t border-[#20222a] flex items-center justify-between gap-3">
          {/* Skip button on left */}
          <button
            onClick={handleSkip}
            className="px-3.5 py-1.5 bg-[#181920] hover:bg-[#22242e] border border-[#2c2e38] text-gray-400 hover:text-gray-200 text-xs font-bold rounded-xl transition-all active:scale-95"
          >
            Skip This Version
          </button>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#181920] hover:bg-[#22242e] border border-[#2c2e38] text-gray-300 hover:text-white text-xs font-bold rounded-xl transition-all active:scale-95"
            >
              Remind Me Later
            </button>
            <button
              onClick={handleInstall}
              disabled={downloading}
              className="px-5 py-1.5 bg-[#facc15] hover:bg-yellow-300 text-black text-xs font-black rounded-xl shadow-md shadow-yellow-500/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              {downloading ? (
                <>
                  <ArrowDownToLine size={13} className="animate-bounce" />
                  Opening Download...
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  Install Update
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
