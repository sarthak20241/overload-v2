import React, { createContext, useContext } from 'react';

interface WorkoutSelectorContextValue {
  openWorkoutSelector: () => void;
}

const WorkoutSelectorContext = createContext<WorkoutSelectorContextValue | null>(null);

export function WorkoutSelectorProvider({
  children,
  openWorkoutSelector,
}: {
  children: React.ReactNode;
  openWorkoutSelector: () => void;
}) {
  return (
    <WorkoutSelectorContext.Provider value={{ openWorkoutSelector }}>
      {children}
    </WorkoutSelectorContext.Provider>
  );
}

export function useWorkoutSelector(): WorkoutSelectorContextValue {
  const ctx = useContext(WorkoutSelectorContext);
  if (!ctx) return { openWorkoutSelector: () => {} };
  return ctx;
}
