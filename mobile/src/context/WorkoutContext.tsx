import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface WorkoutContextValue {
  isActive: boolean;
  routineId: string;
  routineName: string;
  elapsed: number;
  completedSets: number;
  startWorkout: (routineId: string, routineName: string) => void;
  addCompletedSet: () => void;
  endWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [routineId, setRoutineId] = useState('');
  const [routineName, setRoutineName] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;
    startTimeRef.current = Date.now();
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const startWorkout = (id: string, name: string) => {
    setRoutineId(id);
    setRoutineName(name);
    setCompletedSets(0);
    setIsActive(true);
  };

  const addCompletedSet = () => setCompletedSets((n) => n + 1);

  const endWorkout = () => {
    setIsActive(false);
    setRoutineId('');
    setRoutineName('');
    setElapsed(0);
    setCompletedSets(0);
  };

  return (
    <WorkoutContext.Provider
      value={{
        isActive,
        routineId,
        routineName,
        elapsed,
        completedSets,
        startWorkout,
        addCompletedSet,
        endWorkout,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
}
