import { useState } from "react";
import { motion } from "motion/react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Dumbbell, TrendingUp, Flame, Target, Activity,
} from "lucide-react";
import type { WorkoutSession } from "../../types";
import { startOfWeek, addDays, isSameDay, subDays, subWeeks, format } from "date-fns";

// ── Stats Computation ────────────────────────────────────────────────────────

export interface DashboardStats {
  weeklyCount: number;
  weeklyVolume: number;
  streak: number;
  avgDuration: number;
  totalSets: number;
  totalReps: number;
  dailyVolume: { day: string; volume: number }[];
  dailyDuration: { day: string; minutes: number }[];
  muscleSplit: { name: string; value: number; color: string }[];
  weeklyTrend: { week: string; volume: number; count: number }[];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "#ef4444",
  Back: "#3b82f6",
  Shoulders: "#f59e0b",
  Quads: "#10b981",
  Hamstrings: "#06b6d4",
  Biceps: "#a855f7",
  Triceps: "#ec4899",
  Calves: "#84cc16",
  Core: "#f97316",
  Glutes: "#14b8a6",
  Other: "#6b7280",
};

export function computeDashboardStats(sessions: WorkoutSession[]): DashboardStats {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeek = sessions.filter(s => new Date(s.startTime) >= weekStart);

  const totalVolume = thisWeek.reduce((sum, s) => sum + (s.totalVolume || 0), 0);

  // Streak
  let streak = 0;
  let checkDate = new Date();
  const sessionDates = sessions.map(s => new Date(s.startTime));
  while (true) {
    if (sessionDates.some(d => isSameDay(d, checkDate))) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else break;
  }

  // Daily breakdowns
  const dailyVolume: { day: string; volume: number }[] = [];
  const dailyDuration: { day: string; minutes: number }[] = [];

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), day));
    dailyVolume.push({ day: DAY_LABELS[i], volume: daySessions.reduce((s, w) => s + (w.totalVolume || 0), 0) });
    dailyDuration.push({ day: DAY_LABELS[i], minutes: Math.round(daySessions.reduce((s, w) => s + (w.durationSeconds || 0), 0) / 60) });
  }

  // Total sets & reps this week
  let totalSets = 0;
  let totalReps = 0;
  const muscleMap: Record<string, number> = {};

  thisWeek.forEach(s => {
    s.exercises?.forEach(ex => {
      const group = ex.muscleGroup || "Other";
      ex.sets?.forEach(set => {
        if (set.completed) {
          totalSets++;
          totalReps += set.reps || 0;
          muscleMap[group] = (muscleMap[group] || 0) + 1;
        }
      });
    });
  });

  const muscleSplit = Object.entries(muscleMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      value,
      color: MUSCLE_COLORS[name] || MUSCLE_COLORS.Other,
    }));

  const avgDuration = thisWeek.length > 0
    ? Math.round(thisWeek.reduce((s, w) => s + (w.durationSeconds || 0), 0) / thisWeek.length)
    : 0;

  // Weekly trend for last 6 weeks
  const weeklyTrend: { week: string; volume: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const weekStartDate = subWeeks(weekStart, i);
    const weekEndDate = addDays(weekStartDate, 7);
    const weekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      return sessionDate >= weekStartDate && sessionDate < weekEndDate;
    });
    const weekVolume = weekSessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
    weeklyTrend.push({
      week: i === 0 ? "This" : format(weekStartDate, "MMM d"),
      volume: Math.round(weekVolume),
      count: weekSessions.length,
    });
  }

  return {
    weeklyCount: thisWeek.length,
    weeklyVolume: Math.round(totalVolume),
    streak,
    avgDuration,
    totalSets,
    totalReps,
    dailyVolume,
    dailyDuration,
    muscleSplit,
    weeklyTrend,
  };
}

// ── Shared Card Wrapper ──────────────────────────────────────────────────────

function WidgetCard({
  children,
  color,
  className = "",
}: {
  children: React.ReactNode;
  color: string;
  className?: string;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={`rounded-2xl border p-3 relative overflow-hidden ${className}`}
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--t-border-subtle)",
        boxShadow: "var(--t-shadow-card)",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ background: `radial-gradient(circle at 10% 10%, ${color}, transparent 70%)` }}
      />
      {children}
    </motion.div>
  );
}

// ── Stat Card (half-width) ───────────────────────────────────────────────────

export function StatCard({
  icon,
  label,
  value,
  suffix,
  color,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  sub?: string;
  loading: boolean;
}) {
  return (
    <WidgetCard color={color}>
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2">
          <span style={{ color }}>{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
            {label}
          </span>
        </div>
        {loading ? (
          <div className="h-8 w-16 rounded-lg animate-pulse" style={{ backgroundColor: "var(--t-glow-2)" }} />
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tracking-tight">{value}</span>
              {suffix && (
                <span className="text-[10px] font-medium" style={{ color: "var(--t-text-muted)" }}>
                  {suffix}
                </span>
              )}
            </div>
            {sub && (
              <span className="text-[10px] mt-0.5 block" style={{ color: "var(--t-text-dim)" }}>
                {sub}
              </span>
            )}
          </>
        )}
      </div>
    </WidgetCard>
  );
}

// ── Volume Trend - Apple Health Style Area Chart (half-width) ────────────────

export function WeeklyTrendWidget({
  data,
  loading,
}: {
  data: { week: string; volume: number; count: number }[];
  loading: boolean;
}) {
  const color = "#3b82f6";
  const latestVolume = data.length > 0 ? data[data.length - 1].volume : 0;
  const formattedVolume = latestVolume >= 1000 ? `${(latestVolume / 1000).toFixed(1)}k` : String(latestVolume);

  return (
    <WidgetCard color={color}>
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp size={12} style={{ color }} />
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
            Volume
          </span>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-xl font-black tracking-tight">{loading ? "—" : formattedVolume}</span>
          <span className="text-[9px] font-medium" style={{ color: "var(--t-text-muted)" }}>kg</span>
        </div>
        {loading ? (
          <div className="h-[72px] rounded-lg animate-pulse" style={{ backgroundColor: "var(--t-glow-2)" }} />
        ) : data.every(d => d.volume === 0) ? (
          <div className="h-[72px] flex items-center justify-center">
            <span className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>No data</span>
          </div>
        ) : (
          <div className="h-[72px] -mx-1 -mb-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
                <defs>
                  <linearGradient id="volTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="60%" stopColor={color} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" hide />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div
                        className="px-2 py-1 rounded-lg text-[9px] font-semibold shadow-lg border"
                        style={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--t-border-subtle)",
                          color: "var(--foreground)",
                        }}
                      >
                        <span style={{ color: "var(--t-text-muted)" }}>{label}: </span>
                        {payload[0].value}kg
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#volTrendGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

// ── Muscle Split - Interactive Donut (half-width) ────────────────────────────

export function MuscleSplitWidget({
  data,
  loading,
}: {
  data: { name: string; value: number; color: string }[];
  loading: boolean;
}) {
  const color = "#ec4899";
  const total = data.reduce((s, d) => s + d.value, 0);
  const topMuscle = data.length > 0 ? data[0] : null;
  const [activeSegment, setActiveSegment] = useState<{ name: string; value: number; color: string } | null>(null);

  const displayed = activeSegment || topMuscle;
  const displayedPct = displayed && total > 0 ? Math.round((displayed.value / total) * 100) : 0;

  return (
    <WidgetCard color={color}>
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity size={12} style={{ color }} />
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
            Muscles
          </span>
        </div>
        {loading ? (
          <div className="h-[100px] rounded-lg animate-pulse" style={{ backgroundColor: "var(--t-glow-2)" }} />
        ) : data.length === 0 ? (
          <div className="h-[100px] flex items-center justify-center">
            <span className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>No data</span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="relative" style={{ width: 110, height: 110 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    strokeWidth={0}
                    onClick={(_: any, index: number) => {
                      setActiveSegment(data[index]);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {data.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        opacity={displayed && displayed.name === entry.name ? 1 : 0.5}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              {displayed && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                >
                  <span className="text-lg font-black tracking-tight" style={{ color: displayed.color, lineHeight: 1 }}>
                    {displayedPct}%
                  </span>
                  <span className="text-[8px] font-semibold mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                    {displayed.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

// ── Full Muscle Split Widget for Analytics ───────────────────────────────────

export function MuscleSplitFullWidget({
  data,
  loading,
}: {
  data: { name: string; value: number; color: string }[];
  loading: boolean;
}) {
  const color = "#ec4899";
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div
      className="rounded-2xl border p-4 relative overflow-hidden"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--t-border-subtle)",
        boxShadow: "var(--t-shadow-card)",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ background: `radial-gradient(circle at 10% 10%, ${color}, transparent 70%)` }}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity size={14} style={{ color }} />
          <span className="text-sm font-bold">Muscle Split</span>
          <span className="text-[10px] ml-auto" style={{ color: "var(--t-text-dim)" }}>
            This week &middot; {total} total sets
          </span>
        </div>
        {loading ? (
          <div className="h-[100px] rounded-lg animate-pulse" style={{ backgroundColor: "var(--t-glow-2)" }} />
        ) : data.length === 0 ? (
          <div className="h-[100px] flex items-center justify-center">
            <span className="text-[11px]" style={{ color: "var(--t-text-dim)" }}>No data yet</span>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            <div style={{ width: 100, height: 100, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={46}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold shadow-lg border"
                          style={{
                            backgroundColor: "var(--card)",
                            borderColor: "var(--t-border-subtle)",
                            color: "var(--foreground)",
                          }}
                        >
                          <span style={{ color: d.color }}>{d.name}</span>: {d.value} sets ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5 min-w-0">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px]" style={{ color: "var(--t-text-secondary)" }}>
                    {d.name}
                  </span>
                  <span className="text-[11px] font-semibold ml-auto flex-shrink-0" style={{ color: "var(--t-text-muted)" }}>
                    {d.value}
                    <span className="font-normal ml-0.5" style={{ color: "var(--t-text-dim)" }}>
                      ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}