export type ExerciseType = 'strength' | 'cardio' | 'duration';

export interface Set {
  id: string;
  reps?: number;
  weight?: number;
  rpe?: number;
  duration?: number; // seconds
  distance?: number; // meters
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  targetSets?: number;
  targetReps?: number;
  sets: Set[];
  notes?: string;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  routineId?: string; // If started from a routine
  name: string;
  startTime: string;
  endTime?: string;
  exercises: Exercise[];
  notes?: string;
  status: 'active' | 'completed' | 'canceled';
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  goals?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}
