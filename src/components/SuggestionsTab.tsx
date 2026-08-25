import { useState, useEffect } from 'react';
import {
  MessageSquare, ThumbsUp, Plus, Crown, Trash2, Check, Filter, X, Send, Sparkles, AlertCircle,
  Map, Zap, Rocket, Clock, CheckCircle2
} from 'lucide-react';
import {
  Suggestion, SuggestionStatus, STATUS_CONFIG,
  getSuggestions, createSuggestion, toggleUpvote,
  updateSuggestionStatusByOwner, deleteSuggestionByOwner, addSuggestionComment,
  RoadmapPost, RoadmapPhase, PHASE_CONFIG,
  getRoadmap, addRoadmapPost, deleteRoadmapPost
} from '../utils/suggestions';
import { UserAvatar } from './UserAvatar';
import { BadgePill } from './BadgePill';
import { getBadgesForUser, getRoleTag } from '../utils/badges';
import { getSubscription } from '../utils/subscription';
import { UserProfileModal } from './UserProfileModal';

interface SuggestionsTabProps {
  user: { username: string; displayName: string; avatar: string };
  onStartChat?: (friend: { username: string; displayName: string; avatar: string; addedAt: number }) => void;
}

export function SuggestionsTab({ user, onStartChat }: SuggestionsTabProps) {
  const [mainTab, setMainTab] = useState<'suggestions' | 'roadmap'>('suggestions');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filterStatus, setFilterStatus] = useState<SuggestionStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Roadmap state
  const [roadmap, setRoadmap] = useState<RoadmapPost[]>([]);
  const [showRoadmapForm, setShowRoadmapForm] = useState(false);
  const [roadmapPhase, setRoadmapPhase] = useState<RoadmapPhase>('now');
  const [roadmapTitle, setRoadmapTitle] = useState('');
  const [roadmapBody, setRoadmapBody] = useState('');
  const [roadmapTag, setRoadmapTag] = useState('');
  const [roadmapFeedback, setRoadmapFeedback] = useState('');

  // New Suggestion Form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<Suggestion['category']>('Feature');

  // Comment Thread Modal
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [commentText, setCommentText] = useState('');

  // Owner Tag Edit Modal
  const [statusEditSug, setStatusEditSug] = useState<Suggestion | null>(null);
  const [newStatus, setNewStatus] = useState<SuggestionStatus>('planned');
  const [statusNoteText, setStatusNoteText] = useState('');

  // View Profile Modal
  const [profileUser, setProfileUser] = useState<{ username: string; displayName: string; avatar: string } | null>(null);

  const isOwner = user.username.toLowerCase() === 'envixyy';

  const refreshList = () => {
    setSuggestions(getSuggestions());
    setRoadmap(getRoadmap());
  };

  useEffect(() => {
    refreshList();
    const interval = setInterval(refreshList, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    createSuggestion(user, newTitle, newDesc, newCategory);
    setNewTitle('');
    setNewDesc('');
    setShowCreateModal(false);
    refreshList();
  };

  const handleToggleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleUpvote(id, user.username);
    setSuggestions(updated);
    if (activeSuggestion && activeSuggestion.id === id) {
      setActiveSuggestion(updated.find(s => s.id === id) || null);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSuggestion || !commentText.trim()) return;

    const updated = addSuggestionComment(activeSuggestion.id, user, commentText);
    setSuggestions(updated);
    setActiveSuggestion(updated.find(s => s.id === activeSuggestion.id) || null);
    setCommentText('');
  };

  const handleOpenStatusEdit = (sug: Suggestion, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    setStatusEditSug(sug);
    setNewStatus(sug.status);
    setStatusNoteText(sug.statusNote || '');
  };

  const handleSaveStatusByOwner = () => {
    if (!statusEditSug || !isOwner) return;
    const updated = updateSuggestionStatusByOwner(user.username, statusEditSug.id, newStatus, statusNoteText);
    setSuggestions(updated);
    if (activeSuggestion && activeSuggestion.id === statusEditSug.id) {
      setActiveSuggestion(updated.find(s => s.id === statusEditSug.id) || null);
    }
    setStatusEditSug(null);
  };

  const handleDeleteByOwner = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    if (!confirm('Are you sure you want to delete this suggestion post?')) return;
    const updated = deleteSuggestionByOwner(user.username, id);
    setSuggestions(updated);
    if (activeSuggestion && activeSuggestion.id === id) {
      setActiveSuggestion(null);
    }
  };

  const handleAddRoadmapPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmapTitle.trim() || !roadmapBody.trim()) return;
    const updated = addRoadmapPost(user.username, roadmapPhase, roadmapTitle, roadmapBody, roadmapTag);
    if (updated) {
      setRoadmap(updated);
      setRoadmapTitle(''); setRoadmapBody(''); setRoadmapTag('');
      setShowRoadmapForm(false);
      setRoadmapFeedback('✓ Roadmap post published!');
      setTimeout(() => setRoadmapFeedback(''), 2500);
    }
  };

  const handleDeleteRoadmapPost = (id: string) => {
    if (!confirm('Delete this roadmap entry?')) return;
    const updated = deleteRoadmapPost(user.username, id);
    if (updated) setRoadmap(updated);
  };

  const filtered = suggestions.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    return true;
  });

  const phaseIcons: Record<RoadmapPhase, React.ReactNode> = {
    now:   <Zap size={14} className="text-[#facc15]" />,
    next:  <Rocket size={14} className="text-blue-400" />,
    later: <Clock size={14} className="text-purple-400" />,
    done:  <CheckCircle2 size={14} className="text-green-400" />,
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none animate-fade-in max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#2c2e38]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles size={24} className="text-[#facc15]" />
              Suggestions &amp; Feature Roadmap
            </h1>
            <span className="text-[10px] font-black uppercase bg-[#facc15]/10 text-[#facc15] border border-[#facc15]/30 px-2 py-0.5 rounded-lg">
              Community Hub
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Submit ideas, vote on upcoming updates, and follow the official Revival roadmap.
          </p>
        </div>

        {mainTab === 'suggestions' ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-yellow-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={16} /> Submit Suggestion
          </button>
        ) : isOwner ? (
          <button
            onClick={() => setShowRoadmapForm(v => !v)}
            className={`px-4 py-2.5 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95 ${showRoadmapForm ? 'bg-[#2c2e38] text-white' : 'bg-[#facc15] hover:bg-yellow-300 text-black shadow-yellow-500/20'}`}
          >
            {showRoadmapForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Entry</>}
          </button>
        ) : null}
      </div>

      {/* Main Tab Switcher */}
      <div className="flex gap-1 py-3 border-b border-[#1e2028]">
        {(['suggestions', 'roadmap'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              mainTab === tab
                ? 'bg-[#facc15] text-black shadow-md shadow-yellow-500/15'
                : 'text-gray-400 hover:text-white hover:bg-[#1c1d24]'
            }`}
          >
            {tab === 'suggestions' ? <MessageSquare size={13} /> : <Map size={13} />}
            {tab === 'suggestions' ? 'Suggestions' : 'Roadmap'}
            {tab === 'suggestions' && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${mainTab === tab ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-400'}`}>
                {suggestions.length}
              </span>
            )}
            {tab === 'roadmap' && isOwner && (
              <span className="text-[8px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-full">OWNER</span>
            )}
          </button>
        ))}
      </div>

      {/* Filter Bar — Suggestions only */}
      {mainTab === 'suggestions' && (
        <div className="py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterStatus === 'all'
                  ? 'bg-[#facc15] text-black shadow-md shadow-yellow-500/10'
                  : 'bg-[#181920] text-gray-400 hover:text-white border border-[#2c2e38]'
              }`}
            >
              All Ideas ({suggestions.length})
            </button>

            {(['planned', 'added', 'review', 'declined'] as SuggestionStatus[]).map(st => {
              const cfg = STATUS_CONFIG[st];
              const count = suggestions.filter(s => s.status === st).length;
              const isActive = filterStatus === st;
              return (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border ${
                    isActive
                      ? 'bg-[#262833] text-white border-[#facc15]'
                      : 'bg-[#14151b] text-gray-400 hover:text-white border-[#2c2e38]'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                  <span className="text-[10px] opacity-70 bg-black/40 px-1.5 py-0.2 rounded">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <Filter size={13} />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-[#15161c] border border-[#2c2e38] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#facc15]"
            >
              <option value="all">All Categories</option>
              <option value="Feature">Features</option>
              <option value="Modpack">Modpacks</option>
              <option value="UI/UX">UI / UX</option>
              <option value="Bug">Bugs</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      )}

      {/* Suggestion Posts List */}
      {mainTab === 'suggestions' && (
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-[#14151b]/40 rounded-3xl border border-dashed border-[#2c2e38] p-8 space-y-2">
              <MessageSquare size={32} className="mx-auto text-gray-600" />
              <p className="text-sm text-gray-400 font-bold">No suggestions found in this category.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-xs text-[#facc15] font-black hover:underline"
              >
                + Create the first suggestion
              </button>
            </div>
          ) : (
            filtered.map(sug => {
            const cfg = STATUS_CONFIG[sug.status];
            const hasUpvoted = sug.upvotes.includes(user.username);
            const authorBadges = getBadgesForUser(sug.author);
            const authorRoleTag = getRoleTag(sug.author);
            const authorSub = getSubscription(sug.author);

            return (
              <div
                key={sug.id}
                onClick={() => setActiveSuggestion(sug)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-md hover:shadow-lg flex items-start gap-4 ${cfg.bgClass} ${cfg.borderClass} hover:border-[#facc15]/40 group`}
              >
                {/* Upvote Button */}
                <button
                  type="button"
                  onClick={e => handleToggleUpvote(sug.id, e)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all flex-shrink-0 min-w-[54px] ${
                    hasUpvoted
                      ? 'bg-[#facc15] text-black border-[#facc15] font-black shadow-lg shadow-yellow-500/20'
                      : 'bg-[#1b1c24] text-gray-400 border-[#2c2e38] hover:border-[#facc15]/50 hover:text-white'
                  }`}
                  title={hasUpvoted ? 'Remove upvote' : 'Upvote idea'}
                >
                  <ThumbsUp size={16} className={hasUpvoted ? 'fill-current' : ''} />
                  <span className="text-xs font-black mt-1">{sug.upvotes.length}</span>
                </button>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Category tag */}
                      <span className="text-[10px] font-black uppercase bg-[#20222b] text-gray-300 border border-[#2c2e38] px-2 py-0.5 rounded-lg">
                        {sug.category}
                      </span>

                      {/* Status Tag */}
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border flex items-center gap-1 ${cfg.badgeClass}`}>
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </span>
                    </div>

                    {/* Owner management buttons */}
                    {isOwner && (
                      <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={e => handleOpenStatusEdit(sug, e)}
                          className="px-2 py-1 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                          title="👑 Owner: Set Status Tag (Going to be added / Added)"
                        >
                          <Crown size={11} /> Set Status
                        </button>
                        <button
                          onClick={e => handleDeleteByOwner(sug.id, e)}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-black text-white group-hover:text-[#facc15] transition-colors leading-snug">
                    {sug.title}
                  </h3>
                  <p className="text-xs text-gray-300 font-medium leading-relaxed mt-1 line-clamp-2">
                    {sug.description}
                  </p>

                  {/* Status Note banner if provided by Owner */}
                  {sug.statusNote && (
                    <div className="mt-2 p-2 bg-[#201d12] border border-amber-500/30 rounded-xl text-xs font-medium text-amber-300 flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-amber-400 flex-shrink-0" />
                      <span><strong>Status Note:</strong> {sug.statusNote}</span>
                    </div>
                  )}

                  {/* Author & Footer metadata */}
                  <div className="flex items-center justify-between border-t border-[#2c2e38]/50 pt-2.5 mt-3 text-xs">
                    <div
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      onClick={e => { e.stopPropagation(); setProfileUser({ username: sug.author, displayName: sug.displayName, avatar: sug.avatar }); }}
                    >
                      <UserAvatar
                        avatarKeyOrUrl={authorSub.customAvatarUrl || sug.avatar}
                        name={sug.displayName}
                        size="sm"
                        isSubscribed={authorSub.active}
                      />
                      <div className="flex items-center gap-1">
                        {authorRoleTag && (
                          <span className={`text-[9px] font-black uppercase ${authorRoleTag.colorClass}`}>
                            {authorRoleTag.tag}
                          </span>
                        )}
                        <span className="font-extrabold text-white text-xs">{sug.displayName}</span>
                        {authorBadges[0] && (
                          <BadgePill badge={authorBadges[0]} size="sm" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-400 text-xs font-semibold">
                      <span className="flex items-center gap-1 hover:text-white">
                        <MessageSquare size={13} /> {sug.comments.length} comments
                      </span>
                      <span>· {new Date(sug.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      )}
      {/* ── ROADMAP TAB ─────────────────────────────────────────── */}
      {mainTab === 'roadmap' && (
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1 pt-3">

          {/* Owner Post Form */}
          {isOwner && showRoadmapForm && (
            <form onSubmit={handleAddRoadmapPost} className="bg-[#15161c] border border-amber-400/40 rounded-2xl p-5 space-y-3 animate-scale-up shadow-xl">
              <div className="flex items-center gap-2 pb-1 border-b border-[#2c2e38]">
                <Crown size={15} className="text-amber-400" />
                <span className="text-sm font-black text-white">Post Roadmap Entry</span>
                <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 ml-auto">OWNER ONLY</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {((['now', 'next', 'later', 'done'] as RoadmapPhase[])).map(phase => {
                  const cfg = PHASE_CONFIG[phase];
                  return (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => setRoadmapPhase(phase)}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-black border transition-all ${
                        roadmapPhase === phase
                          ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                          : 'bg-[#0d0e12] border-[#2c2e38] text-gray-500 hover:border-[#3c3e4a]'
                      }`}
                    >
                      <span>{cfg.icon}</span> {cfg.label}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={roadmapTitle}
                onChange={e => setRoadmapTitle(e.target.value)}
                placeholder="Entry title..."
                className="w-full bg-[#0d0e12] border border-[#2c2e38] focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-white outline-none font-semibold"
              />
              <textarea
                value={roadmapBody}
                onChange={e => setRoadmapBody(e.target.value)}
                placeholder="Description / details..."
                rows={2}
                className="w-full bg-[#0d0e12] border border-[#2c2e38] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-medium resize-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roadmapTag}
                  onChange={e => setRoadmapTag(e.target.value)}
                  placeholder="Tag (e.g. v0.3.1, PLUS+)"
                  className="flex-1 bg-[#0d0e12] border border-[#2c2e38] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-yellow-500/15 active:scale-95"
                >
                  <Check size={13} /> Publish
                </button>
              </div>
              {roadmapFeedback && (
                <p className="text-xs text-green-400 font-bold animate-fade-in">{roadmapFeedback}</p>
              )}
            </form>
          )}

          {/* Roadmap Timeline — grouped by phase */}
          {(['now', 'next', 'later', 'done'] as RoadmapPhase[]).map(phase => {
            const posts = roadmap.filter(p => p.phase === phase);
            const cfg = PHASE_CONFIG[phase];
            return (
              <div key={phase}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                    {phaseIcons[phase]}
                    <span className={`text-xs font-black uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-[9px] font-black text-gray-500 bg-black/30 px-1.5 py-0.2 rounded-full">{posts.length}</span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#2c2e38] to-transparent" />
                </div>

                {posts.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-600 font-medium italic">Nothing here yet.</div>
                ) : (
                  <div className="space-y-2.5 mb-4">
                    {posts.map((post, idx) => (
                      <div
                        key={post.id}
                        className={`rounded-2xl border p-4 flex items-start gap-3 animate-fade-in transition-all hover:shadow-md ${cfg.bg} ${cfg.border}`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${cfg.border} bg-black/30 mt-0.5`}>
                          {phaseIcons[phase]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-black text-sm text-white">{post.title}</h4>
                            {post.tag && (
                              <span className="text-[9px] font-black bg-black/40 border border-[#2c2e38] text-gray-300 px-1.5 py-0.5 rounded-full">
                                {post.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-medium leading-relaxed">{post.body}</p>
                          <p className="text-[9px] text-gray-600 mt-1.5 font-medium">
                            Posted by <span className="text-amber-400 font-black">@envixyy</span> · {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => handleDeleteRoadmapPost(post.id)}
                            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all active:scale-90"
                            title="Delete entry"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {!isOwner && (
            <div className="text-center py-3 text-[10px] text-gray-600 font-medium flex items-center justify-center gap-1.5 border-t border-[#1e2028] mt-2">
              <Crown size={11} className="text-amber-500/60" />
              Roadmap managed by <span className="text-amber-400 font-black ml-1">@envixyy</span>
            </div>
          )}
        </div>
      )}

      {/* CREATE SUGGESTION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#15161c] border border-[#2c2e38] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2c2e38] pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[#facc15]" />
                Submit New Feature Suggestion
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Add Shader Support / Custom Keybindings..."
                  className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#facc15] font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#facc15]"
                >
                  <option value="Feature">Feature Request</option>
                  <option value="Modpack">Modpack / Mods Integration</option>
                  <option value="UI/UX">UI / UX Customization</option>
                  <option value="Bug">Bug Report</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Description & Details</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Explain why this feature would be awesome and how it should work..."
                  rows={4}
                  className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl p-3.5 text-xs text-white outline-none focus:border-[#facc15] font-medium resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#facc15] hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus size={15} /> Publish Suggestion
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 bg-[#20222a] border border-[#2c2e38] text-gray-300 hover:text-white font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUGGESTION THREAD / COMMENT MODAL */}
      {activeSuggestion && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#15161c] border border-[#2c2e38] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-[#2c2e38] flex items-start justify-between gap-3 bg-[#0f1015]">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase bg-[#20222b] text-gray-300 border border-[#2c2e38] px-2 py-0.5 rounded-lg">
                    {activeSuggestion.category}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border flex items-center gap-1 ${STATUS_CONFIG[activeSuggestion.status].badgeClass}`}>
                    <span>{STATUS_CONFIG[activeSuggestion.status].icon}</span>
                    <span>{STATUS_CONFIG[activeSuggestion.status].label}</span>
                  </span>
                </div>
                <h2 className="text-lg font-black text-white leading-snug">{activeSuggestion.title}</h2>
              </div>

              <button onClick={() => setActiveSuggestion(null)} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              <div className="p-4 bg-[#0d0e12] border border-[#2c2e38] rounded-2xl space-y-3">
                <p className="text-xs text-gray-200 leading-relaxed font-medium whitespace-pre-wrap">
                  {activeSuggestion.description}
                </p>

                {activeSuggestion.statusNote && (
                  <div className="p-3 bg-[#201d12] border border-amber-500/30 rounded-xl text-xs font-medium text-amber-300 flex items-center gap-2">
                    <Crown size={15} className="text-amber-400 flex-shrink-0" />
                    <span><strong>Owner Update:</strong> {activeSuggestion.statusNote}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-[#2c2e38]/50">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                    onClick={() => setProfileUser({ username: activeSuggestion.author, displayName: activeSuggestion.displayName, avatar: activeSuggestion.avatar })}
                  >
                    <UserAvatar avatarKeyOrUrl={activeSuggestion.avatar} name={activeSuggestion.displayName} size="sm" />
                    <span className="font-extrabold text-white">@{activeSuggestion.author}</span>
                  </div>

                  <button
                    onClick={e => handleToggleUpvote(activeSuggestion.id, e)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${
                      activeSuggestion.upvotes.includes(user.username)
                        ? 'bg-[#facc15] text-black border-[#facc15]'
                        : 'bg-[#1c1d25] text-gray-300 border-[#2c2e38]'
                    }`}
                  >
                    <ThumbsUp size={13} />
                    <span>{activeSuggestion.upvotes.length} Upvotes</span>
                  </button>
                </div>
              </div>

              {/* Comments Header */}
              <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                Discussion Thread ({activeSuggestion.comments.length})
              </h4>

              {/* Comments list */}
              <div className="space-y-2">
                {activeSuggestion.comments.length === 0 ? (
                  <p className="text-xs text-gray-500 italic p-3 text-center">No comments yet. Start the conversation!</p>
                ) : (
                  activeSuggestion.comments.map(c => (
                    <div key={c.id} className="p-3 rounded-2xl bg-[#0e0f14] border border-[#2c2e38] space-y-1">
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                          onClick={() => setProfileUser({ username: c.author, displayName: c.displayName, avatar: c.avatar })}
                        >
                          <UserAvatar avatarKeyOrUrl={c.avatar} name={c.displayName} size="sm" />
                          <span className="font-extrabold text-xs text-white">{c.displayName}</span>
                          {c.isOwner && (
                            <span className="text-[8px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded">
                              OWNER
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-500">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-gray-300 font-medium pl-8">{c.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Comment Form Input */}
            <form onSubmit={handleAddComment} className="p-4 bg-[#0c0d11] border-t border-[#2c2e38] flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Write a response or feedback..."
                className="flex-1 bg-[#181920] border border-[#2c2e38] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#facc15]"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-[#facc15] text-black font-extrabold text-xs rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-40 flex items-center gap-1"
              >
                <Send size={13} /> Comment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OWNER STATUS EDIT MODAL */}
      {isOwner && statusEditSug && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#15161c] border border-amber-400/40 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2c2e38] pb-3">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-amber-400" />
                <h3 className="text-sm font-black text-white">Owner Status Tag Manager</h3>
              </div>
              <button onClick={() => setStatusEditSug(null)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black uppercase text-gray-400">Select Status Tag:</label>
              <div className="grid grid-cols-2 gap-2">
                {(['planned', 'added', 'review', 'declined'] as SuggestionStatus[]).map(st => {
                  const cfg = STATUS_CONFIG[st];
                  const isSelected = newStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`p-3 rounded-xl border text-xs font-black flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-[#262835] border-amber-400 text-white shadow-md'
                          : 'bg-[#0d0e12] border-[#2c2e38] text-gray-500 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <span>{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Status Note (Optional):</label>
                <input
                  type="text"
                  value={statusNoteText}
                  onChange={e => setStatusNoteText(e.target.value)}
                  placeholder="e.g. Planned for v0.3.0 / Live now!"
                  className="w-full bg-[#0d0e12] border border-[#2c2e38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleSaveStatusByOwner}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-xs rounded-xl shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-1"
              >
                <Check size={14} /> Update Feature Status Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Card Modal */}
      {profileUser && (
        <UserProfileModal
          username={profileUser.username}
          displayName={profileUser.displayName}
          avatar={profileUser.avatar}
          onClose={() => setProfileUser(null)}
          onStartChat={onStartChat ? () => {
            onStartChat({
              username: profileUser.username,
              displayName: profileUser.displayName,
              avatar: profileUser.avatar,
              addedAt: Date.now(),
            });
            setProfileUser(null);
          } : undefined}
        />
      )}
    </div>
  );
}
