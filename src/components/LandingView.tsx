import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  BrainCircuit,
  Lock,
  ChevronRight,
  BookHeart,
  ArrowRight,
  Database,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

interface LandingProps {
  onSignIn: () => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export const LandingView: React.FC<LandingProps> = ({
  onSignIn,
  isLoading,
  errorMessage,
}) => {
  return (
    <div id="landing-page" className="min-h-screen bg-[#f5f5f0] text-[#4a4a40] flex flex-col justify-between selection:bg-[#5A5A40] selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-[#e0e0d8] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#5A5A40] flex items-center justify-center text-white font-bold italic font-serif text-lg shadow-sm">
              G
            </div>
            <div>
              <span className="font-bold text-sm uppercase tracking-tight text-[#4a4a40] flex items-center gap-2">
                Reflection Journal
                <span className="text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20">
                  Gemini 3.6 Flash
                </span>
              </span>
            </div>
          </div>

          <button
            id="nav-signin-btn"
            onClick={onSignIn}
            disabled={isLoading}
            className="px-4 py-2 text-xs uppercase font-bold tracking-widest rounded-2xl bg-[#5A5A40] hover:bg-[#484833] text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {isLoading ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <KeyRound className="w-3.5 h-3.5" />
            )}
            Sign In with Google
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex-1 flex flex-col justify-center">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 border border-[#e0e0d8] text-xs text-[#727262] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span className="tracking-wide">Multi-turn reflective journaling with Cloud Firestore isolation</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal font-serif tracking-tight text-[#2e2e26] leading-tight">
            Introspect deeply. <br />
            <span className="italic text-[#5A5A40]">
              Reflect with natural clarity.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#727262] max-w-2xl mx-auto leading-relaxed">
            A serene, private space to write your journal reflections and have meaningful, multi-turn dialogues with Gemini. Every insight is strictly isolated to your personal account in Cloud Firestore.
          </p>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm max-w-md mx-auto text-left flex items-start gap-3 shadow-sm">
              <span className="p-1 rounded-md bg-rose-100 text-rose-700 mt-0.5 text-xs font-bold">!</span>
              <div>
                <p className="font-semibold text-rose-900">Authentication Notice</p>
                <p className="text-xs mt-0.5 text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="hero-google-signin-btn"
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#5A5A40] hover:bg-[#484833] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#5A5A40]/15 flex items-center justify-center gap-3 transition-all hover:translate-y-[-1px] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google Sign-In</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid sm:grid-cols-3 gap-6 mt-16 sm:mt-24">
          <div id="feature-card-1" className="p-6 rounded-[32px] bg-white/70 border border-[#e0e0d8] shadow-sm backdrop-blur-sm">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center mb-4 border border-[#5A5A40]/15">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-[#2e2e26] font-serif font-bold text-base mb-1.5">Conversational Journaling</h3>
            <p className="text-[#727262] text-sm leading-relaxed">
              Explore your thoughts through conversational journaling. Ask Gemini 3.6 Flash for summaries, reframing, and actionable ideas.
            </p>
          </div>

          <div id="feature-card-2" className="p-6 rounded-[32px] bg-white/70 border border-[#e0e0d8] shadow-sm backdrop-blur-sm">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center mb-4 border border-[#5A5A40]/15">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-[#2e2e26] font-serif font-bold text-base mb-1.5">User-Isolated Firestore</h3>
            <p className="text-[#727262] text-sm leading-relaxed">
              Strict Firestore security rules guarantee your reflections are stored exclusively in your own user path. No cross-account access.
            </p>
          </div>

          <div id="feature-card-3" className="p-6 rounded-[32px] bg-white/70 border border-[#e0e0d8] shadow-sm backdrop-blur-sm">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center mb-4 border border-[#5A5A40]/15">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-[#2e2e26] font-serif font-bold text-base mb-1.5">History & Synthesis</h3>
            <p className="text-[#727262] text-sm leading-relaxed">
              Review your past reflections anytime with automatic AI title creation and structured key takeaways.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e0e0d8] py-6 text-center text-xs text-[#8a8a7a] bg-white/40">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Protected by Firebase Auth & Cloud Firestore Security Rules</span>
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#5A5A40]" />
            Zero-Password Federated Google Identity
          </span>
        </div>
      </footer>
    </div>
  );
};
