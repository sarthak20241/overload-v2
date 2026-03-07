import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Dumbbell, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Search, TrendingUp } from "lucide-react";
import {
  format, isToday, isYesterday, startOfMonth, endOfMonth, startOfWeek,
  addDays, isSameDay, isSameMonth, subMonths, addMonths, getDay
} from "date-fns";
import { api } from "../../../utils/api";
import type { WorkoutSession } from "../../types";
import { toast } from "sonner";

const ROUTINE_COLORS = ["#84cc16", "#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#f97316"];

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function getDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
}

function groupByMonth(sessions: WorkoutSession[]) {
  const groups: Record<string, WorkoutSession[]> = {};
  sessions.forEach(session => {
    const key = format(new Date(session.startTime), "MMMM yyyy");
    if (!groups[key]) groups[key] = [];
    groups[key].push(session);
  });
  return Object.entries(groups);
}

/* -- Workout Calendar -- */
function WorkoutCalendar({
  sessions,
  selectedDate,
  onSelectDate,
}: {
  sessions: WorkoutSession[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  // Build set of workout dates for quick lookup
  const workoutDates = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      set.add(format(new Date(s.startTime), "yyyy-MM-dd"));
    });
    return set;
  }, [sessions]);

  // Count workouts per day for intensity
  const workoutCounts = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach(s => {
      const key = format(new Date(s.startTime), "yyyy-MM-dd");
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [sessions]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  // Start grid from the Sunday before the first day of month
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });

  // Build 6 weeks of days (42 cells)
  const days: Date[] = [];
  let d = calStart;
  for (let i = 0; i < 42; i++) {
    days.push(d);
    d = addDays(d, 1);
  }

  const monthWorkouts = sessions.filter(s => isSameMonth(new Date(s.startTime), currentMonth)).length;

  const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div
      className="mx-5 mb-4 rounded-2xl border p-4 overflow-hidden"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--t-border-subtle)',
        boxShadow: 'var(--t-shadow-card)',
      }}
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--t-glow-2)' }}
        >
          <ChevronLeft size={16} style={{ color: 'var(--muted-foreground)' }} />
        </button>
        <div className="text-center">
          <h3 className="text-sm font-bold">{format(currentMonth, "MMMM yyyy")}</h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
            {monthWorkouts} workout{monthWorkouts !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {!isSameMonth(currentMonth, today) && (
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
              style={{ color: 'var(--t-accent-text)', backgroundColor: 'var(--t-primary-muted)' }}
            >
              Today
            </button>
          )}
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--t-glow-2)' }}
          >
            <ChevronRight size={16} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map((label, i) => (
          <div key={i} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--t-text-dim)' }}>
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, currentMonth);
          const hasWorkout = workoutDates.has(key);
          const count = workoutCounts[key] || 0;
          const isDayToday = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          // Intensity: brighter green for more workouts
          const intensity = count >= 3 ? 1 : count >= 2 ? 0.8 : count >= 1 ? 0.6 : 0;

          return (
            <button
              key={i}
              onClick={() => {
                if (!inMonth) return;
                if (isSelected) {
                  onSelectDate(null);
                } else {
                  onSelectDate(day);
                }
              }}
              className="aspect-square rounded-xl flex items-center justify-center text-xs font-semibold transition-all relative"
              style={{
                backgroundColor: !inMonth
                  ? 'transparent'
                  : hasWorkout
                    ? `rgba(132, 204, 22, ${intensity})`
                    : 'var(--t-glow-2)',
                color: !inMonth
                  ? 'var(--t-text-faint)'
                  : hasWorkout
                    ? intensity >= 0.8 ? '#0a0a0a' : '#365314'
                    : 'var(--t-text-secondary)',
                outline: isSelected
                  ? '2px solid var(--t-accent-text)'
                  : isDayToday && !hasWorkout
                    ? '1.5px solid var(--t-primary-border)'
                    : 'none',
                outlineOffset: '-1px',
                boxShadow: hasWorkout ? `0 0 8px rgba(132, 204, 22, ${intensity * 0.3})` : 'none',
                opacity: inMonth ? 1 : 0.3,
              }}
            >
              {format(day, "d")}
              {/* Multi-workout indicator */}
              {count >= 2 && inMonth && (
                <span
                  className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: count >= 3 ? '#facc15' : '#a3e635' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: 'var(--t-border-subtle)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--t-glow-2)' }} />
          <span className="text-[9px]" style={{ color: 'var(--t-text-dim)' }}>Rest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(132, 204, 22, 0.6)' }} />
          <span className="text-[9px]" style={{ color: 'var(--t-text-dim)' }}>Trained</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(132, 204, 22, 1)' }} />
          <span className="text-[9px]" style={{ color: 'var(--t-text-dim)' }}>Multiple</span>
        </div>
      </div>
    </div>
  );
}

/* -- Session Card -- */
function SessionCard({
  session,
  colorIdx,
  onDelete,
}: {
  session: WorkoutSession;
  colorIdx: number;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const color = ROUTINE_COLORS[colorIdx % ROUTINE_COLORS.length];

  return (
    <motion.div
      layout
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--t-border-subtle)',
        boxShadow: 'var(--t-shadow-card)',
      }}
    >
      {/* Card header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${color}15` }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{session.routineName}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>{getDateLabel(session.startTime)}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--t-text-secondary)' }}>
              <Clock size={10} />
              {formatDuration(session.durationSeconds)}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--t-text-secondary)' }}>
              <TrendingUp size={10} />
              {session.totalVolume ? `${session.totalVolume}kg` : "—"}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--t-text-secondary)' }}>
              <Dumbbell size={10} />
              {session.exercises?.length || 0} exercises
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {deleteConfirm ? (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--secondary)' }}
              >
                <X size={11} />
              </button>
              <button
                onClick={onDelete}
                className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center"
              >
                <Trash2 size={11} className="text-red-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--t-text-dim)' }}
            >
              <Trash2 size={13} />
            </button>
          )}
          {expanded
            ? <ChevronUp size={14} style={{ color: 'var(--t-text-muted)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--t-text-muted)' }} />
          }
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t"
            style={{ borderColor: 'var(--t-border-subtle)' }}
          >
            <div className="p-4 space-y-3">
              {session.exercises?.map((ex, i) => {
                const completedSets = ex.sets?.filter(s => s.completed) || [];
                if (completedSets.length === 0) return null;
                const maxWeight = Math.max(...completedSets.map(s => s.weight));
                return (
                  <div key={i} className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold">{ex.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {completedSets.map((set, si) => (
                          <span
                            key={si}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              color: 'var(--muted-foreground)',
                              backgroundColor: 'var(--secondary)',
                            }}
                          >
                            {set.weight}kg x {set.reps}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-xs font-bold" style={{ color: 'var(--t-accent-text)' }}>{maxWeight}kg</p>
                      <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>best</p>
                    </div>
                  </div>
                );
              })}
              {session.notes && (
                <div className="pt-2 border-t" style={{ borderColor: 'var(--t-border-subtle)' }}>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--t-text-muted)' }}>Notes</p>
                  <p className="text-xs italic" style={{ color: 'var(--muted-foreground)' }}>{session.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* -- Main -- */
export function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    api.sessions.list()
      .then(setSessions)
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.sessions.delete(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success("Session deleted");
    } catch {
      toast.error("Failed to delete session");
    }
  };

  // Filter by search and selected date
  const filtered = sessions.filter(s => {
    const matchSearch = !search ||
      s.routineName.toLowerCase().includes(search.toLowerCase()) ||
      s.exercises?.some(e => e.name.toLowerCase().includes(search.toLowerCase()));

    const matchDate = !selectedDate ||
      isSameDay(new Date(s.startTime), selectedDate);

    return matchSearch && matchDate;
  });

  const grouped = groupByMonth(filtered);
  const totalSessions = sessions.length;
  const totalVolume = sessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-black tracking-tight">History</h1>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>{totalSessions} workouts</span>
          <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>{Math.round(totalVolume / 1000)}t total volume</span>
        </div>
      </div>

      {/* Calendar */}
      {!loading && sessions.length > 0 && (
        <WorkoutCalendar
          sessions={sessions}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      {/* Active date filter indicator */}
      {selectedDate && (
        <div className="px-5 mb-3">
          <div
            className="flex items-center justify-between px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--t-primary-muted)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--t-accent-text)' }}>
              Showing: {format(selectedDate, "EEEE, MMM d, yyyy")}
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--t-accent-text)' }}
            >
              <X size={10} style={{ color: 'var(--t-cta-fg)' }} />
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {sessions.length > 0 && (
        <div className="px-5 mb-4">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 border"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--t-border-light)',
              boxShadow: 'var(--t-shadow-card)',
            }}
          >
            <Search size={14} style={{ color: 'var(--t-text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search workouts..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none"
              style={{ color: 'var(--foreground)' }}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X size={13} style={{ color: 'var(--t-text-muted)' }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sessions */}
      <div className="px-5 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--card)' }} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-20 text-center">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--card)' }}
            >
              <Clock size={24} style={{ color: 'var(--t-text-dim)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>No workouts logged yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--t-text-dim)' }}>Complete a workout to see it here</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
              {selectedDate
                ? `No workouts on ${format(selectedDate, "MMM d, yyyy")}`
                : `No results for "${search}"`}
            </p>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs font-semibold mt-2"
                style={{ color: 'var(--t-accent-text)' }}
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          grouped.map(([month, monthSessions]) => (
            <div key={month} className="mb-6">
              {/* Month header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>{month}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    color: 'var(--t-text-dim)',
                    backgroundColor: 'var(--card)',
                  }}
                >
                  {monthSessions.length}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--t-border-subtle)' }} />
              </div>
              <div className="space-y-3">
                {monthSessions.map((session, idx) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    colorIdx={idx}
                    onDelete={() => handleDelete(session.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
