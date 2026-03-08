/**
 * Exercise library for routine builder and workout — name + muscle group.
 * Ported from web RoutinesPage / ActiveWorkoutPage.
 */

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
  'Glutes',
  'Cardio',
] as const;

export interface ExerciseLibraryEntry {
  name: string;
  muscleGroup: string;
}

export const EXERCISE_LIBRARY: ExerciseLibraryEntry[] = [
  { name: 'Bench Press', muscleGroup: 'Chest' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest' },
  { name: 'Cable Fly', muscleGroup: 'Chest' },
  { name: 'Push-up', muscleGroup: 'Chest' },
  { name: 'Deadlift', muscleGroup: 'Back' },
  { name: 'Barbell Row', muscleGroup: 'Back' },
  { name: 'Pull-up', muscleGroup: 'Back' },
  { name: 'Lat Pulldown', muscleGroup: 'Back' },
  { name: 'Dumbbell Row', muscleGroup: 'Back' },
  { name: 'Cable Row', muscleGroup: 'Back' },
  { name: 'Overhead Press', muscleGroup: 'Shoulders' },
  { name: 'Lateral Raise', muscleGroup: 'Shoulders' },
  { name: 'Face Pull', muscleGroup: 'Shoulders' },
  { name: 'Arnold Press', muscleGroup: 'Shoulders' },
  { name: 'Barbell Curl', muscleGroup: 'Arms' },
  { name: 'Dumbbell Curl', muscleGroup: 'Arms' },
  { name: 'Tricep Pushdown', muscleGroup: 'Arms' },
  { name: 'Skull Crusher', muscleGroup: 'Arms' },
  { name: 'Hammer Curl', muscleGroup: 'Arms' },
  { name: 'Squat', muscleGroup: 'Legs' },
  { name: 'Romanian Deadlift', muscleGroup: 'Legs' },
  { name: 'Leg Press', muscleGroup: 'Legs' },
  { name: 'Leg Curl', muscleGroup: 'Legs' },
  { name: 'Leg Extension', muscleGroup: 'Legs' },
  { name: 'Calf Raise', muscleGroup: 'Legs' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Legs' },
  { name: 'Hip Thrust', muscleGroup: 'Glutes' },
  { name: 'Glute Bridge', muscleGroup: 'Glutes' },
  { name: 'Plank', muscleGroup: 'Core' },
  { name: 'Ab Crunch', muscleGroup: 'Core' },
  { name: 'Russian Twist', muscleGroup: 'Core' },
];
