import { ChevronLeft, ChevronRight, DownloadCloud } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface TitleBarProps {
  currentPage: string;
  canGoBack: boolean;
  onBack: () => void;
  instancesRunning: number;
  updateAvailable?: boolean;
  onOpenUpdateModal?: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      invoke: (channel: string, args?: any) => Promise<any>;
      onLog: (cb: (val: string) => void) => void;
      onProgress: (cb: (val: any) => void) => void;
      onImportProgress: (cb: (val: any) => void) => void;
      removeListeners: () => void;
    };
  }
}

export function TitleBar({ currentPage, canGoBack, onBack, instancesRunning, updateAvailable, onOpenUpdateModal }: TitleBarProps) {
  return (
    <div
      className="flex items-center h-10 px-3 select-none flex-shrink-0 bg-[#0a0b0e] border-b border-[#1a1b22]"
      style={{
        WebkitAppRegion: 'drag',
        boxShadow: '0 1px 0 rgba(250,204,21,0.06), 0 2px 12px rgba(0,0,0,0.3)',
      } as React.CSSProperties}
    >
      {/* ── Left Side: Logo + App Name + Version Badge ───────────────────────── */}
      <div
        className="flex items-center gap-2 mr-4"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <img src={logoImg} alt="Revival" className="w-4 h-4 object-contain opacity-90" />
        <span className="text-[12px] font-extrabold text-white tracking-tight">revival</span>
        <span className="text-[12px] font-extrabold text-[#facc15] tracking-tight">launcher</span>
        <span className="text-[9px] font-black text-gray-600 bg-[#1a1b22] border border-[#2c2e38] px-1.5 py-0.5 rounded-md tracking-widest uppercase">v0.3.5</span>
      </div>

      {/* Nav Arrows (< >) */}
      <div
        className="flex items-center gap-0.5 mr-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1c1d24] disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-90"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          disabled
          className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 opacity-25 cursor-not-allowed"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Current Page Breadcrumb */}
      <span className="text-[12px] font-bold text-gray-300 tracking-tight">{currentPage}</span>

      {/* Drag spacer */}
      <div className="flex-1" />

      {/* ── Right Side: Updates + Running Status + Window Controls ─────────── */}
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        
        {/* Update Available Badge */}
        {updateAvailable && (
          <button
            onClick={onOpenUpdateModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#facc15] hover:bg-yellow-300 text-black font-black text-[10px] uppercase tracking-wide transition-all shadow-md shadow-yellow-500/20 active:scale-95 animate-bounce-in"
            title="Click to view update and install"
          >
            <DownloadCloud size={12} className="animate-bounce" />
            Update Available
          </button>
        )}

        {/* Running Instances Pill */}
        <div>
          {instancesRunning > 0 ? (
            <div className="flex items-center gap-1.5 bg-[#facc15]/10 border border-[#facc15]/25 px-2.5 py-1 rounded-full animate-fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-[#facc15] animate-status-pulse" />
              <span className="text-[10px] font-black text-[#facc15] tracking-wide">
                {instancesRunning} RUNNING
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              <span className="text-[10px] font-semibold text-gray-600">idle</span>
            </div>
          )}
        </div>

        {/* Window Controls (Traffic Lights on the Right Side) */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-[#242630] group">
          {/* Minimize — Yellow */}
          <button
            onClick={() => window.electronAPI?.minimize?.()}
            className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffab00] border border-[#dfa013]/60 transition-all duration-150 hover:scale-110 active:scale-90 flex items-center justify-center"
            title="Minimize"
          >
            <svg
              className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              viewBox="0 0 8 8" fill="none"
            >
              <path d="M1 4h6" stroke="#5c3800" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Maximize — Green */}
          <button
            onClick={() => window.electronAPI?.maximize?.()}
            className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#1aae30] border border-[#18992b]/60 transition-all duration-150 hover:scale-110 active:scale-90 flex items-center justify-center"
            title="Maximize"
          >
            <svg
              className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              viewBox="0 0 8 8" fill="none"
            >
              <path d="M1 4h6M4 1v6" stroke="#003300" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Close — Red */}
          <button
            onClick={() => window.electronAPI?.close?.()}
            className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] border border-[#e0443e]/60 transition-all duration-150 hover:scale-110 active:scale-90 flex items-center justify-center"
            title="Close"
          >
            <svg
              className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              viewBox="0 0 8 8" fill="none"
            >
              <path d="M1 1l6 6M7 1L1 7" stroke="#5c0000" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
