import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { BarChart2, Dumbbell, Play, History, Sparkles, X, Timer, Home, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { api } from "../../utils/api";
import type { Routine } from "../types";
import { useWorkout } from "../context/WorkoutContext";

const ROUTINE_COLORS = [
  "#84cc16", "#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#f97316"
];

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200",
          isActive ? "text-[var(--t-accent-text)]" : "text-[var(--t-text-muted)] hover:text-[var(--muted-foreground)]"
        )
      }
    >
      <Icon size={20} strokeWidth={1.8} />
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </NavLink>
  );
}

export function AppLayout() {
  const [modalOpen, setModalOpen] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const workout = useWorkout();

  const isOnWorkoutPage = location.pathname.startsWith("/workout/");
  const showMiniBar = workout.isActive && !isOnWorkoutPage;

  const openModal = async () => {
    setModalOpen(true);
    setLoading(true);
    try {
      const data = await api.routines.list();
      setRoutines(data);
    } catch (err) {
      console.error("Failed to load routines:", err);
    } finally {
      setLoading(false);
    }
  };

  const startWorkout = (routineId: string) => {
    setModalOpen(false);
    navigate(`/workout/${routineId}`);
  };

  // Lock body scroll when modal open
  useEffect(() => {
    if (modalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  const completedSets = workout.exercises.flatMap(e => e.sets).length;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Main content */}
      <main
        className={cn(
          "flex-1 overflow-y-auto scrollbar-hide",
          showMiniBar ? "pb-[120px]" : "pb-20"
        )}
      >
        <Outlet />
      </main>

      {/* Active workout floating mini-bar (shown when navigating away from workout) */}
      <AnimatePresence>
        {showMiniBar && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={() => navigate(`/workout/${workout.routineId}`)}
            className="fixed left-3 right-3 z-[55] flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{
              bottom: 68,
              backgroundColor: 'var(--t-elevated)',
              borderColor: 'var(--t-cta-bg)',
              boxShadow: '0 -2px 20px rgba(0,0,0,0.15), 0 0 0 1px var(--t-cta-bg)',
            }}
          >
            {/* Pulsing dot */}
            <div className="relative flex-shrink-0">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: 'var(--t-cta-bg)' }}
              />
              <div
                className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-40"
                style={{ backgroundColor: 'var(--t-cta-bg)' }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold truncate">{workout.routineName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <Timer size={9} style={{ color: 'var(--t-text-muted)' }} />
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'var(--t-text-muted)' }}>
                    {fmt(workout.elapsed)}
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--t-text-dim)' }}>&middot;</span>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--t-text-muted)' }}>
                  {completedSets} sets
                </span>
              </div>
            </div>

            {/* Resume arrow */}
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl flex-shrink-0"
              style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
            >
              <span className="text-[10px] font-bold">Return</span>
              <ChevronRight size={12} />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom navigation — always visible */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-[60px] backdrop-blur-xl border-t z-50"
        style={{
          backgroundColor: 'var(--t-nav-bg)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center h-full max-w-lg mx-auto px-2 relative">
          {/* Left items */}
          <NavItem to="/" icon={Home} label="Dashboard" />
          <NavItem to="/routines" icon={Dumbbell} label="Routines" />

          {/* Center play button */}
          <div className="flex-1 flex justify-center items-center">
            <div className="relative -top-5">
              {workout.isActive ? (
                /* When workout is active, tapping the center button resumes it */
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => navigate(`/workout/${workout.routineId}`)}
                  className="w-[58px] h-[58px] rounded-full flex items-center justify-center transition-shadow relative"
                  style={{
                    backgroundColor: 'var(--t-cta-bg)',
                    color: 'var(--t-cta-fg)',
                    boxShadow: '0 4px 16px rgba(200, 255, 0, 0.3)',
                  }}
                >
                  <Play size={22} fill="currentColor" className="ml-0.5" />
                  {/* Active indicator dot */}
                  <div
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 animate-pulse"
                    style={{
                      backgroundColor: '#ef4444',
                      borderColor: 'var(--t-nav-bg)',
                    }}
                  />
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={openModal}
                  className="w-[58px] h-[58px] rounded-full flex items-center justify-center transition-shadow"
                  style={{
                    backgroundColor: 'var(--t-cta-bg)',
                    color: 'var(--t-cta-fg)',
                    boxShadow: '0 4px 16px rgba(200, 255, 0, 0.3)',
                  }}
                >
                  <Play size={22} fill="currentColor" className="ml-0.5" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Right items */}
          <NavItem to="/history" icon={History} label="History" />
          <NavItem to="/analytics" icon={BarChart2} label="Analytics" />
        </div>
      </nav>

      {/* Workout Selector Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-[60] backdrop-blur-sm"
              style={{ backgroundColor: 'var(--t-overlay)' }}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-[24px] border-t max-h-[80vh] flex flex-col"
              style={{
                backgroundColor: 'var(--t-elevated)',
                borderColor: 'var(--border)',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--t-handle)' }} />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Start Workout</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Choose a routine or start blank</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--t-glow-3)' }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Blank workout option */}
              <div className="px-5 mb-3">
                <button
                  onClick={() => startWorkout("new")}
                  className="w-full p-4 rounded-2xl flex items-center gap-3 transition-colors"
                  style={{
                    border: '1px solid var(--t-primary-border)',
                    backgroundColor: 'var(--t-primary-subtle)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--t-primary-muted)' }}
                  >
                    <Sparkles size={18} style={{ color: 'var(--t-accent-text)' }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: 'var(--t-accent-text)' }}>Blank Workout</p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Add exercises as you go</p>
                  </div>
                </button>
              </div>

              {/* Divider */}
              <div className="px-5 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--t-border-light)' }} />
                  <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>or from routine</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--t-border-light)' }} />
                </div>
              </div>

              {/* Routines list */}
              <div className="overflow-y-auto flex-1 px-5 pb-8 space-y-2 scrollbar-hide">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--t-glow-2)' }} />
                    ))}
                  </div>
                ) : routines.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>No routines yet.</p>
                    <button
                      onClick={() => { setModalOpen(false); navigate("/routines"); }}
                      className="mt-2 text-xs underline"
                      style={{ color: 'var(--t-accent-text)' }}
                    >
                      Create your first routine
                    </button>
                  </div>
                ) : (
                  routines.map((routine, idx) => (
                    <motion.button
                      key={routine.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startWorkout(routine.id)}
                      className="w-full p-4 rounded-2xl border flex items-center gap-3 transition-colors text-left"
                      style={{
                        backgroundColor: 'var(--muted)',
                        borderColor: 'var(--t-border-light)',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${ROUTINE_COLORS[idx % ROUTINE_COLORS.length]}20` }}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ROUTINE_COLORS[idx % ROUTINE_COLORS.length] }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">{routine.name}</p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {routine.exercises?.length || 0} exercises
                        </p>
                      </div>
                      <div style={{ color: 'var(--t-text-dim)' }}>
                        <Play size={14} fill="currentColor" />
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}