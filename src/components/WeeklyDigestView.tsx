import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Layers,
  Lightbulb,
  Target,
  HeartHandshake,
  CheckCircle2,
  Share2,
  Clock,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { JournalInteraction, WeeklyDigest } from '../types';
import { saveWeeklyDigest } from '../firebase';

interface WeeklyDigestViewProps {
  userId: string;
  interactions: JournalInteraction[];
  digests: WeeklyDigest[];
}

export const WeeklyDigestView: React.FC<WeeklyDigestViewProps> = ({
  userId,
  interactions,
  digests,
}) => {
  const [selectedDigest, setSelectedDigest] = useState<WeeklyDigest | null>(
    digests.length > 0 ? digests[0] : null
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute past 7 days range
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentWeekInteractions = interactions.filter((item) => {
    const itemDate = new Date(item.createdAt || item.updatedAt);
    return itemDate >= weekStart;
  });

  const handleGenerateWeeklyDigest = async () => {
    if (recentWeekInteractions.length === 0 && interactions.length === 0) {
      setErrorMsg('Please record at least 1 reflection before generating a weekly synthesis.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    const targetEntries = recentWeekInteractions.length > 0 ? recentWeekInteractions : interactions.slice(0, 10);
    const startDateStr = weekStart.toISOString().slice(0, 10);
    const endDateStr = now.toISOString().slice(0, 10);

    try {
      const response = await fetch('/api/gemini/weekly-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: targetEntries,
          weekStartDate: startDateStr,
          weekEndDate: endDateStr,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to synthesize weekly reflections.');
      }

      const result = await response.json();
      const digestId = 'digest_' + Date.now();

      const newDigest: WeeklyDigest = {
        id: digestId,
        userId,
        weekStartDate: startDateStr,
        weekEndDate: endDateStr,
        title: result.title || 'Weekly Executive Synthesis',
        synthesis: result.synthesis || 'A week of mindful progress and introspection.',
        coreThemes: result.coreThemes || ['Strategic Focus', 'Emotional Resilience'],
        keyTakeaways: result.keyTakeaways || ['Unbroken focus blocks yield higher creative outputs.'],
        growthActions: result.growthActions || ['Set 1 daily top priority before morning triage.'],
        emotionalOverview: result.emotionalOverview || 'Consistent calm with heightened focus.',
        entryCount: targetEntries.length,
        createdAt: new Date().toISOString(),
      };

      await saveWeeklyDigest(userId, newDigest);
      setSelectedDigest(newDigest);
    } catch (err: any) {
      console.error('Error generating weekly digest:', err);
      setErrorMsg(err?.message || 'Failed to generate weekly digest.');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeDigest = selectedDigest || (digests.length > 0 ? digests[0] : null);

  return (
    <div id="weekly-digest-view" className="flex-1 h-full overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#f5f5f0] text-[#4a4a40]">
      {/* Header & Generation Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e0e0d8] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#5A5A40]/10 text-[#5A5A40]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2e2e26]">
              Weekly Synthesis Digests
            </h1>
          </div>
          <p className="text-xs text-[#8a8a7a] mt-1">
            Automated intelligence distilling core breakthroughs, emotional patterns, and growth intentions.
          </p>
        </div>

        <button
          id="generate-weekly-digest-btn"
          onClick={handleGenerateWeeklyDigest}
          disabled={isGenerating}
          className="px-5 py-2.5 rounded-2xl bg-[#5A5A40] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#4a4a35] transition-all cursor-pointer shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Synthesizing Corpus...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate This Week's Synthesis ({recentWeekInteractions.length} new)</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Main Content: Past Digests Selector + Active Digest Editorial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Digests Archive List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8a8a7a]">
            <span>Synthesis Archive</span>
            <span>{digests.length} Digests</span>
          </div>

          {digests.length === 0 ? (
            <div className="bg-white p-6 rounded-3xl border border-[#e0e0d8] text-center space-y-3">
              <Calendar className="w-8 h-8 text-[#a0a090] mx-auto" />
              <p className="text-xs font-bold text-[#2e2e26]">No Weekly Digests Yet</p>
              <p className="text-[11px] text-[#8a8a7a]">
                Click "Generate This Week's Synthesis" to analyze your recent reflections with Gemini AI.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {digests.map((digest) => {
                const isSelected = activeDigest?.id === digest.id;
                return (
                  <button
                    key={digest.id}
                    id={`digest-item-${digest.id}`}
                    onClick={() => setSelectedDigest(digest)}
                    className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm'
                        : 'bg-white hover:bg-[#fbfbf9] border-[#e0e0d8] text-[#4a4a40]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-80 mb-1">
                      <span>
                        {digest.weekStartDate} → {digest.weekEndDate}
                      </span>
                      <span>{digest.entryCount} entries</span>
                    </div>
                    <h3 className="text-xs font-bold line-clamp-1">{digest.title}</h3>
                    <p
                      className={`text-[11px] mt-1 line-clamp-2 ${
                        isSelected ? 'text-white/80' : 'text-[#8a8a7a]'
                      }`}
                    >
                      {digest.emotionalOverview || digest.synthesis.slice(0, 100)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Digest Editorial Showcase */}
        <div className="lg:col-span-2 space-y-6">
          {activeDigest ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e0e0d8] shadow-xs space-y-6">
              {/* Digest Banner */}
              <div className="border-b border-[#f0f0ea] pb-5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#8a8a7a]">
                  <Calendar className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>
                    Week of {activeDigest.weekStartDate} to {activeDigest.weekEndDate}
                  </span>
                  <span>•</span>
                  <span>{activeDigest.entryCount} journal reflections analyzed</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2e2e26]">
                  {activeDigest.title}
                </h2>
                {activeDigest.emotionalOverview && (
                  <p className="text-xs text-[#5A5A40] italic font-serif">
                    "{activeDigest.emotionalOverview}"
                  </p>
                )}
              </div>

              {/* Core Themes Chips */}
              {activeDigest.coreThemes && activeDigest.coreThemes.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#8a8a7a] mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#8c7438]" /> Core Recurring Themes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeDigest.coreThemes.map((theme, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-[#f7f7f3] border border-[#e0e0d8] text-xs font-bold text-[#2e2e26]"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Narrative Synthesis */}
              <div className="space-y-3">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#8a8a7a]">
                  Executive Synthesis & Insights
                </h3>
                <div className="prose prose-sm max-w-none text-[#3e3e34] leading-relaxed font-serif text-sm">
                  <ReactMarkdown>{activeDigest.synthesis}</ReactMarkdown>
                </div>
              </div>

              {/* Key Takeaways & Growth Action Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#f0f0ea]">
                {/* Takeaways */}
                <div className="bg-[#fbfbf9] p-4 rounded-2xl border border-[#e8e8df] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#5A5A40]">
                    <Lightbulb className="w-4 h-4 text-[#8c7438]" />
                    <span>Key Takeaways</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#4a4a40]">
                    {(activeDigest.keyTakeaways || []).map((t, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#5A5A40] font-bold">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Growth Intentions */}
                <div className="bg-[#fbfbf9] p-4 rounded-2xl border border-[#e8e8df] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#456b3e]">
                    <Target className="w-4 h-4 text-[#456b3e]" />
                    <span>Next Week's Growth Actions</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#4a4a40]">
                    {(activeDigest.growthActions || []).map((action, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#456b3e] flex-shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-[#e0e0d8] text-center space-y-3">
              <Sparkles className="w-10 h-10 text-[#5A5A40] mx-auto animate-pulse" />
              <h3 className="font-serif text-lg font-bold text-[#2e2e26]">
                Ready for Weekly Introspection
              </h3>
              <p className="text-xs text-[#8a8a7a] max-w-md mx-auto">
                Generate your first comprehensive weekly synthesis to extract recurring patterns and actionable growth opportunities.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
