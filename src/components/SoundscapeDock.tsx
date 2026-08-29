import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Clock,
  Music2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { soundscape, SOUNDSCAPE_PRESETS } from '../services/soundscapeService';
import { SoundscapeType } from '../types';

export const SoundscapeDock: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(soundscape.getIsPlaying());
  const [currentPreset, setCurrentPreset] = useState<SoundscapeType>(soundscape.getCurrentPreset());
  const [volume, setVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [selectedTimerOption, setSelectedTimerOption] = useState<number>(0); // 0 = continuous

  useEffect(() => {
    soundscape.setCallbacks(
      (secondsLeft) => {
        setTimerSecondsLeft(secondsLeft);
        if (secondsLeft <= 0 && selectedTimerOption > 0) {
          setSelectedTimerOption(0);
        }
      },
      (playing) => {
        setIsPlaying(playing);
      }
    );
  }, [selectedTimerOption]);

  const handleTogglePlay = () => {
    soundscape.toggle(currentPreset);
  };

  const handleSelectPreset = (presetId: SoundscapeType) => {
    setCurrentPreset(presetId);
    if (isPlaying) {
      soundscape.play(presetId);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (isMuted) setIsMuted(false);
    soundscape.setVolume(val);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      soundscape.setVolume(volume);
    } else {
      setIsMuted(true);
      soundscape.setVolume(0);
    }
  };

  const handleSetTimer = (minutes: number) => {
    setSelectedTimerOption(minutes);
    soundscape.startTimer(minutes);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activePresetInfo = SOUNDSCAPE_PRESETS.find((p) => p.id === currentPreset) || SOUNDSCAPE_PRESETS[0];

  return (
    <div
      id="soundscape-dock"
      className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md w-full px-2"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-[#d8d8ce] rounded-3xl shadow-xl p-3 sm:p-4 text-[#4a4a40] transition-all">
        {/* Main Dock Bar */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Preset Info & Play Button */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              id="soundscape-play-toggle-btn"
              onClick={handleTogglePlay}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm flex-shrink-0 active:scale-95 ${
                isPlaying
                  ? 'bg-[#5A5A40] text-white'
                  : 'bg-[#f0f0ea] hover:bg-[#e4e4dc] text-[#5A5A40]'
              }`}
              title={isPlaying ? 'Pause Ambient Soundscape' : 'Play Ambient Soundscape'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <div className="min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#2e2e26] truncate">
                  {activePresetInfo.name}
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#5A5A40]/10 text-[#5A5A40]">
                  {activePresetInfo.tag}
                </span>
              </div>
              <p className="text-[10px] text-[#8a8a7a] truncate mt-0.5">
                {isPlaying ? (
                  <span className="inline-flex items-center gap-1 text-[#456b3e] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#456b3e] animate-pulse" />
                    Procedural audio playing
                  </span>
                ) : (
                  'Click to begin deep focus soundscape'
                )}
              </p>
            </div>
          </div>

          {/* Volume Dial & Expand Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {timerSecondsLeft > 0 && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-[#5A5A40]/10 text-[#5A5A40] text-[10px] font-mono font-bold">
                <Clock className="w-3 h-3" />
                <span>{formatTimer(timerSecondsLeft)}</span>
              </div>
            )}

            <button
              id="soundscape-mute-btn"
              onClick={handleToggleMute}
              className="p-1.5 rounded-xl hover:bg-[#f0f0ea] text-[#727262] hover:text-[#2e2e26] transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-600" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <button
              id="soundscape-expand-toggle-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl bg-[#f0f0ea] hover:bg-[#e4e4dc] text-[#5A5A40] transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse' : 'Soundscape presets and focus timer'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Panel: Soundscape Presets, Volume Slider, and Focus Timers */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-[#e8e8df] space-y-3 animate-in fade-in duration-200">
            {/* Presets List */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#8a8a7a] mb-1.5">
                Soundscape Environments
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {SOUNDSCAPE_PRESETS.map((preset) => {
                  const isActive = preset.id === currentPreset;
                  return (
                    <button
                      key={preset.id}
                      id={`soundscape-preset-${preset.id}`}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`p-2 rounded-2xl text-left transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-xs'
                          : 'bg-[#f7f7f3] hover:bg-[#f0f0ea] border-[#e8e8df] text-[#4a4a40]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{preset.name}</span>
                        {isActive && isPlaying && (
                          <Sparkles className="w-3 h-3 text-white animate-spin" />
                        )}
                      </div>
                      <p
                        className={`text-[10px] line-clamp-1 mt-0.5 ${
                          isActive ? 'text-white/80' : 'text-[#8a8a7a]'
                        }`}
                      >
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Master Volume Slider */}
            <div className="flex items-center gap-3 bg-[#f7f7f3] p-2.5 rounded-2xl border border-[#e8e8df]">
              <Volume2 className="w-3.5 h-3.5 text-[#8a8a7a]" />
              <input
                id="soundscape-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full accent-[#5A5A40] cursor-pointer h-1.5 bg-[#e0e0d8] rounded-lg"
              />
              <span className="text-[10px] font-mono text-[#8a8a7a] w-8 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>

            {/* Focus Meditation Timers */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#8a8a7a]">
                  Focus Session Timer
                </span>
                {timerSecondsLeft > 0 && (
                  <span className="text-xs font-mono font-bold text-[#5A5A40]">
                    {formatTimer(timerSecondsLeft)} remaining
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Off', min: 0 },
                  { label: '15 Min', min: 15 },
                  { label: '25 Min', min: 25 },
                  { label: '45 Min', min: 45 },
                ].map((opt) => (
                  <button
                    key={opt.min}
                    id={`soundscape-timer-${opt.min}m`}
                    onClick={() => handleSetTimer(opt.min)}
                    className={`py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      selectedTimerOption === opt.min
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                        : 'bg-[#f7f7f3] hover:bg-[#f0f0ea] border-[#e8e8df] text-[#727262]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
