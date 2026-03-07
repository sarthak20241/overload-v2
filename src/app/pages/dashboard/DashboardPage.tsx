import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Play, Flame, TrendingUp, Clock, Dumbbell,
  Settings, ChevronRight, LogOut, Trash2, Scale, UserCircle
} from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, subDays, differenceInCalendarDays } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { useWorkout } from "../../context/WorkoutContext";
import { api } from "../../../utils/api";
import type { WorkoutSession } from "../../types";
import { toast } from "sonner";
import {
  computeDashboardStats,
  WeeklyTrendWidget,
  MuscleSplitWidget,
  StatCard,
} from "./DashboardWidgets";
import { useXP } from "../../context/XPContext";

const ROUTINE_COLORS = ["#84cc16", "#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#f97316"];

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, signOut, deleteAccount } = useAuth();
  const { level, titleColor, progress, xpInCurrentLevel, xpNeededForNext } = useXP();
  const { isActive: workoutActive, routineId: activeRoutineId } = useWorkout();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    api.sessions.list()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = computeDashboardStats(sessions);
  const recentSessions = sessions.slice(0, 5);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const greetingHour = now.getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";
  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Athlete";

  // Get theme-aware neon color for widgets
  const neonColor = getComputedStyle(document.documentElement).getPropertyValue('--t-neon').trim() || '#c8ff00';

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--t-text-dim)' }}>{greeting}</p>
            
            {/* Name + XP as one unified element */}
            <div className="max-w-[200px]">
              <h1 className="text-lg font-black tracking-tight truncate mb-[-2px] ml-0.5">{userName}</h1>
              <div className="flex items-center gap-0">
                {/* Level circle — sits flush on the left edge of the bar */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 relative z-10"
                  style={{
                    background: `linear-gradient(135deg, ${titleColor}, ${titleColor}cc)`,
                    boxShadow: `0 0 10px ${titleColor}35`,
                  }}
                >
                  <span className="text-[10px] font-black text-white">{level}</span>
                </div>

                {/* Bar — overlaps behind the circle slightly */}
                <div className="flex-1 min-w-0" style={{ marginLeft: '-4px' }}>
                  <div
                    className="h-2 rounded-r-full overflow-hidden"
                    style={{
                      backgroundColor: `${titleColor}12`,
                      boxShadow: `inset 0 1px 2px rgba(0,0,0,0.2)`,
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-r-full relative"
                      style={{
                        background: `linear-gradient(90deg, ${titleColor}dd, ${titleColor})`,
                        boxShadow: `0 0 6px ${titleColor}40`,
                      }}
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-[40%] rounded-r-full opacity-30"
                        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.6), transparent)' }}
                      />
                    </motion.div>
                  </div>
                </div>

                <span className="text-[8px] font-bold ml-1.5 flex-shrink-0 tabular-nums" style={{ color: 'var(--t-text-dim)' }}>
                  {xpInCurrentLevel}/{xpNeededForNext}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0 ml-3 mt-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(workoutActive ? `/workout/${activeRoutineId}` : "/workout/new")}
              className="h-10 px-4 rounded-full flex items-center gap-2"
              style={{
                backgroundColor: 'var(--t-cta-bg)',
                color: 'var(--t-cta-fg)',
              }}
            >
              <Dumbbell size={16} />
              <span className="text-sm font-semibold">Start</span>
            </motion.button>
            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black relative"
              style={{
                backgroundColor: 'var(--t-circle-bg)',
                color: 'var(--t-circle-fg)',
                boxShadow: 'var(--t-circle-shadow)',
                border: 'var(--t-circle-border)',
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* This Week - ring row */}
      <div className="px-5 mb-5">
        <div className="flex justify-between">
          {weekDays.map((day, i) => {
            const hasWorkout = sessions.some(s => isSameDay(new Date(s.startTime), day));
            const isToday = isSameDay(day, now);
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isToday ? 'var(--t-accent-text)' : 'var(--t-text-muted)' }}
                >
                  {format(day, "EEE")[0]}
                </span>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: hasWorkout
                      ? 'var(--primary)'
                      : isToday
                      ? 'var(--t-primary-subtle)'
                      : 'var(--muted)',
                    border: isToday && !hasWorkout ? '1px solid var(--t-primary-border)' : 'none',
                    boxShadow: hasWorkout ? '0 0 10px var(--t-primary-glow)' : 'none',
                  }}
                >
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: hasWorkout
                        ? 'var(--primary-foreground)'
                        : isToday
                        ? 'var(--t-accent-text)'
                        : 'var(--t-text-muted)',
                    }}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Dumbbell size={12} />}
            label="Workouts"
            value={stats.weeklyCount}
            suffix="this week"
            color="#84cc16"
            loading={loading}
          />
          <StatCard
            icon={<Flame size={12} />}
            label="Streak"
            value={stats.streak}
            suffix={stats.streak === 1 ? "day" : "days"}
            color="#f97316"
            sub={stats.streak === 0 ? "Start today!" : stats.streak >= 7 ? "On fire!" : "Keep going!"}
            loading={loading}
          />
          <WeeklyTrendWidget
            data={stats.weeklyTrend}
            loading={loading}
          />
          <MuscleSplitWidget
            data={stats.muscleSplit}
            loading={loading}
          />
          <StatCard
            icon={<Clock size={12} />}
            label="Avg Duration"
            value={stats.avgDuration > 0 ? `${Math.floor(stats.avgDuration / 60)}` : "0"}
            suffix="min"
            color="#a855f7"
            sub="per workout"
            loading={loading}
          />
          <StatCard
            icon={<Dumbbell size={12} />}
            label="Sets"
            value={stats.totalSets}
            suffix="sets"
            color="#10b981"
            sub={`${stats.totalReps} reps total`}
            loading={loading}
          />
        </div>
      </div>

      {/* Recent sessions */}
      <div className="px-5 pb-6">
        <div
          className="rounded-2xl border p-4 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--t-border-subtle)',
            boxShadow: 'var(--t-shadow-card)',
          }}
        >
          {/* Subtle glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 10% 10%, var(--t-accent-text), transparent 70%)",
              opacity: 0.04,
            }}
          />

          {/* Widget header */}
          <div className="flex items-center justify-between mb-4 relative">
            <div className="flex items-center gap-1.5">
              <Clock size={14} style={{ color: 'var(--t-accent-text)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--t-accent-text)' }}>Recent Workouts</span>
            </div>
            {sessions.length > 0 && (
              <button
                onClick={() => navigate("/history")}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--t-primary-muted)' }}
              >
                <ChevronRight size={12} style={{ color: 'var(--t-accent-text)' }} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3 relative">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--t-glow-1)' }} />
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="py-8 text-center relative">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: 'var(--t-glow-1)' }}
              >
                <Dumbbell size={22} style={{ color: 'var(--t-text-dim)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>No workouts yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--t-text-dim)' }}>Complete your first session to see it here</p>
            </div>
          ) : (
            <div className="space-y-2 relative">
              {recentSessions.map((session, idx) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-3 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--t-glow-1)',
                    borderColor: 'var(--t-border-subtle)',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${ROUTINE_COLORS[idx % ROUTINE_COLORS.length]}15` }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ROUTINE_COLORS[idx % ROUTINE_COLORS.length] }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{session.routineName}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
                          {format(new Date(session.startTime), "EEE, MMM d")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs flex items-center gap-1 justify-end" style={{ color: 'var(--muted-foreground)' }}>
                        <Clock size={10} /> {formatDuration(session.durationSeconds)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
                        {session.totalVolume ? `${session.totalVolume}kg` : "—"}
                      </p>
                    </div>
                  </div>
                  {session.exercises?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {session.exercises.slice(0, 3).map((ex, ei) => (
                        <span
                          key={ei}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            color: 'var(--t-text-secondary)',
                            backgroundColor: 'var(--muted)',
                          }}
                        >
                          {ex.name}
                        </span>
                      ))}
                      {session.exercises.length > 3 && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            color: 'var(--t-text-dim)',
                            backgroundColor: 'var(--muted)',
                          }}
                        >
                          +{session.exercises.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings overlay */}
      {settingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 backdrop-blur-sm"
          style={{ backgroundColor: 'var(--t-overlay)' }}
          onClick={() => setSettingsOpen(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            onClick={e => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 rounded-t-[24px] border-t p-6 pb-10"
            style={{
              backgroundColor: 'var(--t-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: 'var(--t-handle)' }} />
            <h2 className="text-lg font-bold mb-1">Profile</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--t-text-muted)' }}>
              {user?.email || "Guest user"}
            </p>

            <div className="space-y-2">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 p-4 rounded-2xl transition-colors"
                style={{ backgroundColor: 'var(--muted)' }}
              >
                <LogOut size={16} style={{ color: 'var(--muted-foreground)' }} />
                <span className="text-sm">Sign Out</span>
              </button>

              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/15 transition-colors"
                >
                  <Trash2 size={16} className="text-red-400" />
                  <span className="text-sm text-red-400">Delete Account</span>
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400 mb-3">
                    This will permanently delete your account and all data. Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ backgroundColor: 'var(--muted)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}