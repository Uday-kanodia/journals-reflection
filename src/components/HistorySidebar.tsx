import React from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  MessageSquare,
  Sparkles,
  Search,
  CheckCircle2,
  FolderOpen,
  TrendingUp,
  Users,
  Layers,
  Zap,
  ShieldAlert,
  Bell,
  MapPin,
} from 'lucide-react';
import { JournalInteraction, CollaborativeVault } from '../types';

interface HistorySidebarProps {
  interactions: JournalInteraction[];
  activeInteractionId: string | null;
  onSelectInteraction: (id: string) => void;
  onNewInteraction: () => void;
  onDeleteInteraction: (id: string, e: React.MouseEvent) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: 'journal' | 'analytics' | 'digests' | 'admin';
  onChangeTab: (tab: 'journal' | 'analytics' | 'digests' | 'admin') => void;
  activeVault: CollaborativeVault | null;
  onOpenVaultModal: () => void;
  onExitVault: () => void;
  onOpenNotifications: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  interactions,
  activeInteractionId,
  onSelectInteraction,
  onNewInteraction,
  onDeleteInteraction,
  searchQuery,
  onSearchChange,
  activeTab,
  onChangeTab,
  activeVault,
  onOpenVaultModal,
  onExitVault,
  onOpenNotifications,
  isAdmin = false,
}) => {
  const filtered = interactions.filter((item) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = item.title?.toLowerCase().includes(q);
    const summaryMatch = item.summary?.toLowerCase().includes(q);
    const locationMatch = item.location?.placeName?.toLowerCase().includes(q);
    const messageMatch = item.messages?.some((m) =>
      m.content.toLowerCase().includes(q)
    );
    return titleMatch || summaryMatch || locationMatch || messageMatch;
  });

  return (
    <aside
      id="history-sidebar"
      className="w-full md:w-80 lg:w-88 flex-shrink-0 bg-white/30 border-r border-[#e0e0d8] flex flex-col h-full overflow-hidden"
    >
      {/* Top Workspace Tab Selector */}
      <div className="p-4 border-b border-[#e0e0d8] bg-white/50 space-y-3">
        <div className="grid grid-cols-3 gap-1 bg-[#f0f0ea] p-1 rounded-2xl border border-[#d8d8ce]">
          <button
            id="tab-btn-journal"
            type="button"
            onClick={() => onChangeTab('journal')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'journal'
                ? 'bg-white text-[#2e2e26] shadow-xs'
                : 'text-[#727262] hover:text-[#2e2e26]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Journal</span>
          </button>

          <button
            id="tab-btn-analytics"
            type="button"
            onClick={() => onChangeTab('analytics')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white text-[#2e2e26] shadow-xs'
                : 'text-[#727262] hover:text-[#2e2e26]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>

          <button
            id="tab-btn-digests"
            type="button"
            onClick={() => onChangeTab('digests')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'digests'
                ? 'bg-white text-[#2e2e26] shadow-xs'
                : 'text-[#727262] hover:text-[#2e2e26]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digests</span>
          </button>
        </div>

        {/* Quick Tools: Notifications & Admin Console */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            id="open-notifications-btn"
            type="button"
            onClick={onOpenNotifications}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-white border border-[#e0e0d8] hover:border-[#5A5A40] text-[11px] font-semibold text-[#5A5A40] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            title="Configure Slack, Discord, and Webhook Notifications"
          >
            <Bell className="w-3 h-3" />
            <span>Webhooks</span>
          </button>

          <button
            id="admin-console-tab-btn"
            type="button"
            onClick={() => onChangeTab('admin')}
            className={`flex-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
              activeTab === 'admin'
                ? 'bg-stone-900 text-amber-400 border-stone-800'
                : 'bg-white border-[#e0e0d8] hover:border-amber-600 text-stone-700'
            }`}
            title="Open Admin RBAC & Security Console"
          >
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            <span>Admin</span>
          </button>
        </div>

        {/* Collaborative Vault Banner / Switcher */}
        {activeVault ? (
          <div className="p-3 rounded-2xl bg-[#5A5A40]/10 border border-[#5A5A40]/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#5A5A40]">
                <Users className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{activeVault.title}</span>
              </div>
              <button
                onClick={onExitVault}
                className="text-[10px] text-[#8a8a7a] hover:text-rose-600 font-bold cursor-pointer"
                title="Return to personal reflections"
              >
                Exit
              </button>
            </div>
            <p className="text-[10px] text-[#727262]">
              Shared vault with {Object.keys(activeVault.members || {}).length} collaborators.
            </p>
          </div>
        ) : (
          <button
            id="open-vaults-btn"
            onClick={onOpenVaultModal}
            className="w-full py-2 px-3 rounded-2xl bg-[#f7f7f3] border border-[#e0e0d8] hover:border-[#5A5A40] text-xs font-bold text-[#5A5A40] flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Collaborative Vaults</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg bg-[#5A5A40]/10">
              Shared
            </span>
          </button>
        )}
      </div>

      {/* Header & New Entry Button */}
      <div className="p-4 border-b border-[#e0e0d8] space-y-3 bg-white/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8a8a7a]">
              {activeVault ? 'Vault Retrospectives' : 'Past Reflections'}
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/15">
              {interactions.length}
            </span>
          </div>

          <button
            id="new-journal-entry-btn"
            onClick={() => {
              onChangeTab('journal');
              onNewInteraction();
            }}
            className="px-3 py-1.5 rounded-xl bg-[#5A5A40] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-xs hover:bg-[#4a4a35] transition-all cursor-pointer active:scale-95"
            title="Start a new reflection"
          >
            <Plus className="w-3 h-3" />
            <span>New Entry</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8a8a7a] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="history-search-input"
            type="text"
            placeholder="Search reflections or locations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white/70 border border-[#d8d8ce] rounded-xl text-[#4a4a40] placeholder-[#8a8a7a] focus:outline-none focus:border-[#5A5A40] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* List of Interactions */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <FolderOpen className="w-8 h-8 text-[#a3a393] mx-auto" />
            <p className="text-xs font-semibold text-[#5A5A40]">
              {searchQuery ? 'No matching reflections' : 'No reflections recorded yet'}
            </p>
            <p className="text-[11px] text-[#8a8a7a]">
              {searchQuery
                ? 'Try searching a different keyword'
                : 'Click "New Entry" above or write your first reflection.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isActive = item.id === activeInteractionId && activeTab === 'journal';
            const messageCount = item.messages?.length || 0;
            const dateStr = item.updatedAt
              ? new Date(item.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recent';

            return (
              <div
                key={item.id}
                id={`journal-history-item-${item.id}`}
                onClick={() => {
                  onChangeTab('journal');
                  onSelectInteraction(item.id);
                }}
                className={`group relative p-4 rounded-3xl transition-all cursor-pointer border ${
                  isActive
                    ? 'sidebar-item-active shadow-md border-transparent'
                    : 'bg-white/50 border-[#e0e0d8] hover:bg-white hover:border-[#d8d8ce] text-[#5A5A40]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={`text-xs font-semibold line-clamp-1 ${
                      isActive ? 'text-white' : 'text-[#4a4a40]'
                    }`}
                  >
                    {item.title || 'Untitled Reflection'}
                  </h4>

                  <button
                    id={`delete-interaction-btn-${item.id}`}
                    onClick={(e) => onDeleteInteraction(item.id, e)}
                    className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity ${
                      isActive
                        ? 'hover:text-rose-200 text-white/70'
                        : 'hover:text-rose-600 text-[#8a8a7a]'
                    }`}
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {item.location && (
                  <div
                    className={`flex items-center gap-1 text-[10px] mt-1 font-medium ${
                      isActive ? 'text-white/90' : 'text-olive-700'
                    }`}
                  >
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{item.location.placeName}</span>
                  </div>
                )}

                {item.summary && (
                  <p
                    className={`text-[11px] line-clamp-2 mt-1 leading-relaxed ${
                      isActive ? 'text-white/80' : 'text-[#727262]'
                    }`}
                  >
                    {item.summary}
                  </p>
                )}

                <div
                  className={`flex items-center justify-between mt-2 pt-2 border-t text-[10px] ${
                    isActive
                      ? 'border-white/20 text-white/70'
                      : 'border-[#e0e0d8] text-[#8a8a7a]'
                  }`}
                >
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3 opacity-75" />
                    {dateStr}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.energyScore && (
                      <span className="flex items-center gap-0.5 font-bold text-[#8c7438]">
                        <Zap className="w-2.5 h-2.5" /> {item.energyScore}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-medium">
                      <MessageSquare className="w-3 h-3 opacity-75" />
                      {messageCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

