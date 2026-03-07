import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Check, Plus, Timer, Play,
  SkipForward, Dumbbell, Loader2, AlertTriangle,
  ChevronLeft, ChevronRight, Trash2
} from "lucide-react";
import { api } from "../../../utils/api";
import type { WorkoutSession, SessionExercise } from "../../types";
import { toast } from "sonner";
import { useXP } from "../../context/XPContext";
import { useWorkout, type ActiveExercise, type PrevPerformance } from "../../context/WorkoutContext";

/* ── Exercise Library ─────────────────────────────────────────────────────── */
const EXERCISE_LIBRARY = [
  { name: "Bench Press", muscleGroup: "Chest" },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest" },
  { name: "Deadlift", muscleGroup: "Back" },
  { name: "Barbell Row", muscleGroup: "Back" },
  { name: "Pull-up", muscleGroup: "Back" },
  { name: "Lat Pulldown", muscleGroup: "Back" },
  { name: "Overhead Press", muscleGroup: "Shoulders" },
  { name: "Lateral Raise", muscleGroup: "Shoulders" },
  { name: "Squat", muscleGroup: "Legs" },
  { name: "Romanian Deadlift", muscleGroup: "Legs" },
  { name: "Leg Press", muscleGroup: "Legs" },
  { name: "Dumbbell Curl", muscleGroup: "Arms" },
  { name: "Tricep Pushdown", muscleGroup: "Arms" },
  { name: "Hip Thrust", muscleGroup: "Glutes" },
  { name: "Plank", muscleGroup: "Core" },
  { name: "Cable Fly", muscleGroup: "Chest" },
  { name: "Face Pull", muscleGroup: "Shoulders" },
  { name: "Leg Curl", muscleGroup: "Legs" },
  { name: "Calf Raise", muscleGroup: "Legs" },
];

const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Glutes", "Core", "Cardio", "Other"];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Component ────────────────────────────────────────────────────────────── */
export function ActiveWorkoutPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const navigate = useNavigate();
  const { awardWorkoutXP } = useXP();
  const workout = useWorkout();

  /* Pull persistent state from context */
  const {
    isActive, routineName, exercises, startTime, currentIdx, workoutNotes, prevPerf, elapsed,
    beginWorkout, cancelWorkout, clearWorkout, setExercises, setCurrentIdx, setWorkoutNotes,
  } = workout;

  /* local UI state */
  const [loading, setLoading] = useState(!isActive);
  const [saving, setSaving] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [slideDir, setSlideDir] = useState<1 | -1>(1);

  /* custom exercise form state */
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState("Other");
  const [customSets, setCustomSets] = useState(3);
  const [customReps, setCustomReps] = useState("8-12");
  const [customRest, setCustomRest] = useState(90);

  /* input state for current set being logged */
  const [inputWeight, setInputWeight] = useState(0);
  const [inputReps, setInputReps] = useState(10);

  /* timers */
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [restTimer, setRestTimer] = useState(0);

  const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exerciseStartRef = useRef<number | null>(null);
  const lastSetTimeRef = useRef<number | null>(null);

  /* ── Exercise timer ────────────────────────────────────────────────────── */
  const startExerciseTimer = useCallback(() => {
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    exerciseStartRef.current = Date.now();
    setExerciseTimer(0);
    exerciseTimerRef.current = setInterval(() => {
      if (exerciseStartRef.current) {
        setExerciseTimer(Math.floor((Date.now() - exerciseStartRef.current) / 1000));
      }
    }, 1000);
  }, []);

  const stopExerciseTimer = useCallback(() => {
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    exerciseTimerRef.current = null;
    exerciseStartRef.current = null;
  }, []);

  /* ── Rest timer (counts up from last logged set) ───────────────────────── */
  const startRestTimer = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    lastSetTimeRef.current = Date.now();
    setRestTimer(0);
    restTimerRef.current = setInterval(() => {
      if (lastSetTimeRef.current) {
        setRestTimer(Math.floor((Date.now() - lastSetTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  const stopRestTimer = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = null;
    lastSetTimeRef.current = null;
    setRestTimer(0);
  }, []);

  /* ── Load routine (only if no active workout) ──────────────────────────── */
  useEffect(() => {
    // If workout is already active (returning to this page), skip loading
    if (isActive) {
      setLoading(false);
      return;
    }

    const load = async () => {
      if (routineId === "new") {
        beginWorkout("new", "New Workout", [], {});
        setLoading(false);
        return;
      }
      try {
        const [routines, sessions] = await Promise.all([
          api.routines.list(),
          api.sessions.list(),
        ]);
        const routine = routines.find(r => r.id === routineId);
        if (!routine) { toast.error("Routine not found"); navigate(-1); return; }

        // Build previous performance map
        const prevSession = sessions.find(s => s.routineId === routineId);
        const perfMap: PrevPerformance = {};
        if (prevSession) {
          prevSession.exercises.forEach(ex => {
            perfMap[ex.name] = ex.sets.map(s => ({ weight: s.weight, reps: s.reps }));
          });
        }

        const activeExercises: ActiveExercise[] = routine.exercises.map(ex => {
          return {
            exerciseId: ex.id,
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            restSeconds: ex.restSeconds,
            sets: [],
            notes: ex.notes || "",
            started: false,
            finished: false,
          };
        });

        beginWorkout(routineId!, routine.name, activeExercises, perfMap);

        // Set initial input from first exercise's prev performance
        if (activeExercises.length > 0) {
          const firstPrev = perfMap[activeExercises[0].name];
          setInputWeight(firstPrev?.[0]?.weight ?? 0);
          setInputReps(firstPrev?.[0]?.reps ?? (parseInt(activeExercises[0].targetReps) || 10));
        }
      } catch (err) {
        console.error("Failed to load routine:", err);
        toast.error("Failed to load routine");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [routineId]);

  /* ── Sync input defaults when switching exercises ──────────────────────── */
  const currentEx = exercises[currentIdx];
  useEffect(() => {
    if (!currentEx) return;
    const completedCount = currentEx.sets.length;
    const prev = prevPerf[currentEx.name];
    const nextSetIdx = completedCount;
    if (prev && prev[nextSetIdx]) {
      setInputWeight(prev[nextSetIdx].weight);
      setInputReps(prev[nextSetIdx].reps);
    } else if (currentEx.sets.length > 0) {
      const last = currentEx.sets[currentEx.sets.length - 1];
      setInputWeight(last.weight);
      setInputReps(last.reps);
    } else if (prev && prev[0]) {
      setInputWeight(prev[0].weight);
      setInputReps(prev[0].reps);
    } else {
      setInputWeight(0);
      setInputReps(parseInt(currentEx.targetReps) || 10);
    }
  }, [currentIdx, exercises.length]);

  /* ── Resume timers when switching to an active exercise ────────────────── */
  useEffect(() => {
    if (!currentEx) return;
    if (currentEx.started && !currentEx.finished) {
      if (currentEx.startedAt) {
        if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
        exerciseStartRef.current = currentEx.startedAt;
        setExerciseTimer(Math.floor((Date.now() - currentEx.startedAt) / 1000));
        exerciseTimerRef.current = setInterval(() => {
          if (exerciseStartRef.current) {
            setExerciseTimer(Math.floor((Date.now() - exerciseStartRef.current) / 1000));
          }
        }, 1000);
      }
      const lastSet = currentEx.sets[currentEx.sets.length - 1];
      if (lastSet?.loggedAt) {
        if (restTimerRef.current) clearInterval(restTimerRef.current);
        lastSetTimeRef.current = lastSet.loggedAt;
        setRestTimer(Math.floor((Date.now() - lastSet.loggedAt) / 1000));
        restTimerRef.current = setInterval(() => {
          if (lastSetTimeRef.current) {
            setRestTimer(Math.floor((Date.now() - lastSetTimeRef.current) / 1000));
          }
        }, 1000);
      } else {
        stopRestTimer();
      }
    } else {
      stopExerciseTimer();
      stopRestTimer();
      setExerciseTimer(0);
    }
  }, [currentIdx, currentEx?.started, currentEx?.finished]);

  /* ── Actions ───────────────────────────────────────────────────────────── */
  const handleStartExercise = () => {
    const now = Date.now();
    setExercises(prev => prev.map((ex, i) =>
      i === currentIdx ? { ...ex, started: true, startedAt: now } : ex
    ));
    startExerciseTimer();
    stopRestTimer();
  };

  const handleLogSet = () => {
    if (!currentEx || !currentEx.started) return;
    const now = Date.now();
    const newSet = {
      id: crypto.randomUUID(),
      weight: inputWeight,
      reps: inputReps,
      completed: true,
      loggedAt: now,
    };
    setExercises(prev => prev.map((ex, i) =>
      i === currentIdx ? { ...ex, sets: [...ex.sets, newSet] } : ex
    ));
    startRestTimer();

    const nextIdx = currentEx.sets.length + 1;
    const prev = prevPerf[currentEx.name];
    if (prev && prev[nextIdx]) {
      setInputWeight(prev[nextIdx].weight);
      setInputReps(prev[nextIdx].reps);
    }
  };

  const handleFinishExercise = () => {
    const now = Date.now();
    setExercises(prev => prev.map((ex, i) =>
      i === currentIdx ? { ...ex, finished: true, finishedAt: now } : ex
    ));
    stopExerciseTimer();
    stopRestTimer();

    const nextUnfinished = exercises.findIndex((ex, i) => i > currentIdx && !ex.finished);
    if (nextUnfinished !== -1) {
      setTimeout(() => {
        setSlideDir(1);
        setCurrentIdx(nextUnfinished);
      }, 300);
    }
  };

  const handleDeleteSet = (setIdx: number) => {
    setExercises(prev => prev.map((ex, i) =>
      i === currentIdx ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) } : ex
    ));
  };

  const removeExercise = () => {
    if (exercises.length <= 1) {
      setExercises([]);
      return;
    }
    setExercises(prev => prev.filter((_, i) => i !== currentIdx));
    if (currentIdx >= exercises.length - 1) setCurrentIdx(Math.max(0, currentIdx - 1));
  };

  const addExerciseFromLibrary = (name: string, muscleGroup: string) => {
    const newEx: ActiveExercise = {
      exerciseId: crypto.randomUUID(),
      name,
      muscleGroup,
      targetSets: 3,
      targetReps: "8-12",
      restSeconds: 90,
      sets: [],
      notes: "",
      started: false,
      finished: false,
    };
    setExercises(prev => [...prev, newEx]);
    setShowAddExercise(false);
    setShowCustomForm(false);
    setExerciseSearch("");
    setTimeout(() => {
      setSlideDir(1);
      setCurrentIdx(exercises.length);
    }, 100);
  };

  const addCustomExercise = () => {
    if (!customName.trim()) { toast.error("Exercise name is required"); return; }
    const newEx: ActiveExercise = {
      exerciseId: crypto.randomUUID(),
      name: customName.trim(),
      muscleGroup: customMuscle,
      targetSets: customSets,
      targetReps: customReps,
      restSeconds: customRest,
      sets: [],
      notes: "",
      started: false,
      finished: false,
    };
    setExercises(prev => [...prev, newEx]);
    setShowAddExercise(false);
    setShowCustomForm(false);
    setExerciseSearch("");
    setCustomName("");
    setCustomMuscle("Other");
    setCustomSets(3);
    setCustomReps("8-12");
    setCustomRest(90);
    toast.success(`Added "${newEx.name}"`);
    setTimeout(() => {
      setSlideDir(1);
      setCurrentIdx(exercises.length);
    }, 100);
  };

  const openCustomForm = (prefillName?: string) => {
    setCustomName(prefillName || "");
    setCustomMuscle("Other");
    setCustomSets(3);
    setCustomReps("8-12");
    setCustomRest(90);
    setShowCustomForm(true);
  };

  const goTo = (idx: number) => {
    if (idx === currentIdx || idx < 0 || idx >= exercises.length) return;
    setSlideDir(idx > currentIdx ? 1 : -1);
    setCurrentIdx(idx);
  };

  /* ── Computed ───────────────────────────────────────────────────────────── */
  const completedSets = exercises.flatMap(e => e.sets).length;
  const totalVolume = exercises.flatMap(e => e.sets.map(s => s.weight * s.reps)).reduce((a, b) => a + b, 0);
  const finishedCount = exercises.filter(e => e.finished).length;
  const prevSets = currentEx ? prevPerf[currentEx.name] : undefined;

  const finishWorkout = async () => {
    stopExerciseTimer();
    stopRestTimer();
    setSaving(true);

    const sessionExercises: SessionExercise[] = exercises
      .filter(ex => ex.sets.length > 0)
      .map(ex => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        notes: ex.notes || undefined,
        sets: ex.sets.map(s => ({ id: s.id, weight: s.weight, reps: s.reps, completed: true })),
      }));

    const session: WorkoutSession = {
      id: crypto.randomUUID(),
      routineId: workout.routineId !== "new" ? workout.routineId : undefined,
      routineName,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: elapsed,
      exercises: sessionExercises,
      notes: workoutNotes || undefined,
      totalVolume,
    };

    try {
      await api.sessions.save(session);
      const allSessions = await api.sessions.list();
      awardWorkoutXP(session, allSessions);
      toast.success("Workout saved!");
      clearWorkout();
      navigate("/history", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to save workout");
      setSaving(false);
    }
  };

  const filteredLibrary = EXERCISE_LIBRARY.filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.muscleGroup.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  /* rest timer color based on recommended rest */
  const restColor = currentEx && restTimer > 0
    ? restTimer >= currentEx.restSeconds ? "var(--t-neon)" : "var(--t-text-muted)"
    : "var(--t-text-dim)";

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground flex flex-col" style={{ minHeight: 'calc(100vh - 60px)' }}>
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2 flex-shrink-0">
        <button
          onClick={() => setCancelConfirm(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
        >
          <X size={14} className="text-red-400" />
        </button>
        <div className="text-center flex-1 mx-3">
          <h1 className="text-lg font-black truncate">{routineName}</h1>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Timer size={11} style={{ color: 'var(--t-text-dim)' }} />
            <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--t-text-muted)' }}>
              {fmt(elapsed)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setCompleteConfirm(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
        >
          <Check size={12} /> Finish
        </button>
      </div>

      {/* EXERCISE NAV PILLS */}
      {exercises.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2 overflow-x-auto scrollbar-hide flex-shrink-0">
          {exercises.map((ex, i) => {
            const isCurrent = i === currentIdx;
            const isDone = ex.finished;
            return (
              <button
                key={ex.exerciseId + i}
                onClick={() => goTo(i)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap"
                style={{
                  backgroundColor: isCurrent
                    ? 'var(--t-cta-bg)'
                    : isDone
                      ? 'var(--t-set-complete-bg)'
                      : 'var(--muted)',
                  color: isCurrent
                    ? 'var(--t-cta-fg)'
                    : isDone
                      ? 'var(--t-neon)'
                      : 'var(--t-text-muted)',
                  border: isCurrent ? 'none' : '1px solid var(--t-border-subtle)',
                }}
              >
                {isDone && <Check size={10} strokeWidth={3} />}
                {ex.name.length > 16 ? ex.name.slice(0, 14) + "\u2026" : ex.name}
              </button>
            );
          })}
          <button
            onClick={() => setShowAddExercise(true)}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--muted)', border: '1px dashed var(--border)' }}
          >
            <Plus size={13} style={{ color: 'var(--t-text-muted)' }} />
          </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden relative">
        {exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--muted)' }}>
              <Dumbbell size={28} style={{ color: 'var(--t-text-dim)' }} />
            </div>
            <p className="text-sm font-semibold mb-1">No exercises yet</p>
            <p className="text-xs mb-5" style={{ color: 'var(--t-text-muted)' }}>Add an exercise to get started</p>
            <button
              onClick={() => setShowAddExercise(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold"
              style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
            >
              <Plus size={15} /> Add Exercise
            </button>
          </div>
        ) : currentEx && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentIdx}
              initial={{ x: slideDir * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: slideDir * -60, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 overflow-y-auto scrollbar-hide px-5 pt-4 pb-6"
            >
              {/* Exercise Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--t-text-dim)' }}>
                    {currentEx.muscleGroup || "Exercise"}
                  </p>
                  <h2 className="text-2xl font-black tracking-tight leading-tight truncate">{currentEx.name}</h2>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--t-text-muted)' }}>
                    {currentEx.targetSets} sets &times; {currentEx.targetReps} reps
                    {currentEx.restSeconds > 0 && ` \u00b7 ${currentEx.restSeconds}s rest`}
                  </p>
                </div>
                <button
                  onClick={removeExercise}
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 mt-1"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <Trash2 size={13} style={{ color: 'var(--t-text-dim)' }} />
                </button>
              </div>

              {/* Exercise & Rest Timers (when active) */}
              {currentEx.started && !currentEx.finished && (
                <div
                  className="flex items-center rounded-xl px-4 py-2.5 mb-5 gap-6"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black tabular-nums" style={{ color: 'var(--t-accent-text)' }}>
                      {fmt(exerciseTimer)}
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--t-text-dim)' }}>elapsed</span>
                  </div>
                  {currentEx.sets.length > 0 && (
                    <>
                      <div className="w-px h-4 rounded-full" style={{ backgroundColor: 'var(--t-border-subtle)' }} />
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-black tabular-nums" style={{ color: restColor }}>
                          {fmt(restTimer)}
                        </span>
                        <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--t-text-dim)' }}>rest</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Last Performance */}
              {prevSets && prevSets.length > 0 && !currentEx.started && (
                <div className="mb-6">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--t-text-dim)' }}>
                    Previous Session
                  </p>
                  <div
                    className="rounded-2xl overflow-hidden border"
                    style={{ borderColor: 'var(--t-border-subtle)' }}
                  >
                    <div
                      className="grid grid-cols-3 px-4 py-2"
                      style={{ backgroundColor: 'var(--muted)' }}
                    >
                      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-dim)' }}>Set</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--t-text-dim)' }}>Weight</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--t-text-dim)' }}>Reps</span>
                    </div>
                    {prevSets.map((s, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-3 px-4 py-3 border-t"
                        style={{ borderColor: 'var(--t-border-subtle)', backgroundColor: 'var(--card)' }}
                      >
                        <span className="text-xs font-medium" style={{ color: 'var(--t-text-muted)' }}>{i + 1}</span>
                        <span className="text-xs font-bold text-center">{s.weight} <span style={{ color: 'var(--t-text-dim)' }}>kg</span></span>
                        <span className="text-xs font-bold text-right">{s.reps}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Logged Sets (when exercise is active) */}
              {currentEx.started && currentEx.sets.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'var(--t-text-dim)' }}>
                    Logged
                  </p>
                  <div className="space-y-1.5">
                    {currentEx.sets.map((s, i) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-xl px-4 py-3"
                        style={{ backgroundColor: 'var(--t-set-complete-bg)', border: '1px solid var(--t-set-complete-border)' }}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold w-5" style={{ color: 'var(--t-neon)' }}>
                            {i + 1}
                          </span>
                          <span className="text-sm font-black">
                            {s.weight}<span className="text-[10px] font-medium" style={{ color: 'var(--t-text-dim)' }}> kg</span>
                          </span>
                          <span className="text-xs" style={{ color: 'var(--t-text-dim)' }}>&times;</span>
                          <span className="text-sm font-black">{s.reps}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {prevSets && prevSets[i] && (() => {
                            const diff = s.weight - prevSets[i].weight;
                            if (diff === 0) return null;
                            return (
                              <span className={`text-[10px] font-semibold ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {diff > 0 ? '+' : ''}{diff}kg
                              </span>
                            );
                          })()}
                          {!currentEx.finished && (
                            <button
                              onClick={() => handleDeleteSet(i)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
                            >
                              <X size={10} className="text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Not Started State: Start Exercise button */}
              {!currentEx.started && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStartExercise}
                  className="w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2.5"
                  style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
                >
                  <Play size={18} fill="currentColor" />
                  Start Exercise
                </motion.button>
              )}

              {/* Active State: Weight/Reps Input + Log Set */}
              {currentEx.started && !currentEx.finished && (
                <div className="space-y-3">
                  <div
                    className="rounded-2xl border p-4 overflow-hidden"
                    style={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--t-border-subtle)',
                      boxShadow: 'var(--t-shadow-card)',
                    }}
                  >
                    <div className="flex items-stretch gap-3 min-w-0">
                      {/* Weight */}
                      <div className="flex-1 flex flex-col items-center min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--t-text-dim)' }}>
                          Weight (kg)
                        </span>
                        <div className="flex items-center gap-1.5 w-full min-w-0">
                          <button
                            onClick={() => setInputWeight(Math.max(0, Number((inputWeight - 2.5).toFixed(1))))}
                            className="w-9 h-11 flex-shrink-0 rounded-lg flex items-center justify-center text-base font-bold active:scale-90 transition-transform"
                            style={{ backgroundColor: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                          >
                            &#x2212;
                          </button>
                          <input
                            type="number"
                            value={inputWeight}
                            onChange={e => setInputWeight(Number(e.target.value))}
                            className="flex-1 h-11 text-center text-lg font-black rounded-lg border-0 focus:outline-none min-w-0"
                            style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
                            step={2.5}
                            min={0}
                          />
                          <button
                            onClick={() => setInputWeight(Number((inputWeight + 2.5).toFixed(1)))}
                            className="w-9 h-11 flex-shrink-0 rounded-lg flex items-center justify-center text-base font-bold active:scale-90 transition-transform"
                            style={{ backgroundColor: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="w-px flex-shrink-0 self-stretch rounded-full my-4" style={{ backgroundColor: 'var(--t-border-subtle)' }} />

                      {/* Reps */}
                      <div className="flex-1 flex flex-col items-center min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--t-text-dim)' }}>
                          Reps
                        </span>
                        <div className="flex items-center gap-1.5 w-full min-w-0">
                          <button
                            onClick={() => setInputReps(Math.max(1, inputReps - 1))}
                            className="w-9 h-11 flex-shrink-0 rounded-lg flex items-center justify-center text-base font-bold active:scale-90 transition-transform"
                            style={{ backgroundColor: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                          >
                            &#x2212;
                          </button>
                          <input
                            type="number"
                            value={inputReps}
                            onChange={e => setInputReps(Number(e.target.value))}
                            className="flex-1 h-11 text-center text-lg font-black rounded-lg border-0 focus:outline-none min-w-0"
                            style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
                            step={1}
                            min={1}
                          />
                          <button
                            onClick={() => setInputReps(inputReps + 1)}
                            className="w-9 h-11 flex-shrink-0 rounded-lg flex items-center justify-center text-base font-bold active:scale-90 transition-transform"
                            style={{ backgroundColor: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {prevSets && prevSets[currentEx.sets.length] && (
                      <p className="text-[10px] text-center mt-4 py-1.5 rounded-lg" style={{ color: 'var(--t-text-muted)', backgroundColor: 'var(--muted)' }}>
                        Previous: {prevSets[currentEx.sets.length].weight}kg &times; {prevSets[currentEx.sets.length].reps} reps
                      </p>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleLogSet}
                    className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
                  >
                    <Check size={15} strokeWidth={2.5} />
                    Log Set {currentEx.sets.length + 1}
                  </motion.button>

                  {currentEx.sets.length > 0 && (
                    <button
                      onClick={handleFinishExercise}
                      className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                      style={{ backgroundColor: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                    >
                      Finish Exercise
                    </button>
                  )}
                </div>
              )}

              {/* Finished State */}
              {currentEx.finished && (
                <div className="mt-6 text-center py-8">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: 'var(--t-set-complete-bg)', border: '1px solid var(--t-set-complete-border)' }}
                  >
                    <Check size={28} style={{ color: 'var(--t-neon)' }} strokeWidth={2.5} />
                  </div>
                  <p className="text-base font-black mb-1">Done</p>
                  <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                    {currentEx.sets.length} sets &middot; {currentEx.sets.reduce((a, s) => a + s.weight * s.reps, 0)} kg total volume
                  </p>
                  <button
                    onClick={() => {
                      setExercises(prev => prev.map((ex, i) =>
                        i === currentIdx ? { ...ex, finished: false, finishedAt: undefined } : ex
                      ));
                    }}
                    className="mt-5 text-xs font-semibold px-5 py-2.5 rounded-xl"
                    style={{ backgroundColor: 'var(--muted)', color: 'var(--t-text-muted)' }}
                  >
                    + Add More Sets
                  </button>
                </div>
              )}

              {/* Exercise Notes */}
              <div className="mt-6">
                <textarea
                  placeholder="Exercise notes..."
                  value={currentEx.notes}
                  onChange={e => setExercises(prev => prev.map((ex2, i) =>
                    i === currentIdx ? { ...ex2, notes: e.target.value } : ex2
                  ))}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-xs focus:outline-none resize-none"
                  style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* BOTTOM BAR */}
      {exercises.length > 0 && (
        <div
          className="flex-shrink-0 px-5 py-2.5 pb-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--t-border-subtle)', backgroundColor: 'var(--background)' }}
        >
          {/* Prev */}
          <button
            onClick={() => goTo(currentIdx - 1)}
            disabled={currentIdx === 0}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-20 transition-opacity"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <ChevronLeft size={18} style={{ color: 'var(--muted-foreground)' }} />
          </button>

          {/* Stats */}
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-sm font-black tabular-nums">{completedSets}</p>
              <p className="text-[9px]" style={{ color: 'var(--t-text-dim)' }}>Sets</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-black tabular-nums">{finishedCount}<span className="font-medium" style={{ color: 'var(--t-text-dim)' }}>/{exercises.length}</span></p>
              <p className="text-[9px]" style={{ color: 'var(--t-text-dim)' }}>Done</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-black tabular-nums">{totalVolume}<span className="text-[9px] font-medium" style={{ color: 'var(--t-text-dim)' }}>kg</span></p>
              <p className="text-[9px]" style={{ color: 'var(--t-text-dim)' }}>Vol</p>
            </div>
          </div>

          {/* Next */}
          <button
            onClick={() => goTo(currentIdx + 1)}
            disabled={currentIdx >= exercises.length - 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-20 transition-opacity"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <ChevronRight size={18} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>
      )}

      {/* ADD EXERCISE SHEET */}
      <AnimatePresence>
        {showAddExercise && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              style={{ backgroundColor: 'var(--t-overlay)' }}
              onClick={() => setShowAddExercise(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-[24px] border-t max-h-[70vh] flex flex-col"
              style={{ backgroundColor: 'var(--t-elevated)', borderColor: 'var(--border)' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--t-handle)' }} />
              </div>
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--t-border-light)' }}>
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--muted)' }}>
                  <input
                    autoFocus
                    value={exerciseSearch}
                    onChange={e => setExerciseSearch(e.target.value)}
                    placeholder="Search exercises..."
                    className="flex-1 bg-transparent text-sm text-foreground outline-none"
                  />
                  <button onClick={() => setShowAddExercise(false)}>
                    <X size={14} style={{ color: 'var(--t-text-muted)' }} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 scrollbar-hide pb-8">
                {/* Create Custom button */}
                <button
                  onClick={() => openCustomForm(exerciseSearch || "")}
                  className="flex items-center gap-3 w-full px-5 py-3.5 border-b"
                  style={{ borderColor: 'var(--t-border-subtle)' }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--t-primary-muted)' }}>
                    <Plus size={14} style={{ color: 'var(--t-neon)' }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">
                      {exerciseSearch ? `Create "${exerciseSearch}"` : "Create Custom Exercise"}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>Set name, muscle group, sets & reps</p>
                  </div>
                </button>
                {filteredLibrary.map(ex => (
                  <button
                    key={ex.name}
                    onClick={() => addExerciseFromLibrary(ex.name, ex.muscleGroup)}
                    className="flex items-center justify-between w-full px-5 py-3.5 border-b"
                    style={{ borderColor: 'var(--t-border-subtle)' }}
                  >
                    <p className="text-sm">{ex.name}</p>
                    <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>{ex.muscleGroup}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CUSTOM EXERCISE FORM */}
      <AnimatePresence>
        {showCustomForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              style={{ backgroundColor: 'var(--t-overlay)' }}
              onClick={() => setShowCustomForm(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-[24px] border-t max-h-[70vh] flex flex-col"
              style={{ backgroundColor: 'var(--t-elevated)', borderColor: 'var(--border)' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--t-handle)' }} />
              </div>
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--t-border-light)' }}>
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--muted)' }}>
                  <input
                    autoFocus
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Exercise name..."
                    className="flex-1 bg-transparent text-sm text-foreground outline-none"
                  />
                  <button onClick={() => setShowCustomForm(false)}>
                    <X size={14} style={{ color: 'var(--t-text-muted)' }} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 scrollbar-hide pb-8 px-5 pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--t-text-dim)' }}>Muscle Group</label>
                    <select
                      value={customMuscle}
                      onChange={e => setCustomMuscle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                    >
                      {MUSCLE_GROUPS.map(mg => (
                        <option key={mg} value={mg}>{mg}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--t-text-dim)' }}>Target Sets</label>
                    <input
                      type="number"
                      value={customSets}
                      onChange={e => setCustomSets(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                      step={1}
                      min={1}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--t-text-dim)' }}>Target Reps</label>
                    <input
                      type="text"
                      value={customReps}
                      onChange={e => setCustomReps(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--t-text-dim)' }}>Rest Seconds</label>
                    <input
                      type="number"
                      value={customRest}
                      onChange={e => setCustomRest(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                      step={1}
                      min={0}
                    />
                  </div>
                </div>
                <button
                  onClick={addCustomExercise}
                  className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 mt-4"
                  style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
                >
                  <Check size={15} strokeWidth={2.5} />
                  Add Exercise
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CANCEL CONFIRM */}
      <AnimatePresence>
        {cancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end"
            style={{ backgroundColor: 'var(--t-overlay)' }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full rounded-t-[24px] border-t px-5 py-6 pb-10"
              style={{ backgroundColor: 'var(--t-elevated)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={18} className="text-[#f97316]" />
                <h3 className="font-bold">Cancel Workout?</h3>
              </div>
              <p className="text-sm mb-5" style={{ color: 'var(--muted-foreground)' }}>
                Your progress won't be saved if you cancel now.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCancelConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  Keep Going
                </button>
                <button
                  onClick={() => {
                    cancelWorkout();
                    navigate("/", { replace: true });
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-red-500/20 text-red-400 font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPLETE CONFIRM */}
      <AnimatePresence>
        {completeConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end"
            style={{ backgroundColor: 'var(--t-overlay)' }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full rounded-t-[24px] border-t px-5 py-6 pb-10"
              style={{ backgroundColor: 'var(--t-elevated)', borderColor: 'var(--border)' }}
            >
              <h3 className="text-lg font-black mb-2">Finish Workout?</h3>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--muted)' }}>
                  <p className="text-lg font-black" style={{ color: 'var(--t-accent-text)' }}>{completedSets}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--t-text-muted)' }}>Sets</p>
                </div>
                <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--muted)' }}>
                  <p className="text-lg font-black">{fmt(elapsed)}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--t-text-muted)' }}>Duration</p>
                </div>
                <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--muted)' }}>
                  <p className="text-lg font-black">{totalVolume}kg</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--t-text-muted)' }}>Volume</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCompleteConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  Keep Going
                </button>
                <button
                  onClick={finishWorkout}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Save Workout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}