import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react";

/* ── Types ────────────────────────────────────────────────────────────────── */
export interface ActiveSet {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
  loggedAt?: number;
  prevWeight?: number;
  prevReps?: number;
}

export interface ActiveExercise {
  exerciseId: string;
  name: string;
  muscleGroup?: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  sets: ActiveSet[];
  notes: string;
  started: boolean;
  finished: boolean;
  startedAt?: number;
  finishedAt?: number;
}

export interface PrevPerformance {
  [exerciseName: string]: { weight: number; reps: number }[];
}

interface WorkoutState {
  isActive: boolean;
  routineId: string;
  routineName: string;
  exercises: ActiveExercise[];
  startTime: number;
  currentIdx: number;
  workoutNotes: string;
  prevPerf: PrevPerformance;
  elapsed: number;
}

interface WorkoutContextValue extends WorkoutState {
  // Lifecycle
  beginWorkout: (routineId: string, routineName: string, exercises: ActiveExercise[], prevPerf: PrevPerformance) => void;
  cancelWorkout: () => void;
  clearWorkout: () => void;
  // State setters
  setExercises: React.Dispatch<React.SetStateAction<ActiveExercise[]>>;
  setCurrentIdx: React.Dispatch<React.SetStateAction<number>>;
  setWorkoutNotes: React.Dispatch<React.SetStateAction<string>>;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [routineId, setRoutineId] = useState("");
  const [routineName, setRoutineName] = useState("");
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [prevPerf, setPrevPerf] = useState<PrevPerformance>({});
  const [elapsed, setElapsed] = useState(0);

  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Elapsed timer — runs as long as workout is active
  useEffect(() => {
    if (isActive) {
      elapsedRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [isActive]);

  const beginWorkout = useCallback((rid: string, rName: string, exs: ActiveExercise[], pp: PrevPerformance) => {
    const now = Date.now();
    startTimeRef.current = now;
    setIsActive(true);
    setRoutineId(rid);
    setRoutineName(rName);
    setExercises(exs);
    setStartTime(now);
    setCurrentIdx(0);
    setWorkoutNotes("");
    setPrevPerf(pp);
    setElapsed(0);
  }, []);

  const cancelWorkout = useCallback(() => {
    setIsActive(false);
    setExercises([]);
    setCurrentIdx(0);
    setWorkoutNotes("");
    setPrevPerf({});
    setElapsed(0);
  }, []);

  const clearWorkout = cancelWorkout;

  return (
    <WorkoutContext.Provider
      value={{
        isActive,
        routineId,
        routineName,
        exercises,
        startTime,
        currentIdx,
        workoutNotes,
        prevPerf,
        elapsed,
        beginWorkout,
        cancelWorkout,
        clearWorkout,
        setExercises,
        setCurrentIdx,
        setWorkoutNotes,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within WorkoutProvider");
  return ctx;
}
