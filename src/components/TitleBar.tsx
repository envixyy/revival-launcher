import { Minus, Square, X, ChevronLeft, ChevronRight } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface TitleBarProps {
  currentPage: string;
  canGoBack: boolean;
  onBack: () => void;
  instancesRunning: number;
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

export function TitleBar({ currentPage, canGoBack, onBack, instancesRunning }: TitleBarProps) {
  return (
    <div
      className="flex items-center h-10 px-3 select-none flex-shrink-0 bg-[#0e0f13] border-b border-[#1e2028]"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Logo + App Name */}
      <div className="flex items-center gap-2 mr-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <img src={logoImg} alt="Revival" className="w-5 h-5 object-contain" />
        <span className="text-[13px] font-extrabold text-white tracking-tight">revival</span>
        <span className="text-[13px] font-extrabold text-[#facc15] tracking-tight">launcher</span>
      </div>

      {/* Nav Arrows */}
      <div
        className="flex items-center gap-1 mr-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          disabled
          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 opacity-30 cursor-not-allowed"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Current Page Breadcrumb */}
      <span className="text-[13px] font-bold text-white">{currentPage}</span>

      {/* Spacer — drag area */}
      <div className="flex-1" />

      {/* Status Pill */}
      <div
        className="flex items-center gap-1.5 mr-4"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className={`w-2 h-2 rounded-full ${instancesRunning > 0 ? 'bg-[#facc15]' : 'bg-gray-500'}`} />
        <span className="text-[11px] font-semibold text-gray-400">
          {instancesRunning > 0 ? `${instancesRunning} instance${instancesRunning > 1 ? 's' : ''} running` : 'No instances running'}
        </span>
      </div>

      {/* Window Controls */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI?.minimize?.()}
          className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => window.electronAPI?.maximize?.()}
          className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.electronAPI?.close?.()}
          className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-red-500 transition-all"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

