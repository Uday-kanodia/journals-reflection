import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceDictationButton: React.FC<VoiceDictationButtonProps> = ({
  onTranscript,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptChunk + ' ';
          } else {
            interim += transcriptChunk;
          }
        }

        if (final) {
          onTranscript(final);
          setInterimText('');
        } else {
          setInterimText(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[SpeechRecognition error]:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access was denied. Please allow microphone permissions.');
        } else if (event.error !== 'no-speech') {
          setErrorMsg(`Voice dictation error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    setErrorMsg(null);
    if (!recognitionRef.current) {
      setErrorMsg('Speech recognition is not supported in this browser. Try Chrome/Edge or Safari.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e: any) {
        console.error('Failed to start speech recognition:', e);
        setErrorMsg('Could not start microphone dictation.');
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        id="voice-dictation-toggle-btn"
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`p-2.5 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer border ${
          isListening
            ? 'bg-rose-700 text-white border-rose-800 shadow-md shadow-rose-700/20 animate-pulse'
            : 'bg-white hover:bg-[#f0f0ea] border-[#d8d8ce] text-[#5A5A40]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isListening ? 'Stop Voice Dictation' : 'Voice-to-Text Stream of Consciousness'}
      >
        {isListening ? (
          <>
            <MicOff className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">
              Listening...
            </span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">
              Dictate
            </span>
          </>
        )}
      </button>

      {/* Interim Listening Indicator Pill */}
      {isListening && interimText && (
        <div className="absolute bottom-full mb-2 left-0 z-50 bg-[#2e2e26] text-white text-xs px-3 py-1.5 rounded-xl shadow-lg border border-[#4a4a40] whitespace-nowrap max-w-xs truncate animate-in fade-in">
          <span className="text-[#a0a090] mr-1.5 font-bold">Transcribing:</span>
          "{interimText}"
        </div>
      )}

      {/* Error Message Toast */}
      {errorMsg && (
        <div className="absolute bottom-full mb-2 right-0 z-50 bg-rose-50 text-rose-800 border border-rose-200 text-xs px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 max-w-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 font-bold ml-1 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
