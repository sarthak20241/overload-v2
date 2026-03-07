
export type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: string;
  restTime: number; // in seconds
  notes?: string;
};

export type Routine = {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: number;
};

export type WorkoutSet = {
  id: string;
  exerciseId: string;
  weight: number;
  reps: number;
  completed: boolean;
  timestamp: number;
};

export type WorkoutSession = {
  id: string;
  routineId?: string;
  routineName: string;
  startTime: number;
  endTime?: number;
  exercises: {
    exerciseId: string;
    name: string;
    sets: WorkoutSet[];
    notes?: string;
  }[];
  status: 'active' | 'completed' | 'cancelled';
};

export type UserProfile = {
  id: string;
  email?: string;
  name?: string;
  guest: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
  };
};
