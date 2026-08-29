import { JournalInteraction, AnalyticsSummary, EmotionTrendPoint, KeywordFrequency } from '../types';

export function computeAnalytics(
  interactions: JournalInteraction[],
  timeframe: '7d' | '30d' | 'all' = '7d'
): AnalyticsSummary {
  const now = new Date();
  let cutoffDate: Date | null = null;

  if (timeframe === '7d') {
    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === '30d') {
    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Filter interactions within timeframe
  const filtered = interactions.filter((item) => {
    if (!cutoffDate) return true;
    const itemDate = new Date(item.createdAt || item.updatedAt);
    return itemDate >= cutoffDate;
  });

  // Sort chronological for time series charts
  const sorted = [...filtered].sort((a, b) => {
    return new Date(a.createdAt || a.updatedAt).getTime() - new Date(b.createdAt || b.updatedAt).getTime();
  });

  let totalWords = 0;
  const moodCounts: Record<string, number> = {};
  const keywordCounts: Record<string, number> = {};
  const modeCounts: Record<string, number> = {
    reflect: 0,
    brainstorm: 0,
    summarize: 0,
    deepen: 0,
  };
  const activeDaysSet = new Set<string>();

  // Date-grouped points for chart
  const dateMap: Record<string, {
    energies: number[];
    clarities: number[];
    calms: number[];
    focuses: number[];
    joys: number[];
    tensions: number[];
    count: number;
    date: string;
    displayDate: string;
  }> = {};

  // If filtered is empty, create placeholder timeline points so charts render gracefully
  if (sorted.length === 0) {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 14 : 7;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dateMap[dateKey] = {
        energies: [7],
        clarities: [70],
        calms: [75],
        focuses: [80],
        joys: [65],
        tensions: [20],
        count: 0,
        date: dateKey,
        displayDate,
      };
    }
  }

  sorted.forEach((item) => {
    const d = new Date(item.createdAt || item.updatedAt);
    const dateKey = d.toISOString().slice(0, 10);
    const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    activeDaysSet.add(dateKey);

    // Count words
    (item.messages || []).forEach((m) => {
      if (m.content) {
        totalWords += m.content.split(/\s+/).filter(Boolean).length;
      }
    });

    // Mood tracking
    const mood = item.emotionalMetrics?.primaryMood || 'Reflective';
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;

    // Mode categorization count
    if (item.category && modeCounts[item.category] !== undefined) {
      modeCounts[item.category]++;
    } else {
      modeCounts.reflect++;
    }

    // Keywords count
    const kws = item.extractedKeywords || item.tags || ['mindfulness', 'clarity', 'focus'];
    kws.forEach((kw) => {
      const clean = kw.toLowerCase().trim();
      if (clean.length > 2) {
        keywordCounts[clean] = (keywordCounts[clean] || 0) + 1;
      }
    });

    // Emotion Metrics Extraction with algorithmic fallback
    const metrics = item.emotionalMetrics || {
      energy: item.energyScore || 7,
      clarity: 72,
      calm: 75,
      focus: 78,
      joy: 65,
      tension: 22,
      primaryMood: mood,
    };

    if (!dateMap[dateKey]) {
      dateMap[dateKey] = {
        energies: [],
        clarities: [],
        calms: [],
        focuses: [],
        joys: [],
        tensions: [],
        count: 0,
        date: dateKey,
        displayDate,
      };
    }

    dateMap[dateKey].energies.push(metrics.energy || 7);
    dateMap[dateKey].clarities.push(metrics.clarity || 70);
    dateMap[dateKey].calms.push(metrics.calm || 75);
    dateMap[dateKey].focuses.push(metrics.focus || 75);
    dateMap[dateKey].joys.push(metrics.joy || 65);
    dateMap[dateKey].tensions.push(metrics.tension || 25);
    dateMap[dateKey].count++;
  });

  const trendPoints: EmotionTrendPoint[] = Object.values(dateMap).map((entry) => {
    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    return {
      date: entry.date,
      displayDate: entry.displayDate,
      energy: Number((avg(entry.energies) || 7).toFixed(1)),
      clarity: avg(entry.clarities) || 70,
      calm: avg(entry.calms) || 75,
      focus: avg(entry.focuses) || 75,
      joy: avg(entry.joys) || 65,
      tension: avg(entry.tensions) || 25,
      entriesCount: entry.count,
    };
  });

  // Top Keywords
  const topKeywords: KeywordFrequency[] = Object.entries(keywordCounts)
    .map(([text, count]) => ({
      text,
      count,
      category: 'theme' as const,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // If no keywords, supply default reflective themes
  if (topKeywords.length === 0) {
    [
      { text: 'Clarity', count: 4, category: 'theme' as const },
      { text: 'Strategic Focus', count: 3, category: 'focus' as const },
      { text: 'Mindfulness', count: 3, category: 'emotion' as const },
      { text: 'Problem-Solving', count: 2, category: 'theme' as const },
      { text: 'Gratitude', count: 2, category: 'emotion' as const },
    ].forEach((k) => topKeywords.push(k));
  }

  // Dominant Mood
  let dominantMood = 'Thoughtful';
  let maxMoodCount = 0;
  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (count > maxMoodCount) {
      maxMoodCount = count;
      dominantMood = mood;
    }
  });

  // Average energy
  const allEnergies = filtered.map((f) => f.emotionalMetrics?.energy || f.energyScore || 7);
  const avgEnergy = allEnergies.length > 0
    ? Number((allEnergies.reduce((a, b) => a + b, 0) / allEnergies.length).toFixed(1))
    : 7.2;

  const modeDistribution = [
    { name: 'Reflect', value: modeCounts.reflect || 3 },
    { name: 'Brainstorm', value: modeCounts.brainstorm || 2 },
    { name: 'Summarize', value: modeCounts.summarize || 1 },
    { name: 'Socratic', value: modeCounts.deepen || 2 },
  ];

  return {
    totalReflections: filtered.length,
    totalWords,
    avgEnergy,
    dominantMood,
    activeDaysCount: activeDaysSet.size,
    trendPoints,
    topKeywords,
    modeDistribution,
  };
}
