import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  RefreshCw,
  Lightbulb,
  FileText,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Tag,
  Users,
  MapPin,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { JournalInteraction, JournalMessage, ReflectionMode, JournalLocation } from '../types';
import { VoiceDictationButton } from './VoiceDictationButton';
import { LocationPickerModal } from './LocationPickerModal';

interface ReflectionCanvasProps {
  activeInteraction: JournalInteraction | null;
  onSendMessage: (prompt: string, mode: ReflectionMode, location?: JournalLocation) => Promise<void>;
  isGenerating: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveErrorMessage: string | null;
  onRetrySave?: () => void;
  isVaultContext?: boolean;
  vaultTitle?: string;
  onUpdateLocation?: (location: JournalLocation | null) => void;
}

export const ReflectionCanvas: React.FC<ReflectionCanvasProps> = ({
  activeInteraction,
  onSendMessage,
  isGenerating,
  saveStatus,
  saveErrorMessage,
  onRetrySave,
  isVaultContext = false,
  vaultTitle,
  onUpdateLocation,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>('reflect');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [stagedLocation, setStagedLocation] = useState<JournalLocation | null>(
    activeInteraction?.location || null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = activeInteraction?.messages || [];

  // Synchronize staged location with active interaction
  useEffect(() => {
    setStagedLocation(activeInteraction?.location || null);
  }, [activeInteraction?.id, activeInteraction?.location]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const currentText = prompt.trim();
    setPrompt('');
    await onSendMessage(currentText, selectedMode, stagedLocation || undefined);
  };

  const handleSelectLocation = (loc: JournalLocation) => {
    setStagedLocation(loc);
    if (onUpdateLocation) {
      onUpdateLocation(loc);
    }
  };

  const handleClearLocation = () => {
    setStagedLocation(null);
    if (onUpdateLocation) {
      onUpdateLocation(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setPrompt((prev) => (prev ? `${prev.trim()} ${text}` : text));
    textareaRef.current?.focus();
  };

  const quickPrompts = [
    {
      label: 'Reflect on my day',
      text: 'Today I encountered a situation that made me reflect on my priorities. Here is what happened:',
      mode: 'reflect' as ReflectionMode,
    },
    {
      label: 'Brainstorm creative angles',
      text: 'I am working on a challenge and want to explore fresh creative solutions. The challenge is:',
      mode: 'brainstorm' as ReflectionMode,
    },
    {
      label: 'Summarize insights',
      text: 'Please review the key themes of what I have shared so far and extract actionable takeaways.',
      mode: 'summarize' as ReflectionMode,
    },
    {
      label: 'Socratic inquiry',
      text: 'Ask me 3 deep questions to help me examine my hidden assumptions and core motivations about:',
      mode: 'deepen' as ReflectionMode,
    },
  ];

  return (
    <main
      id="reflection-canvas"
      className="flex-1 flex flex-col h-full bg-[#f5f5f0] overflow-hidden relative"
    >
      {/* Top Bar for active reflection */}
      <div className="h-16 border-b border-[#e0e0d8] px-4 sm:px-6 flex items-center justify-between bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#5A5A40]/10 border border-[#5A5A40]/20 flex items-center justify-center text-[#5A5A40]">
            {isVaultContext ? <Users className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-serif text-[#2e2e26] line-clamp-1">
                {activeInteraction?.title || (isVaultContext ? 'Collaborative Retrospective' : 'New Reflection Session')}
              </h2>
              {isVaultContext && (
                <span className="px-2 py-0.5 rounded-full bg-[#5A5A40] text-white text-[9px] font-bold uppercase tracking-wider hidden sm:inline">
                  {vaultTitle || 'Vault Space'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#8a8a7a]">
              <span>{isVaultContext ? 'Team Co-Authoring' : 'Private Isolated'}</span>
              <span>•</span>
              {saveStatus === 'saving' && (
                <span className="text-[#8c7438] flex items-center gap-1 font-medium">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[#456b3e] flex items-center gap-1 font-medium">
                  <CheckCircle className="w-2.5 h-2.5" /> Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-2.5 h-2.5" /> Save failed
                </span>
              )}
              {saveStatus === 'idle' && <span>Up to date</span>}

              {activeInteraction?.energyScore && (
                <>
                  <span>•</span>
                  <span className="text-[#8c7438] flex items-center gap-0.5 font-bold">
                    <Zap className="w-2.5 h-2.5" /> Energy: {activeInteraction.energyScore}/10
                  </span>
                </>
              )}

              {stagedLocation && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="text-olive-800 hover:text-olive-950 flex items-center gap-1 font-semibold hover:underline"
                    title="View / change pinned location"
                  >
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="truncate max-w-[140px]">{stagedLocation.placeName}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right header actions */}
        <div className="flex items-center gap-2">
          {/* Reflection Mode Badges */}
          <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[#e0e0d8] shadow-xs">
            <button
              id="mode-reflect-btn"
              type="button"
              onClick={() => setSelectedMode('reflect')}
              className={`px-3 py-1 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all cursor-pointer ${
                selectedMode === 'reflect'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-[#727262] hover:text-[#4a4a40]'
              }`}
            >
              Reflect
            </button>
            <button
              id="mode-brainstorm-btn"
              type="button"
              onClick={() => setSelectedMode('brainstorm')}
              className={`px-3 py-1 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all cursor-pointer ${
                selectedMode === 'brainstorm'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-[#727262] hover:text-[#4a4a40]'
              }`}
            >
              Brainstorm
            </button>
            <button
              id="mode-summarize-btn"
              type="button"
              onClick={() => setSelectedMode('summarize')}
              className={`px-3 py-1 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all cursor-pointer ${
                selectedMode === 'summarize'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-[#727262] hover:text-[#4a4a40]'
              }`}
            >
              Summarize
            </button>
            <button
              id="mode-deepen-btn"
              type="button"
              onClick={() => setSelectedMode('deepen')}
              className={`px-3 py-1 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all cursor-pointer ${
                selectedMode === 'deepen'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-[#727262] hover:text-[#4a4a40]'
              }`}
            >
              Socratic
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              stagedLocation
                ? 'bg-olive-800 text-white border-olive-900 shadow-xs'
                : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200 shadow-xs'
            }`}
            title="Pin location to this reflection"
          >
            <MapPin className={`w-3.5 h-3.5 ${stagedLocation ? 'text-amber-300' : 'text-olive-700'}`} />
            <span className="hidden sm:inline">
              {stagedLocation ? stagedLocation.placeName : 'Pin Location'}
            </span>
          </button>
        </div>
      </div>

      {/* Save Error Notice Banner */}
      {saveStatus === 'error' && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Persistence notice: {saveErrorMessage || 'Could not write to Cloud Firestore.'}</span>
          </div>
          {onRetrySave && (
            <button
              onClick={onRetrySave}
              className="px-2 py-0.5 rounded bg-rose-200 hover:bg-rose-300 text-rose-900 font-bold text-[11px] cursor-pointer"
            >
              Retry Save
            </button>
          )}
        </div>
      )}

      {/* Conversation / Journal Flow */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center py-12 space-y-6">
            <div className="w-14 h-14 rounded-full bg-[#5A5A40]/10 border border-[#5A5A40]/20 flex items-center justify-center text-[#5A5A40] shadow-sm">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-normal font-serif text-[#2e2e26]">
                {isVaultContext
                  ? `Co-Author in ${vaultTitle || 'Vault'}`
                  : 'What is on your mind today?'}
              </h3>
              <p className="text-[#727262] text-sm leading-relaxed">
                {isVaultContext
                  ? 'Collaborative retrospective space. Share ideas, mentor feedback, or post team reflection points.'
                  : 'Write down your thoughts, reflections, or strategic questions. Use keyboard or real-time voice dictation.'}
              </p>
            </div>

            {/* Quick Starters */}
            <div className="w-full space-y-2 pt-2">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8a8a7a]">
                Quick Starters
              </p>
              <div className="grid gap-2 text-left">
                {quickPrompts.map((starter, idx) => (
                  <button
                    key={idx}
                    id={`quick-starter-${idx}`}
                    onClick={() => {
                      setPrompt(starter.text);
                      setSelectedMode(starter.mode);
                      textareaRef.current?.focus();
                    }}
                    className="p-4 rounded-2xl bg-white/80 border border-[#e0e0d8] hover:border-[#5A5A40]/40 hover:bg-white text-left transition-all group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5A5A40] group-hover:text-[#3e3e2e]">
                        {starter.label}
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-[#8a8a7a] group-hover:text-[#5A5A40]" />
                    </div>
                    <p className="text-[11px] text-[#727262] mt-1 line-clamp-1">
                      {starter.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                id={`message-bubble-${index}`}
                className={`flex gap-3 max-w-3xl ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-serif ${
                    isUser
                      ? 'bg-white border border-[#d8d8ce] text-[#5A5A40] shadow-sm font-bold'
                      : 'bg-[#5A5A40] text-white shadow-sm font-bold italic'
                  }`}
                >
                  {isUser ? (
                    msg.authorPhoto ? (
                      <img
                        src={msg.authorPhoto}
                        alt="Author"
                        className="w-full h-full rounded-full"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4" />
                    )
                  ) : (
                    'G'
                  )}
                </div>

                {/* Message Body */}
                <div
                  className={`rounded-[28px] p-5 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-white text-[#4a4a40] border border-[#e0e0d8] rounded-tr-none shadow-sm'
                      : 'bg-[#5A5A40] text-[#f5f5f0] rounded-tl-none shadow-md'
                  }`}
                >
                  {isUser && msg.authorName && (
                    <div className="text-[10px] font-bold text-[#5A5A40] mb-1">
                      {msg.authorName}
                    </div>
                  )}

                  {isUser ? (
                    <p className="whitespace-pre-wrap font-sans text-[#3e3e36]">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none text-[#f5f5f0] prose-headings:font-serif prose-headings:text-white prose-p:text-[#f5f5f0]/95 prose-strong:text-white prose-code:text-[#f5f5f0] prose-code:bg-white/10 prose-code:px-1 prose-code:rounded prose-blockquote:border-l-white/40 prose-blockquote:italic">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  <div
                    className={`mt-2 text-[10px] flex items-center gap-2 ${
                      isUser ? 'text-[#8a8a7a] justify-end' : 'text-[#f5f5f0]/70'
                    }`}
                  >
                    <span>
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                    {!isUser && msg.modelUsed && (
                      <span className="px-1.5 py-0.5 rounded bg-white/15 text-white/90 text-[9px] font-mono">
                        {msg.modelUsed}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isGenerating && (
          <div className="flex gap-3 max-w-3xl mr-auto">
            <div className="w-8 h-8 rounded-full bg-[#5A5A40] text-white flex items-center justify-center font-serif font-bold italic text-xs shadow-sm">
              G
            </div>
            <div className="p-4 rounded-[28px] bg-[#5A5A40] text-[#f5f5f0] text-xs flex items-center gap-3 shadow-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="italic font-serif">Gemini 3.6 Flash is synthesizing insights...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="p-4 sm:p-6 border-t border-[#e0e0d8] bg-white/70 backdrop-blur-md">
        <form
          id="journal-input-form"
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto relative"
        >
          <div className="relative rounded-[28px] bg-white border border-[#d8d8ce] focus-within:border-[#5A5A40] focus-within:ring-2 focus-within:ring-[#5A5A40]/15 transition-all p-3 shadow-sm">
            {stagedLocation && (
              <div className="mb-2 px-2.5 py-1 bg-stone-100/90 border border-stone-200 rounded-xl flex items-center justify-between text-xs text-stone-800">
                <div className="flex items-center gap-1.5 font-medium truncate">
                  <MapPin className="w-3.5 h-3.5 text-olive-800 flex-shrink-0" />
                  <span className="truncate">{stagedLocation.placeName}</span>
                  {stagedLocation.formattedAddress && (
                    <span className="text-[11px] text-stone-400 truncate hidden sm:inline">
                      ({stagedLocation.formattedAddress})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="p-0.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-stone-200 transition-colors"
                  title="Remove pinned location"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              id="reflection-text-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write or dictate your reflection (Shift + Enter for new line)..."
              rows={3}
              disabled={isGenerating}
              className="w-full bg-transparent px-2 py-1 text-sm text-[#2e2e26] placeholder-[#8a8a7a] focus:outline-none resize-none disabled:opacity-50"
            />

            <div className="flex items-center justify-between pt-2 px-1 border-t border-[#f0f0ea]">
              <div className="flex items-center gap-2">
                <VoiceDictationButton
                  onTranscript={handleVoiceTranscript}
                  disabled={isGenerating}
                />

                <button
                  type="button"
                  id="pin-location-toolbar-btn"
                  onClick={() => setIsLocationModalOpen(true)}
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                    stagedLocation
                      ? 'bg-olive-800 text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                  title="Pin Geographic Location with Google Maps"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {stagedLocation ? 'Location Set' : 'Location'}
                  </span>
                </button>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#8a8a7a]">
                  <span className="text-[10px] uppercase tracking-widest font-bold">Mode:</span>
                  <span className="capitalize text-[#5A5A40] font-bold text-xs">
                    {selectedMode}
                  </span>
                </div>
              </div>

              <button
                id="send-reflection-btn"
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="px-5 py-2.5 rounded-2xl bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
              >
                {isGenerating ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>Send Reflection</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Interactive Google Maps Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleSelectLocation}
        currentLocation={stagedLocation || undefined}
      />
    </main>
  );
};
