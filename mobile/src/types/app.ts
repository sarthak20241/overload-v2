// App-level types (match web app types for routines/sessions)

export interface RoutineExercise {
  id: string;
  name: string;
  muscleGroup?: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  notes?: string;
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  exercises: RoutineExercise[];
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSet {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  name: string;
  muscleGroup?: string;
  sets: SessionSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  routineId?: string;
  routineName: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  exercises: SessionExercise[];
  notes?: string;
  totalVolume: number;
}
