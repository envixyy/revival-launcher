import { X, Sparkles, CheckCircle2, Shield, Users, MessageSquare, Image, Lock, Layers, Zap } from 'lucide-react';

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
                <Sparkles size={12} /> Milestone Pre-Release
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/40 text-gray-400 border border-white/10 px-2 py-0.5 rounded-lg">
                Build v0.3.0
              </span>
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">
              Revival Launcher v0.3.0 Milestone Release
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              Combining all v0.2.x updates into the definitive v0.3.0 Pre-Release build.
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
          
          {/* Highlight Section: PLUS+ Perk Lock Enforcement */}
          <div className="p-4 bg-[#1a170d] border border-amber-500/30 rounded-2xl space-y-2 shadow-inner">
            <h3 className="font-extrabold text-sm text-amber-400 flex items-center gap-2">
              <Lock size={16} className="text-amber-400" />
              Strict Revival PLUS+ & PRO Perk Locks (v0.3.0 Exclusive)
            </h3>
            <p className="text-xs text-amber-300/90 leading-relaxed font-medium">
              Custom profile banners (URLs and GIF backgrounds) and custom image PFP uploads are now strictly locked behind active Revival PLUS+ and PRO subscription tiers. Unsubscribed accounts display lock state overlays and require owner <code className="bg-amber-500/20 px-1 py-0.2 rounded font-mono">@envixyy</code> to grant tier access.
            </p>
          </div>

          {/* Core Feature Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Zap size={14} className="text-[#facc15]" /> What's New in Version 0.3.0
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Item 1 */}
              <div className="p-3.5 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                  <Sparkles size={15} className="text-[#facc15]" />
                  Suggestions Forum & Roadmap
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Community feature request board. Vote on ideas, leave comments, and track feature tags (🚀 Going to be Added, ✅ Has Been Added) updated by owner @envixyy.
                </p>
              </div>

              {/* Item 2 */}
              <div className="p-3.5 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                  <Users size={15} className="text-sky-400" />
                  Discord-Style Friends Hub
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Dedicated Friends page with real-time invite requests, quick username adding, friend search, player discovery catalog, and owner role management.
                </p>
              </div>

              {/* Item 3 */}
              <div className="p-3.5 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                  <Image size={15} className="text-emerald-400" />
                  Custom Instance Icons
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Upload custom base64 image icons for any instance. Displays seamlessly across list views, instance headers, and launch shortcuts.
                </p>
              </div>

              {/* Item 4 */}
              <div className="p-3.5 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                  <Layers size={15} className="text-purple-400" />
                  Modrinth Metadata Caching
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Calculates SHA-1 hashes of local mods, queries Modrinth in bulk, and stores official mod icons and titles locally in <code className="bg-black/50 px-1 py-0.2 rounded font-mono">modrinth_cache.json</code>.
                </p>
              </div>

              {/* Item 5 */}
              <div className="p-3.5 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                  <MessageSquare size={15} className="text-pink-400" />
                  Live Chat & Message Avatars
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Direct messaging with live localStorage sync across sessions. Displays custom profile picture avatars right next to message bubbles.
                </p>
              </div>

              {/* Item 6 */}
              <div className="p-3.5 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                  <Shield size={15} className="text-amber-400" />
                  Enlarged Profile Card Modals
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Spacious 512px wide Discord-style user profile preview cards with 176px tall header banners, 96px avatars, ESC key support, and badges grid.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Improvements list */}
          <div className="space-y-2 pt-2 border-t border-[#2c2e38]">
            <h4 className="font-extrabold text-xs text-white">Consolidated 0.2.x Fixes included in v0.3.0:</h4>
            <ul className="space-y-1.5 text-[11px] text-gray-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-[#22c55e] flex-shrink-0" />
                <span>Reorganized 3-tier sidebar navigation into Game, Social, and System tool groups.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-[#22c55e] flex-shrink-0" />
                <span>Replaced duplicate Accounts icon with Gamepad2 indicator.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-[#22c55e] flex-shrink-0" />
                <span>Added Contributor orange badge (Lucide GitMerge icon).</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-[#22c55e] flex-shrink-0" />
                <span>Password change utility & seeded owner account credentials.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0d0e12] border-t border-[#2c2e38] flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-bold">Revival Launcher — Developed by @envixyy</span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#facc15] hover:bg-yellow-300 text-black font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            Awesome, Close
          </button>
        </div>
      </div>
    </div>
  );
}
