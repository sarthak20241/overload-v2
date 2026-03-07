import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, BarChart2, Sparkles,
  ChevronDown, Loader2, Trophy, Clock, Target, Flame,
  Scale, Weight, Ruler, Calendar, Minus, X
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { api } from "../../../utils/api";
import type { WorkoutSession } from "../../types";
import { toast } from "sonner";
import { computeDashboardStats } from "../dashboard/DashboardWidgets";
import { BodyMeasurements } from "../../components/BodyMeasurements";
import {
  loadWeightLog, loadBodyFatLog, saveWeightLog, saveBodyFatLog,
  type WeightEntry, type BodyFatEntry,
} from "../profile/ProfilePage";

interface ExerciseProgress {
  date: string;
  weight: number;
  volume: number;
  reps: number;
}

function getExerciseProgress(sessions: WorkoutSession[], exerciseName: string): ExerciseProgress[] {
  const points: ExerciseProgress[] = [];
  sessions.slice().reverse().forEach(session => {
    const ex = session.exercises?.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
    if (ex && ex.sets?.some(s => s.completed)) {
      const completedSets = ex.sets.filter(s => s.completed);
      points.push({
        date: format(new Date(session.startTime), "MMM d"),
        weight: Math.max(...completedSets.map(s => s.weight)),
        volume: completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0),
        reps: Math.round(completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length),
      });
    }
  });
  return points;
}

function getAllExercises(sessions: WorkoutSession[]): string[] {
  const names = new Set<string>();
  sessions.forEach(s => s.exercises?.forEach(e => { if (e.sets?.some(set => set.completed)) names.add(e.name); }));
  return Array.from(names).sort();
}

function CompactTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold shadow-lg border"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--t-border-subtle)", color: "var(--foreground)" }}>
      <span style={{ color: "var(--t-text-muted)" }}>{label}: </span>
      {typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : payload[0].value}
      {unit && <span style={{ color: "var(--t-text-muted)" }}> {unit}</span>}
    </div>
  );
}

// ── Half-width Apple Health area card ─────────────────────────────────

function MiniAreaCard({ icon, label, value, suffix, color, data, dataKey, gradientId, loading }: {
  icon: React.ReactNode; label: string; value: string; suffix: string;
  color: string; data: any[]; dataKey: string; gradientId: string; loading: boolean;
}) {
  return (
    <motion.div whileTap={{ scale: 0.98 }} className="rounded-2xl border p-3 relative overflow-hidden"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--t-border-subtle)", boxShadow: "var(--t-shadow-card)" }}>
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ background: `radial-gradient(circle at 10% 10%, ${color}, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-1">
          <span style={{ color }}>{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</span>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-xl font-black tracking-tight">{loading ? "—" : value}</span>
          <span className="text-[9px] font-medium" style={{ color: "var(--t-text-muted)" }}>{suffix}</span>
        </div>
        {loading ? (
          <div className="h-[68px] rounded-lg animate-pulse" style={{ backgroundColor: "var(--t-glow-2)" }} />
        ) : data.every((d: any) => d[dataKey] === 0) ? (
          <div className="h-[68px] flex items-center justify-center">
            <span className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>No data</span>
          </div>
        ) : (
          <div className="h-[68px] -mx-1 -mb-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="60%" stopColor={color} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey={data[0] && "day" in data[0] ? "day" : "week"} hide />
                <YAxis hide />
                <Tooltip content={<CompactTooltip unit={label === "Duration" ? "min" : "kg"} />} />
                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 3, fill: color, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Half-width stat card ──────────────────────────────────────────────

function StatMiniCard({ icon, label, value, suffix, color, progress, target, loading }: {
  icon: React.ReactNode; label: string; value: number; suffix: string;
  color: string; progress: number; target: string; loading: boolean;
}) {
  return (
    <motion.div whileTap={{ scale: 0.98 }} className="rounded-2xl border p-3 relative overflow-hidden"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--t-border-subtle)", boxShadow: "var(--t-shadow-card)" }}>
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ background: `radial-gradient(circle at 10% 10%, ${color}, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2">
          <span style={{ color }}>{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</span>
        </div>
        {loading ? (
          <div className="h-8 w-16 rounded-lg animate-pulse" style={{ backgroundColor: "var(--t-glow-2)" }} />
        ) : (
          <>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-black tracking-tight">{value}</span>
              <span className="text-[10px] font-medium" style={{ color: "var(--t-text-muted)" }}>{suffix}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${color}15` }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
            </div>
            <span className="text-[8px] mt-0.5 block" style={{ color: "var(--t-text-dim)" }}>{target}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Weight Trend Card with embedded history ───────────────────────────

function WeightTrendCard({ weightLog, setWeightLog, goalWeight, unit }: {
  weightLog: WeightEntry[]; setWeightLog: (l: WeightEntry[]) => void; goalWeight: number | null; unit: string;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const chartData = useMemo(() =>
    weightLog.map(e => ({ date: format(new Date(e.date), "MMM d"), weight: e.weight, fullDate: e.date })),
    [weightLog]
  );
  if (chartData.length === 0) return null;

  const latest = chartData[chartData.length - 1].weight;
  const first = chartData[0].weight;
  const diff = chartData.length >= 2 ? latest - first : 0;
  const hasChart = chartData.length >= 2;

  return (
    <>
      <div className="rounded-2xl border p-4 relative overflow-hidden"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--t-border-subtle)", boxShadow: "var(--t-shadow-card)" }}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 10%, #10b981, transparent 70%)" }} />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Weight size={14} style={{ color: "#10b981" }} />
              <h3 className="text-sm font-bold">Weight Trend</h3>
            </div>
            <div className="flex items-center gap-2">
              {diff !== 0 && (
                <span className={`text-[10px] font-bold ${diff > 0 ? "text-[#ef4444]" : "text-[#10b981]"}`}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)} {unit}
                </span>
              )}
              <span className="text-sm font-black">{latest} <span className="text-[10px] font-medium opacity-50">{unit}</span></span>
            </div>
          </div>

          {hasChart ? (
            <div className="h-[120px] mt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border-subtle)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "var(--t-text-dim)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--t-text-dim)", fontSize: 9 }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
                  <Tooltip content={<CompactTooltip unit={unit} />} />
                  {goalWeight && (
                    <ReferenceLine y={goalWeight} stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={1.5}
                      label={{ value: `Goal: ${goalWeight}`, position: "right", fill: "#f59e0b", fontSize: 9 }} />
                  )}
                  <Area type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2.5}
                    fill="url(#weightGrad)" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#10b981" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-2xl font-black" style={{ color: "var(--t-accent-text)" }}>{latest} {unit}</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--t-text-dim)" }}>Log more to see a trend</p>
            </div>
          )}
        </div>

        {/* Show history — inside the card */}
        <button onClick={() => setShowHistory(true)}
          className="flex items-center gap-1.5 text-[10px] font-semibold w-full justify-center py-2.5 border-t mt-2"
          style={{ color: "var(--t-accent-text)", borderColor: "var(--t-border-subtle)" }}>
          <Calendar size={10} />
          Show history ({weightLog.length})
        </button>
      </div>

      {/* History bottom drawer */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowHistory(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-t-3xl overflow-hidden max-h-[70vh] flex flex-col"
              style={{ backgroundColor: "var(--card)", borderTop: "1px solid var(--t-border-subtle)" }}>
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--t-text-faint)" }} />
              </div>
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#10b98115" }}>
                    <Weight size={16} className="text-[#10b981]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Weight History</h2>
                    <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{weightLog.length} entries logged</p>
                  </div>
                </div>
                <button onClick={() => setShowHistory(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--t-glow-2)" }}>
                  <X size={16} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2 scrollbar-hide">
                {[...weightLog].reverse().map((entry, i) => {
                  const prev = i < weightLog.length - 1 ? [...weightLog].reverse()[i + 1] : null;
                  const d = prev ? entry.weight - prev.weight : 0;
                  return (
                    <div key={entry.date} className="flex items-center justify-between py-3 px-4 rounded-2xl border"
                      style={{ backgroundColor: "var(--t-glow-1)", borderColor: "var(--t-border-subtle)" }}>
                      <span className="text-xs font-medium" style={{ color: "var(--t-text-secondary)" }}>
                        {format(new Date(entry.date), "MMM d, yyyy")}
                      </span>
                      <div className="flex items-center gap-3">
                        {d !== 0 && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d > 0 ? "text-[#ef4444] bg-[#ef444410]" : "text-[#10b981] bg-[#10b98110]"}`}>
                            {d > 0 ? "+" : ""}{d.toFixed(1)}
                          </span>
                        )}
                        <span className="text-sm font-black">{entry.weight} <span className="text-[10px] font-medium opacity-50">{unit}</span></span>
                        <button onClick={() => { const upd = weightLog.filter(e => e.date !== entry.date); setWeightLog(upd); saveWeightLog(upd); }}
                          className="w-6 h-6 rounded-full flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: "var(--t-glow-2)" }}>
                          <Minus size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Body Fat Trend Card with embedded history ─────────────────────────

function BodyFatTrendCard({ bodyFatLog, setBodyFatLog }: { bodyFatLog: BodyFatEntry[]; setBodyFatLog: (l: BodyFatEntry[]) => void }) {
  const [showHistory, setShowHistory] = useState(false);
  const chartData = useMemo(() =>
    bodyFatLog.map(e => ({ date: format(new Date(e.date), "MMM d"), bodyFat: e.bodyFat, fullDate: e.date })),
    [bodyFatLog]
  );
  if (chartData.length === 0) return null;

  const latest = chartData[chartData.length - 1].bodyFat;
  const first = chartData[0].bodyFat;
  const diff = chartData.length >= 2 ? latest - first : 0;
  const hasChart = chartData.length >= 2;

  return (
    <>
      <div className="rounded-2xl border p-4 relative overflow-hidden"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--t-border-subtle)", boxShadow: "var(--t-shadow-card)" }}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 10%, #ef4444, transparent 70%)" }} />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Scale size={14} style={{ color: "#ef4444" }} />
              <h3 className="text-sm font-bold">Body Fat %</h3>
            </div>
            <div className="flex items-center gap-2">
              {diff !== 0 && (
                <span className={`text-[10px] font-bold ${diff > 0 ? "text-[#ef4444]" : "text-[#10b981]"}`}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                </span>
              )}
              <span className="text-sm font-black">{latest}<span className="text-[10px] font-medium opacity-50">%</span></span>
            </div>
          </div>

          {hasChart ? (
            <div className="h-[120px] mt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border-subtle)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "var(--t-text-dim)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--t-text-dim)", fontSize: 9 }} axisLine={false} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip content={<CompactTooltip unit="%" />} />
                  <Area type="monotone" dataKey="bodyFat" stroke="#ef4444" strokeWidth={2.5}
                    fill="url(#bfGrad)" dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#ef4444" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-2xl font-black" style={{ color: "var(--t-accent-text)" }}>{latest}%</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--t-text-dim)" }}>Log more to see a trend</p>
            </div>
          )}
        </div>

        {/* Show history — inside the card */}
        <button onClick={() => setShowHistory(true)}
          className="flex items-center gap-1.5 text-[10px] font-semibold w-full justify-center py-2.5 border-t mt-2"
          style={{ color: "var(--t-accent-text)", borderColor: "var(--t-border-subtle)" }}>
          <Calendar size={10} />
          Show history ({bodyFatLog.length})
        </button>
      </div>

      {/* History bottom drawer */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowHistory(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-t-3xl overflow-hidden max-h-[70vh] flex flex-col"
              style={{ backgroundColor: "var(--card)", borderTop: "1px solid var(--t-border-subtle)" }}>
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--t-text-faint)" }} />
              </div>
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#ef444415" }}>
                    <Scale size={16} className="text-[#ef4444]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Body Fat History</h2>
                    <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{bodyFatLog.length} entries logged</p>
                  </div>
                </div>
                <button onClick={() => setShowHistory(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--t-glow-2)" }}>
                  <X size={16} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2 scrollbar-hide">
                {[...bodyFatLog].reverse().map((entry, i) => {
                  const prev = i < bodyFatLog.length - 1 ? [...bodyFatLog].reverse()[i + 1] : null;
                  const d = prev ? entry.bodyFat - prev.bodyFat : 0;
                  return (
                    <div key={entry.date} className="flex items-center justify-between py-3 px-4 rounded-2xl border"
                      style={{ backgroundColor: "var(--t-glow-1)", borderColor: "var(--t-border-subtle)" }}>
                      <span className="text-xs font-medium" style={{ color: "var(--t-text-secondary)" }}>
                        {format(new Date(entry.date), "MMM d, yyyy")}
                      </span>
                      <div className="flex items-center gap-3">
                        {d !== 0 && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d > 0 ? "text-[#ef4444] bg-[#ef444410]" : "text-[#10b981] bg-[#10b98110]"}`}>
                            {d > 0 ? "+" : ""}{d.toFixed(1)}%
                          </span>
                        )}
                        <span className="text-sm font-black">{entry.bodyFat}<span className="text-[10px] font-medium opacity-50">%</span></span>
                        <button onClick={() => { const upd = bodyFatLog.filter(e => e.date !== entry.date); setBodyFatLog(upd); saveBodyFatLog(upd); }}
                          className="w-6 h-6 rounded-full flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: "var(--t-glow-2)" }}>
                          <Minus size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [chartMode, setChartMode] = useState<"weight" | "volume">("weight");
  const [aiInsights, setAiInsights] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  const [bodyFatLog, setBodyFatLog] = useState<BodyFatEntry[]>([]);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState("kg");

  useEffect(() => {
    api.sessions.list()
      .then(data => {
        setSessions(data);
        const exercises = getAllExercises(data);
        if (exercises.length > 0) setSelectedExercise(exercises[0]);
      })
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));

    setWeightLog(loadWeightLog());
    setBodyFatLog(loadBodyFatLog());
    try {
      const raw = localStorage.getItem("overload_basic_info");
      if (raw) {
        const info = JSON.parse(raw);
        const gw = parseFloat(info.goalWeight);
        if (!isNaN(gw) && gw > 0) setGoalWeight(gw);
        if (info.weightUnit) setWeightUnit(info.weightUnit);
      }
    } catch {}
  }, []);

  const exercises = getAllExercises(sessions);
  const progressData = selectedExercise ? getExerciseProgress(sessions, selectedExercise) : [];
  const stats = computeDashboardStats(sessions);
  const pr = progressData.length > 0 ? Math.max(...progressData.map(p => p.weight)) : null;

  const fetchInsights = async () => {
    setAiLoading(true); setShowInsights(true);
    try { const insights = await api.ai.getCoachingInsights(sessions.slice(0, 10)); setAiInsights(insights); }
    catch (err: any) { toast.error(err.message || "AI insights unavailable"); setShowInsights(false); }
    finally { setAiLoading(false); }
  };

  const insightLines = aiInsights.split("\n").filter(l => l.trim().startsWith("\u2022")).map(l => l.replace("\u2022", "").trim());
  const neonColor = getComputedStyle(document.documentElement).getPropertyValue('--t-neon').trim() || '#c8ff00';
  const avgDurationMin = stats.avgDuration > 0 ? Math.floor(stats.avgDuration / 60) : 0;
  const latestVolume = stats.weeklyTrend.length > 0 ? stats.weeklyTrend[stats.weeklyTrend.length - 1].volume : 0;
  const formattedVolume = latestVolume >= 1000 ? `${(latestVolume / 1000).toFixed(1)}k` : String(latestVolume);

  const hasAnyData = sessions.length > 0 || weightLog.length > 0 || bodyFatLog.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-black tracking-tight">Analytics</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>Track your progress over time</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--t-neon)' }} />
        </div>
      ) : !hasAnyData ? (
        <div className="px-5 py-20 text-center">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--card)' }}>
            <BarChart2 size={24} style={{ color: 'var(--t-text-dim)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>No data yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--t-text-dim)' }}>Complete workouts or log body stats to see analytics</p>
        </div>
      ) : (
        <div className="px-5 pb-8 space-y-4">
          {/* 1. AI Coaching Insights */}
          {sessions.length > 0 && (
            <div className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--t-border-subtle)', boxShadow: 'var(--t-shadow-card)' }}>
              <button onClick={showInsights ? () => setShowInsights(false) : fetchInsights} disabled={aiLoading}
                className="w-full flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--t-primary-muted)' }}>
                    <Sparkles size={15} style={{ color: 'var(--t-neon)' }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">AI Coaching Insights</p>
                    <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>Powered by Gemini</p>
                  </div>
                </div>
                {aiLoading
                  ? <Loader2 size={15} className="animate-spin" style={{ color: 'var(--t-neon)' }} />
                  : <span className="text-xs font-semibold" style={{ color: 'var(--t-accent-text)' }}>{showInsights ? "Hide" : "Analyze"}</span>}
              </button>
              <AnimatePresence>
                {showInsights && !aiLoading && insightLines.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 border-t pt-3 space-y-3" style={{ borderColor: 'var(--t-border-subtle)' }}>
                      {insightLines.map((line, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--t-primary-muted)' }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--t-neon)' }} />
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--t-chart-insight-text)' }}>{line}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {showInsights && aiLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 border-t pt-4" style={{ borderColor: 'var(--t-border-subtle)' }}>
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map(i => (<div key={i} className="h-4 rounded animate-pulse" style={{ width: `${70 + i * 7}%`, backgroundColor: 'var(--t-glow-2)' }} />))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 2. Volume + Duration */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <MiniAreaCard icon={<TrendingUp size={12} />} label="Volume" value={formattedVolume} suffix="kg" color="#06b6d4"
                data={stats.weeklyTrend} dataKey="volume" gradientId="analyticsVolGrad" loading={loading} />
              <MiniAreaCard icon={<Clock size={12} />} label="Duration" value={`${avgDurationMin}`} suffix="min avg" color="#a855f7"
                data={stats.dailyDuration} dataKey="minutes" gradientId="analyticsDurGrad" loading={loading} />
            </div>
          )}

          {/* 3. Sets + Reps */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <StatMiniCard icon={<Target size={12} />} label="Sets" value={stats.totalSets} suffix="this week"
                color="#10b981" progress={stats.totalSets / 50} target="Target: 50/week" loading={loading} />
              <StatMiniCard icon={<Flame size={12} />} label="Reps" value={stats.totalReps} suffix="this week"
                color="#f59e0b" progress={stats.totalReps / 500} target="Target: 500/week" loading={loading} />
            </div>
          )}

          {/* 4. Exercise Progress */}
          {exercises.length > 0 && (
            <div className="rounded-2xl border p-4 relative overflow-hidden"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--t-border-subtle)', boxShadow: 'var(--t-shadow-card)' }}>
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{ background: `radial-gradient(circle at 10% 10%, ${neonColor}, transparent 70%)` }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} style={{ color: neonColor }} />
                    <h3 className="text-sm font-bold">Exercise Progress</h3>
                  </div>
                  {pr && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--t-primary-muted)' }}>
                      <Trophy size={11} style={{ color: neonColor }} />
                      <span className="text-[10px] font-bold" style={{ color: 'var(--t-accent-text)' }}>PR: {pr}kg</span>
                    </div>
                  )}
                </div>
                <div className="relative mb-3">
                  <button onClick={() => setExercisePickerOpen(!exercisePickerOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm w-full justify-between"
                    style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}>
                    <span className="truncate text-left">{selectedExercise || "Select"}</span>
                    <ChevronDown size={13} style={{ color: 'var(--t-text-muted)' }} className="flex-shrink-0" />
                  </button>
                  <AnimatePresence>
                    {exercisePickerOpen && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="absolute z-10 top-full mt-1 left-0 right-0 border rounded-2xl overflow-hidden max-h-48 overflow-y-auto scrollbar-hide"
                        style={{ backgroundColor: 'var(--secondary)', borderColor: 'var(--border)', boxShadow: 'var(--t-shadow-elevated)' }}>
                        {exercises.map(ex => (
                          <button key={ex} onClick={() => { setSelectedExercise(ex); setExercisePickerOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm"
                            style={{ color: ex === selectedExercise ? 'var(--t-accent-text)' : 'var(--foreground)', fontWeight: ex === selectedExercise ? 600 : 400 }}>
                            {ex}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex rounded-xl p-1 mb-3 w-fit" style={{ backgroundColor: 'var(--muted)' }}>
                  {(["weight", "volume"] as const).map(mode => (
                    <button key={mode} onClick={() => setChartMode(mode)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ backgroundColor: chartMode === mode ? 'var(--t-cta-bg)' : 'transparent', color: chartMode === mode ? 'var(--t-cta-fg)' : 'var(--t-text-secondary)' }}>
                      {mode === "weight" ? "Max Weight" : "Volume"}
                    </button>
                  ))}
                </div>
                {progressData.length === 0 ? (
                  <div className="py-6 text-center"><p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>No data for {selectedExercise}</p></div>
                ) : progressData.length === 1 ? (
                  <div className="py-6 text-center">
                    <p className="text-2xl font-black" style={{ color: 'var(--t-accent-text)' }}>{progressData[0].weight}kg</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--t-text-dim)' }}>Log more to see a trend</p>
                  </div>
                ) : (
                  <div className="h-[140px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={progressData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="exerciseProgressGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={neonColor} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={neonColor} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border-subtle)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: "var(--t-text-dim)", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "var(--t-text-dim)", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CompactTooltip unit="kg" />} />
                        <Area type="monotone" dataKey={chartMode} stroke={neonColor} strokeWidth={2.5}
                          fill="url(#exerciseProgressGrad)" dot={{ r: 3, fill: neonColor, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: neonColor }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Weight Trend */}
          <WeightTrendCard weightLog={weightLog} setWeightLog={setWeightLog} goalWeight={goalWeight} unit={weightUnit} />

          {/* 6. Body Fat Trend */}
          <BodyFatTrendCard bodyFatLog={bodyFatLog} setBodyFatLog={setBodyFatLog} />

          {/* 7. Body Measurements */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span style={{ color: 'var(--t-text-muted)' }}><Ruler size={12} /></span>
              <h2 className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--t-text-muted)' }}>Body Measurements</h2>
            </div>
            <BodyMeasurements />
          </div>

          {/* 8. Personal Records */}
          {exercises.length > 0 && (
            <div className="rounded-2xl border p-4 relative overflow-hidden"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--t-border-subtle)', boxShadow: 'var(--t-shadow-card)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={14} className="text-[#f59e0b]" />
                <h3 className="text-sm font-bold">Personal Records</h3>
              </div>
              <div className="space-y-1">
                {exercises.slice(0, 6).map(exName => {
                  const data = getExerciseProgress(sessions, exName);
                  const maxWeight = data.length > 0 ? Math.max(...data.map(d => d.weight)) : 0;
                  const trend = data.length >= 2 ? data[data.length - 1].weight - data[data.length - 2].weight : 0;
                  if (maxWeight === 0) return null;
                  return (
                    <div key={exName} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--t-border-subtle)' }}>
                      <span className="text-xs truncate flex-1" style={{ color: 'var(--t-chart-insight-text)' }}>{exName}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {trend > 0 && <span className="text-[10px] text-[#10b981]">+{trend}kg</span>}
                        {trend < 0 && <span className="text-[10px] text-[#ff4444]">{trend}kg</span>}
                        <span className="text-sm font-black" style={{ color: 'var(--t-accent-text)' }}>{maxWeight}kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}