export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'deepen';

export interface JournalMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
  authorName?: string;
  authorPhoto?: string | null;
  authorId?: string;
}

export interface EmotionalMetrics {
  joy: number; // 0-100
  clarity: number; // 0-100
  calm: number; // 0-100
  focus: number; // 0-100
  tension: number; // 0-100
  energy: number; // 1-10
  primaryMood: string;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  vaultId?: string;
  title: string;
  summary?: string;
  category?: 'reflection' | 'brainstorm' | 'problem-solving' | 'gratitude' | 'freeform' | 'retrospective';
  createdAt: string;
  updatedAt: string;
  messages: JournalMessage[];
  tags?: string[];
  isFavorite?: boolean;
  energyScore?: number; // 1-10
  sentimentScore?: number; // -1 to 1 or 0-100
  sentiment?: string;
  keywords?: string[];
  extractedKeywords?: string[];
  emotionalMetrics?: EmotionalMetrics;
  emotionalDimensions?: {
    joy?: number;
    clarity?: number;
    calm?: number;
    focus?: number;
    tension?: number;
  };
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt?: string;
  lastLoginAt?: string;
}

// Collaborative Vault Types
export type VaultRole = 'owner' | 'editor' | 'viewer';

export interface VaultMember {
  uid?: string;
  email: string;
  displayName?: string;
  role: VaultRole;
  addedAt: string;
}

export interface CollaborativeVault {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerEmail: string;
  members: Record<string, VaultMember>; // key is uid or sanitized email
  memberEmails: string[];
  createdAt: string;
  updatedAt: string;
}

// Ambient Soundscapes
export type SoundscapeType = 'lofi' | 'binaural' | 'rain' | 'stream' | 'zen';

export interface SoundscapePreset {
  id: SoundscapeType;
  name: string;
  description: string;
  tag: string;
  color: string;
}

// Weekly Digest
export interface WeeklyDigest {
  id: string;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  title: string;
  synthesis: string;
  coreThemes: string[];
  keyTakeaways: string[];
  growthActions: string[];
  emotionalOverview: string;
  entryCount: number;
  createdAt: string;
}

// Interactive Analytics
export interface EmotionTrendPoint {
  date: string;
  displayDate: string;
  energy: number;
  clarity: number;
  calm: number;
  focus: number;
  joy: number;
  tension: number;
  entriesCount: number;
}

export interface KeywordFrequency {
  text: string;
  count: number;
  category: 'theme' | 'emotion' | 'focus';
}

export interface AnalyticsSummary {
  totalReflections: number;
  totalWords: number;
  avgEnergy: number;
  dominantMood: string;
  activeDaysCount: number;
  trendPoints: EmotionTrendPoint[];
  topKeywords: KeywordFrequency[];
  modeDistribution: { name: string; value: number }[];
}
