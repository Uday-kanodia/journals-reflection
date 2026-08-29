import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Zap,
  Tag,
  Calendar,
  Smile,
  BookOpen,
  Sparkles,
  BarChart2,
  Layers,
} from 'lucide-react';
import { JournalInteraction } from '../types';
import { computeAnalytics } from '../services/analyticsService';

interface AnalyticsViewProps {
  interactions: JournalInteraction[];
  onClose?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ interactions }) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('7d');

  const analytics = useMemo(() => {
    return computeAnalytics(interactions, timeframe);
  }, [interactions, timeframe]);

  return (
    <div id="analytics-dashboard-view" className="flex-1 h-full overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#f5f5f0] text-[#4a4a40]">
      {/* Header & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e0e0d8] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#5A5A40]/10 text-[#5A5A40]">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2e2e26]">
              Reflection Analytics
            </h1>
          </div>
          <p className="text-xs text-[#8a8a7a] mt-1">
            Visual psycholinguistic insights, emotional trajectories, and energy dynamics over time.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center bg-white p-1 rounded-2xl border border-[#d8d8ce] shadow-xs self-start sm:self-auto">
          {[
            { id: '7d', label: 'Past 7 Days' },
            { id: '30d', label: 'Past 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`analytics-timeframe-${tab.id}`}
              onClick={() => setTimeframe(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeframe === tab.id
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-[#727262] hover:text-[#2e2e26] hover:bg-[#f0f0ea]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e0e0d8] shadow-xs">
          <div className="flex items-center justify-between text-[#8a8a7a] mb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold">Total Entries</span>
            <BookOpen className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#2e2e26]">
            {analytics.totalReflections}
          </p>
          <p className="text-[11px] text-[#8a8a7a] mt-1 font-medium">
            {analytics.totalWords.toLocaleString()} total words recorded
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e0e0d8] shadow-xs">
          <div className="flex items-center justify-between text-[#8a8a7a] mb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold">Avg Energy</span>
            <Zap className="w-4 h-4 text-[#8c7438]" />
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#2e2e26]">
            {analytics.avgEnergy}
            <span className="text-sm font-sans text-[#8a8a7a] font-normal"> / 10</span>
          </p>
          <p className="text-[11px] text-[#456b3e] mt-1 font-medium flex items-center gap-1">
            <Activity className="w-3 h-3" /> Balanced flow state
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e0e0d8] shadow-xs">
          <div className="flex items-center justify-between text-[#8a8a7a] mb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold">Dominant Mood</span>
            <Smile className="w-4 h-4 text-[#456b3e]" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[#2e2e26] truncate">
            {analytics.dominantMood}
          </p>
          <p className="text-[11px] text-[#8a8a7a] mt-1 font-medium">
            Primary recurring mindset
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e0e0d8] shadow-xs">
          <div className="flex items-center justify-between text-[#8a8a7a] mb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold">Active Days</span>
            <Calendar className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#2e2e26]">
            {analytics.activeDaysCount}
          </p>
          <p className="text-[11px] text-[#8a8a7a] mt-1 font-medium">
            Consistency in selected block
          </p>
        </div>
      </div>

      {/* Primary Chart: Emotional & Energy Trajectory Area Chart */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e0e0d8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#2e2e26]">
              Emotional & Energy Trajectory
            </h2>
            <p className="text-xs text-[#8a8a7a]">
              Daily evolution of Clarity, Calm, Focus, and Energy levels.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-[#5A5A40]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5A5A40]" /> Clarity
            </span>
            <span className="flex items-center gap-1.5 text-[#456b3e]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#456b3e]" /> Calm
            </span>
            <span className="flex items-center gap-1.5 text-[#8c7438]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8c7438]" /> Energy
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.trendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clarityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#5A5A40" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="calmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#456b3e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#456b3e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0ea" />
              <XAxis dataKey="displayDate" stroke="#a0a090" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="#a0a090" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#d8d8ce',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  fontSize: '12px',
                  color: '#2e2e26',
                }}
              />
              <Area
                type="monotone"
                dataKey="clarity"
                name="Clarity"
                stroke="#5A5A40"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#clarityGrad)"
              />
              <Area
                type="monotone"
                dataKey="calm"
                name="Calm"
                stroke="#456b3e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#calmGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion Balance Breakdown */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e0e0d8] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#2e2e26]">
                Emotional Spectrum Averages
              </h2>
              <p className="text-xs text-[#8a8a7a]">Composite scores across reflective dimensions</p>
            </div>
            <BarChart2 className="w-4 h-4 text-[#5A5A40]" />
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Clarity', score: analytics.trendPoints.length > 0 ? analytics.trendPoints[analytics.trendPoints.length - 1].clarity : 72 },
                  { name: 'Calm', score: analytics.trendPoints.length > 0 ? analytics.trendPoints[analytics.trendPoints.length - 1].calm : 75 },
                  { name: 'Focus', score: analytics.trendPoints.length > 0 ? analytics.trendPoints[analytics.trendPoints.length - 1].focus : 80 },
                  { name: 'Joy', score: analytics.trendPoints.length > 0 ? analytics.trendPoints[analytics.trendPoints.length - 1].joy : 65 },
                  { name: 'Tension', score: analytics.trendPoints.length > 0 ? analytics.trendPoints[analytics.trendPoints.length - 1].tension : 20 },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0ea" />
                <XAxis dataKey="name" stroke="#8a8a7a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#8a8a7a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#d8d8ce',
                    borderRadius: '16px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="score" fill="#5A5A40" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Keyword Frequency & Recurring Themes */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e0e0d8] shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-serif text-lg font-bold text-[#2e2e26]">
                Recurring Concepts & Themes
              </h2>
              <Tag className="w-4 h-4 text-[#8c7438]" />
            </div>
            <p className="text-xs text-[#8a8a7a]">
              Key ideas and topics recurring throughout your journaling sessions.
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              {analytics.topKeywords.map((kw, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-2xl bg-[#f7f7f3] border border-[#e0e0d8] hover:border-[#5A5A40] transition-colors flex items-center gap-2"
                >
                  <span className="text-xs font-bold text-[#2e2e26] capitalize">
                    {kw.text}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#5A5A40]/10 text-[#5A5A40]">
                    {kw.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#f0f0ea] flex items-center justify-between text-xs text-[#8a8a7a]">
            <span>Cognitive focus index</span>
            <span className="font-bold text-[#5A5A40] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> High introspective depth
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
