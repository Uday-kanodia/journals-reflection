import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  subscribeToUserInteractions,
  saveJournalInteraction,
  deleteJournalInteraction,
  subscribeToUserVaults,
  subscribeToVaultInteractions,
  saveVaultInteraction,
  deleteVaultInteraction,
  subscribeToWeeklyDigests,
  subscribeToNotificationConfigs,
  updateJournalInteractionLocation,
} from './firebase';
import {
  JournalInteraction,
  JournalMessage,
  ReflectionMode,
  CollaborativeVault,
  WeeklyDigest,
  JournalLocation,
  NotificationConfig,
} from './types';
import { LandingView } from './components/LandingView';
import { HistorySidebar } from './components/HistorySidebar';
import { ReflectionCanvas } from './components/ReflectionCanvas';
import { AnalyticsView } from './components/AnalyticsView';
import { WeeklyDigestView } from './components/WeeklyDigestView';
import { CollaborativeVaultModal } from './components/CollaborativeVaultModal';
import { SoundscapeDock } from './components/SoundscapeDock';
import { AdminDashboardView } from './components/AdminDashboardView';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import {
  BookHeart,
  LogOut,
  Shield,
  Sparkles,
  Menu,
  X,
  User as UserIcon,
  TrendingUp,
  Users,
  Volume2,
  Bell,
  Settings,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Workspace View: 'journal' | 'analytics' | 'digests' | 'admin'
  const [activeTab, setActiveTab] = useState<'journal' | 'analytics' | 'digests' | 'admin'>('journal');

  // Firestore Interactions State (Personal or Vault)
  const [personalInteractions, setPersonalInteractions] = useState<JournalInteraction[]>([]);
  const [vaultInteractions, setVaultInteractions] = useState<JournalInteraction[]>([]);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Collaborative Vaults State
  const [vaults, setVaults] = useState<CollaborativeVault[]>([]);
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);

  // Weekly Digests State
  const [weeklyDigests, setWeeklyDigests] = useState<WeeklyDigest[]>([]);

  // External Webhook Notifications State
  const [notificationConfigs, setNotificationConfigs] = useState<NotificationConfig[]>([]);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  // Generation & Save Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Mobile sidebar toggle
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
        setAuthLoading(false);
      },
      (error) => {
        console.error('[Auth Listener Error]:', error);
        setAuthError(error.message);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Real-Time Personal Interactions Subscription
  useEffect(() => {
    if (!currentUser) {
      setPersonalInteractions([]);
      return;
    }

    const unsubscribe = subscribeToUserInteractions(
      currentUser.uid,
      (data) => {
        setPersonalInteractions(data);
        if (!activeVaultId && data.length > 0 && !activeInteractionId) {
          setActiveInteractionId(data[0].id);
        }
      },
      (err) => {
        console.error('[Personal Firestore Subscription Error]:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser, activeVaultId]);

  // 3. Real-Time Vaults Subscription
  useEffect(() => {
    if (!currentUser) {
      setVaults([]);
      return;
    }

    const unsubscribe = subscribeToUserVaults(
      currentUser,
      (data) => {
        setVaults(data);
      },
      (err) => {
        console.error('[Vaults Subscription Error]:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 4. Real-Time Vault Interactions Subscription (when a vault is selected)
  useEffect(() => {
    if (!activeVaultId) {
      setVaultInteractions([]);
      return;
    }

    const unsubscribe = subscribeToVaultInteractions(
      activeVaultId,
      (data) => {
        setVaultInteractions(data);
        if (data.length > 0 && (!activeInteractionId || !data.some((i) => i.id === activeInteractionId))) {
          setActiveInteractionId(data[0].id);
        }
      },
      (err) => {
        console.error('[Vault Interactions Subscription Error]:', err);
      }
    );

    return () => unsubscribe();
  }, [activeVaultId]);

  // 5. Real-Time Weekly Digests Subscription
  useEffect(() => {
    if (!currentUser) {
      setWeeklyDigests([]);
      return;
    }

    const unsubscribe = subscribeToWeeklyDigests(
      currentUser.uid,
      (data) => {
        setWeeklyDigests(data);
      },
      (err) => {
        console.error('[Weekly Digests Subscription Error]:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 6. Real-Time External Notification Webhooks Subscription
  useEffect(() => {
    if (!currentUser) {
      setNotificationConfigs([]);
      return;
    }

    const unsubscribe = subscribeToNotificationConfigs(
      currentUser.uid,
      (data) => {
        setNotificationConfigs(data);
      },
      (err) => {
        console.error('[Notification Configs Subscription Error]:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Derived current interactions list
  const currentInteractions = activeVaultId ? vaultInteractions : personalInteractions;
  const activeVault = vaults.find((v) => v.id === activeVaultId) || null;

  // Auth Handlers
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('[Sign-In Error]:', err);
      setAuthError(err.message || 'Failed to complete Google Sign-In.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setActiveInteractionId(null);
      setActiveVaultId(null);
      setPersonalInteractions([]);
      setVaultInteractions([]);
    } catch (err: any) {
      console.error('[Sign-Out Error]:', err);
    }
  };

  // Interaction Handlers
  const handleNewInteraction = () => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveInteractionId(newId);
    setActiveTab('journal');
    setIsMobileSidebarOpen(false);
  };

  const handleDeleteInteraction = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      if (activeVaultId) {
        await deleteVaultInteraction(activeVaultId, id);
      } else {
        await deleteJournalInteraction(currentUser.uid, id);
      }

      if (activeInteractionId === id) {
        const remaining = currentInteractions.filter((i) => i.id !== id);
        setActiveInteractionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      console.error('[Delete Error]:', err);
    }
  };

  // Active interaction finder
  const activeInteraction =
    currentInteractions.find((i) => i.id === activeInteractionId) ||
    (activeInteractionId
      ? {
          id: activeInteractionId,
          userId: currentUser?.uid || '',
          vaultId: activeVaultId || undefined,
          title: activeVault ? 'New Vault Retrospective' : 'New Reflection',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        }
      : null);

  // Send Message & Converse with Gemini 3.6 Flash
  const handleSendMessage = async (
    promptText: string,
    mode: ReflectionMode,
    location?: JournalLocation
  ) => {
    if (!currentUser) return;

    let targetInteractionId = activeInteractionId;
    let currentSession: JournalInteraction;

    if (!targetInteractionId || !activeInteraction) {
      targetInteractionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      currentSession = {
        id: targetInteractionId,
        userId: currentUser.uid,
        vaultId: activeVaultId || undefined,
        title: promptText.slice(0, 40) + '...',
        category: mode === 'brainstorm' ? 'brainstorm' : 'reflection',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        location: location || undefined,
      };
      setActiveInteractionId(targetInteractionId);
    } else {
      currentSession = {
        ...activeInteraction,
        location: location !== undefined ? location : activeInteraction.location,
      };
    }

    const userMsg: JournalMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
      authorId: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email || 'You',
      authorPhoto: currentUser.photoURL || undefined,
    };

    // Optimistically update interaction with user message
    const updatedMessages = [...currentSession.messages, userMsg];
    currentSession = {
      ...currentSession,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    // Trigger AI Generation
    setIsGenerating(true);
    setSaveStatus('saving');
    setSaveErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt: promptText,
          messages: currentSession.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode,
          title: currentSession.title,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      const modelReply = data.reply || 'Reflection generated.';
      const modelUsed = data.modelUsed || 'gemini-3.6-flash';

      const aiMsg: JournalMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'model',
        content: modelReply,
        timestamp: new Date().toISOString(),
        modelUsed,
      };

      currentSession.messages = [...updatedMessages, aiMsg];
      currentSession.updatedAt = new Date().toISOString();

      // If this is the first turn, automatically extract title, emotional and psycholinguistic metadata
      if (currentSession.messages.length === 2) {
        try {
          const sumRes = await fetch('/api/gemini/summarize-entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryText: promptText }),
          });
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            if (sumData.title) currentSession.title = sumData.title;
            if (sumData.summary) currentSession.summary = sumData.summary;
            if (sumData.sentiment) currentSession.sentiment = sumData.sentiment;
            if (sumData.energyScore) currentSession.energyScore = sumData.energyScore;
            if (sumData.keywords) currentSession.keywords = sumData.keywords;
            if (sumData.emotionalDimensions) {
              currentSession.emotionalDimensions = sumData.emotionalDimensions;
            }
          }
        } catch (e) {
          console.warn('Auto-summary failed gracefully', e);
        }
      }

      // Guaranteed Transaction Verification: Persist to Firestore
      if (activeVaultId) {
        await saveVaultInteraction(activeVaultId, currentSession);
      } else {
        await saveJournalInteraction(currentUser.uid, currentSession);
      }
      setSaveStatus('saved');

      // Dispatch external notifications for matching active webhooks
      const activeConfigs = notificationConfigs.filter((c) => c.enabled && c.webhookUrl);
      if (activeConfigs.length > 0) {
        for (const config of activeConfigs) {
          let shouldTrigger = config.triggers.includes('all');
          if (!shouldTrigger && config.triggers.includes('high_energy') && (currentSession.energyScore || 0) >= 8) {
            shouldTrigger = true;
          }
          if (!shouldTrigger && config.triggers.includes('high_clarity') && (currentSession.emotionalDimensions?.clarity || 0) >= 75) {
            shouldTrigger = true;
          }
          if (!shouldTrigger && config.triggers.includes('breakthrough') && mode === 'deepen') {
            shouldTrigger = true;
          }

          if (shouldTrigger) {
            fetch('/api/notifications/dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                webhookUrl: config.webhookUrl,
                platform: config.platform,
                trigger: config.triggers[0] || 'all',
                userEmail: currentUser.email || 'anonymous',
                entry: {
                  title: currentSession.title,
                  summary: currentSession.summary || currentSession.messages[currentSession.messages.length - 1]?.content.slice(0, 300),
                  category: currentSession.category || 'reflection',
                  energyScore: currentSession.energyScore || 7,
                  sentiment: currentSession.sentiment || 'balanced',
                  location: currentSession.location,
                },
              }),
            }).catch((err) => console.warn('[Notification Webhook Dispatch Warning]:', err));
          }
        }
      }
    } catch (err: any) {
      console.error('[Gemini / Firestore Error]:', err);
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Failed to save or process reflection.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update location for active interaction
  const handleUpdateLocation = async (loc: JournalLocation | null) => {
    if (!currentUser || !activeInteractionId || !activeInteraction) return;

    const updatedSession: JournalInteraction = {
      ...activeInteraction,
      location: loc || undefined,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (activeVaultId) {
        await saveVaultInteraction(activeVaultId, updatedSession);
      } else {
        await updateJournalInteractionLocation(currentUser.uid, activeInteractionId, loc);
      }
    } catch (err) {
      console.error('[Update Location Error]:', err);
    }
  };

  // Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center text-[#5A5A40] space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#5A5A40]/10 border border-[#5A5A40]/20 flex items-center justify-center text-[#5A5A40] animate-pulse font-serif font-bold italic text-xl">
          G
        </div>
        <p className="text-xs uppercase tracking-widest font-bold text-[#8a8a7a]">
          Initializing secure reflection space...
        </p>
      </div>
    );
  }

  // If Not Authenticated -> Show Landing View with Google Sign-In prompt
  if (!currentUser) {
    return (
      <LandingView
        onSignIn={handleGoogleSignIn}
        isLoading={authLoading}
        errorMessage={authError}
      />
    );
  }

  // Authenticated Dashboard
  return (
    <div className="h-screen w-screen bg-[#f5f5f0] text-[#4a4a40] flex flex-col overflow-hidden">
      {/* App Top Navigation */}
      <header className="h-16 border-b border-[#e0e0d8] bg-white/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            id="mobile-sidebar-toggle-btn"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-xl bg-white border border-[#d8d8ce] text-[#5A5A40] md:hidden hover:bg-[#5A5A40] hover:text-white transition-colors"
          >
            {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#5A5A40] flex items-center justify-center text-white font-serif font-bold italic text-sm shadow-xs">
              G
            </div>
            <span className="font-bold text-xs uppercase tracking-tight text-[#2e2e26] hidden sm:inline">
              Reflection Journal
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-[#e0e0d8] text-[10px] text-[#727262] shadow-xs">
            <Shield className="w-3 h-3 text-[#5A5A40]" />
            <span>
              {activeVaultId
                ? `Vault Isolation: /vaults/${activeVaultId.slice(0, 8)}...`
                : `User Isolation: /users/${currentUser.uid.slice(0, 8)}...`}
            </span>
          </div>
        </div>

        {/* Workspace Quick Toggles & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Soundscape Dock */}
          <SoundscapeDock />

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-[#e0e0d8]">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full ring-2 ring-[#5A5A40]/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center text-xs font-bold">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#2e2e26] line-clamp-1">
                {currentUser.displayName || currentUser.email}
              </p>
              <p className="text-[10px] text-[#8a8a7a] font-mono">
                {currentUser.email}
              </p>
            </div>

            <button
              id="app-signout-btn"
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-white border border-[#d8d8ce] hover:bg-[#5A5A40] hover:text-white text-[#5A5A40] transition-colors cursor-pointer shadow-xs"
              title="Sign out of Firebase"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop & Mobile History Sidebar */}
        <div
          className={`${
            isMobileSidebarOpen
              ? 'absolute inset-y-0 left-0 z-40 w-80 shadow-2xl flex'
              : 'hidden md:flex'
          }`}
        >
          <HistorySidebar
            interactions={currentInteractions}
            activeInteractionId={activeInteractionId}
            onSelectInteraction={(id) => {
              setActiveInteractionId(id);
              setIsMobileSidebarOpen(false);
            }}
            onNewInteraction={handleNewInteraction}
            onDeleteInteraction={handleDeleteInteraction}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab={activeTab}
            onChangeTab={(tab) => {
              setActiveTab(tab);
              setIsMobileSidebarOpen(false);
            }}
            activeVault={activeVault}
            onOpenVaultModal={() => setIsVaultModalOpen(true)}
            onExitVault={() => {
              setActiveVaultId(null);
              setActiveInteractionId(null);
            }}
            onOpenNotifications={() => setIsNotificationsModalOpen(true)}
            onOpenAdmin={() => {
              setActiveTab('admin');
              setIsMobileSidebarOpen(false);
            }}
          />
        </div>

        {/* Backdrop for mobile sidebar */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-[#2e2e26]/30 backdrop-blur-xs z-30 md:hidden"
          />
        )}

        {/* Main Content View Switcher */}
        {activeTab === 'journal' && (
          <ReflectionCanvas
            activeInteraction={activeInteraction}
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
            saveStatus={saveStatus}
            saveErrorMessage={saveErrorMessage}
            isVaultContext={Boolean(activeVaultId)}
            vaultTitle={activeVault?.title}
            onUpdateLocation={handleUpdateLocation}
            onRetrySave={() => {
              if (currentUser && activeInteraction) {
                setSaveStatus('saving');
                const saveAction = activeVaultId
                  ? saveVaultInteraction(activeVaultId, activeInteraction)
                  : saveJournalInteraction(currentUser.uid, activeInteraction);

                saveAction
                  .then(() => setSaveStatus('saved'))
                  .catch((e) => {
                    setSaveStatus('error');
                    setSaveErrorMessage(e.message);
                  });
              }
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            interactions={personalInteractions}
            onClose={() => setActiveTab('journal')}
          />
        )}

        {activeTab === 'digests' && (
          <WeeklyDigestView
            userId={currentUser.uid}
            interactions={personalInteractions}
            digests={weeklyDigests}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboardView
            currentUser={currentUser}
            onClose={() => setActiveTab('journal')}
          />
        )}
      </div>

      {/* Collaborative Vaults Management Modal */}
      <CollaborativeVaultModal
        currentUser={currentUser}
        vaults={vaults}
        activeVaultId={activeVaultId}
        onSelectVault={(id) => {
          setActiveVaultId(id);
          setActiveInteractionId(null);
        }}
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
      />

      {/* External Notifications & Webhook Integration Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
