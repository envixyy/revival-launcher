import { X, Sparkles, Users, Zap, Layers, DownloadCloud, LayoutGrid } from 'lucide-react';

interface ReleaseNotesModalProps {
  onClose: () => void;
}

export function ReleaseNotesModal({ onClose }: ReleaseNotesModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#15161c] border border-[#facc15]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-[#1e1b0e] via-[#16171e] to-[#121318] border-b border-[#2c2e38] flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                <Sparkles size={12} /> Milestone Release
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/40 text-gray-400 border border-white/10 px-2 py-0.5 rounded-lg">
                Build v0.3.5
              </span>
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">
              Revival Launcher v0.3.5
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              Official v0.3.5 Release with refined Modrinth integration, update notifications, and layout enhancements.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-gray-400 hover:text-white transition-all border border-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Changelog List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 text-xs text-gray-300">
          
          {/* Highlight Section: Update Available & Layout ergonomics */}
          <div className="p-4 bg-[#1a170d] border border-amber-500/30 rounded-2xl space-y-2 shadow-inner">
            <h3 className="font-extrabold text-sm text-amber-400 flex items-center gap-2">
              <DownloadCloud size={16} className="text-amber-400" />
              Automated Updates & Refined TitleBar Layout
            </h3>
            <p className="text-xs text-amber-300/90 leading-relaxed font-medium">
              Integrated Prism-style GitHub update dialogs with direct changelog previews and skipped-version memory. TitleBar layout reorganized for maximum ergonomics (Logo and Navigation on Left, Window controls on Right).
            </p>
          </div>

          {/* Core Feature Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Zap size={14} className="text-[#facc15]" /> What's New in Version 0.3.5
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Item 1 */}
              <div className="p-3.5 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                  <LayoutGrid size={15} className="text-[#facc15]" />
                  Refined Instance Library
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Clean instance cards with accurate loader badges (Fabric, Forge, NeoForge, Quilt, Vanilla), favorite pinning, and last-played timestamps.
                </p>
              </div>

              {/* Item 2 */}
              <div className="p-3.5 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                  <Layers size={15} className="text-sky-400" />
                  Modrinth Mod & Pack Manager
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  In-app Modrinth browsing, direct mod updates, resource pack support, world save browser with icons, and log inspector.
                </p>
              </div>

              {/* Item 3 */}
              <div className="p-3.5 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                  <Sparkles size={15} className="text-emerald-400" />
                  Official Roadmap & Feedback Board
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Segmented community suggestions and official roadmap timeline across 4 phases (In Progress, Coming Soon, Planned, Shipped).
                </p>
              </div>

              {/* Item 4 */}
              <div className="p-3.5 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                  <Users size={15} className="text-purple-400" />
                  Friends Hub & Profiles
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Real-time friends list, direct chat messaging, profile customization, and owner controls for @envixyy.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0d0e12] border-t border-[#2c2e38] flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">
            Revival Launcher v0.3.5
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs shadow-md transition-all active:scale-95"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
