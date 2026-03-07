/**
 * API client for the Supabase Edge Function.
 *
 * Uses the user's session access_token as the Bearer JWT when one exists
 * (the token is issued by Supabase Auth and passes the gateway's JWT check).
 * Falls back to publicAnonKey when there is no session (e.g. /auth/signup).
 * The server-side getUser() verifies the token via supabase.auth.getUser().
 *
 * In guest mode, all data is stored in localStorage instead of hitting the
 * Edge Function, so the app works without any Supabase configuration.
 */
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from '../app/services/supabase';
import type { Routine, WorkoutSession } from '../app/types';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-89faff51`;

// ── Guest mode flag ─────────────────────────────────────────────────────────
let _isGuest = false;
export function setGuestMode(v: boolean) { _isGuest = v; }

// ── localStorage helpers for guest mode ──────────────────────────────────────
const LS_ROUTINES = "overload_guest_routines";
const LS_SESSIONS = "overload_guest_sessions";

function lsGet<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch { return []; }
}
function lsSet<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Demo data seeding for new guests ─────────────────────────────────────────
function seedGuestDataIfNeeded() {
  const SEED_VERSION = "3"; // bump to re-seed existing guests with new data
  if (localStorage.getItem("overload_guest_seeded") === SEED_VERSION) return;

  // Clear old seed data so we get a clean slate
  localStorage.removeItem(LS_ROUTINES);
  localStorage.removeItem(LS_SESSIONS);
  localStorage.removeItem("overload_measurements");
  localStorage.removeItem("overload_basic_info");
  localStorage.removeItem("overload_xp_data");
  localStorage.removeItem("overload_weight_log");
  localStorage.removeItem("overload_bodyfat_log");

  const now = new Date();
  const DAY = 86400000;

  const demoRoutines: Routine[] = [
    {
      id: "demo-push",
      name: "Push Day",
      description: "Chest, Shoulders & Triceps",
      exercises: [
        { id: "e1", name: "Bench Press", muscleGroup: "Chest", targetSets: 4, targetReps: "8-10", restSeconds: 120, notes: "" },
        { id: "e2", name: "Overhead Press", muscleGroup: "Shoulders", targetSets: 3, targetReps: "8-12", restSeconds: 90, notes: "" },
        { id: "e3", name: "Incline Dumbbell Press", muscleGroup: "Chest", targetSets: 3, targetReps: "10-12", restSeconds: 90, notes: "" },
        { id: "e4", name: "Lateral Raises", muscleGroup: "Shoulders", targetSets: 3, targetReps: "12-15", restSeconds: 60, notes: "" },
        { id: "e5", name: "Tricep Pushdowns", muscleGroup: "Triceps", targetSets: 3, targetReps: "10-15", restSeconds: 60, notes: "" },
      ],
      createdAt: new Date(now.getTime() - 42 * DAY).toISOString(),
      updatedAt: new Date(now.getTime() - 42 * DAY).toISOString(),
    },
    {
      id: "demo-pull",
      name: "Pull Day",
      description: "Back & Biceps",
      exercises: [
        { id: "e6", name: "Deadlift", muscleGroup: "Back", targetSets: 4, targetReps: "5-6", restSeconds: 180, notes: "" },
        { id: "e7", name: "Barbell Rows", muscleGroup: "Back", targetSets: 4, targetReps: "8-10", restSeconds: 90, notes: "" },
        { id: "e8", name: "Pull-Ups", muscleGroup: "Back", targetSets: 3, targetReps: "6-10", restSeconds: 90, notes: "" },
        { id: "e9", name: "Barbell Curls", muscleGroup: "Biceps", targetSets: 3, targetReps: "10-12", restSeconds: 60, notes: "" },
      ],
      createdAt: new Date(now.getTime() - 40 * DAY).toISOString(),
      updatedAt: new Date(now.getTime() - 40 * DAY).toISOString(),
    },
    {
      id: "demo-legs",
      name: "Leg Day",
      description: "Quads, Hamstrings & Calves",
      exercises: [
        { id: "e10", name: "Squats", muscleGroup: "Quads", targetSets: 4, targetReps: "6-8", restSeconds: 150, notes: "" },
        { id: "e11", name: "Romanian Deadlift", muscleGroup: "Hamstrings", targetSets: 3, targetReps: "8-10", restSeconds: 120, notes: "" },
        { id: "e12", name: "Leg Press", muscleGroup: "Quads", targetSets: 3, targetReps: "10-12", restSeconds: 90, notes: "" },
        { id: "e13", name: "Calf Raises", muscleGroup: "Calves", targetSets: 4, targetReps: "12-15", restSeconds: 60, notes: "" },
      ],
      createdAt: new Date(now.getTime() - 38 * DAY).toISOString(),
      updatedAt: new Date(now.getTime() - 38 * DAY).toISOString(),
    },
  ];

  // Helper to create a session
  function mkSession(
    id: string, routineId: string, routineName: string, daysAgo: number,
    durationSec: number, totalVol: number,
    exercises: WorkoutSession["exercises"]
  ): WorkoutSession {
    return {
      id,
      routineId,
      routineName,
      startTime: new Date(now.getTime() - daysAgo * DAY - durationSec * 1000).toISOString(),
      endTime: new Date(now.getTime() - daysAgo * DAY).toISOString(),
      durationSeconds: durationSec,
      totalVolume: totalVol,
      exercises,
    };
  }

  const demoSessions: WorkoutSession[] = [
    // ── Week 6 (oldest) ──────────────────────────────────────────────
    mkSession("ds-01", "demo-push", "Push Day", 40, 3300, 3150, [
      { exerciseId: "e1", name: "Bench Press", muscleGroup: "Chest", sets: [
        { id: "s001", weight: 60, reps: 10, completed: true },
        { id: "s002", weight: 65, reps: 8, completed: true },
        { id: "s003", weight: 65, reps: 7, completed: true },
      ]},
      { exerciseId: "e2", name: "Overhead Press", muscleGroup: "Shoulders", sets: [
        { id: "s004", weight: 35, reps: 10, completed: true },
        { id: "s005", weight: 40, reps: 8, completed: true },
      ]},
      { exerciseId: "e4", name: "Lateral Raises", muscleGroup: "Shoulders", sets: [
        { id: "s006", weight: 8, reps: 15, completed: true },
        { id: "s007", weight: 8, reps: 12, completed: true },
      ]},
    ]),
    mkSession("ds-02", "demo-pull", "Pull Day", 38, 3000, 3600, [
      { exerciseId: "e6", name: "Deadlift", muscleGroup: "Back", sets: [
        { id: "s008", weight: 100, reps: 5, completed: true },
        { id: "s009", weight: 105, reps: 5, completed: true },
        { id: "s010", weight: 110, reps: 4, completed: true },
      ]},
      { exerciseId: "e7", name: "Barbell Rows", muscleGroup: "Back", sets: [
        { id: "s011", weight: 55, reps: 10, completed: true },
        { id: "s012", weight: 60, reps: 8, completed: true },
      ]},
      { exerciseId: "e9", name: "Barbell Curls", muscleGroup: "Biceps", sets: [
        { id: "s013", weight: 25, reps: 12, completed: true },
        { id: "s014", weight: 25, reps: 10, completed: true },
      ]},
    ]),

    // ── Week 5 ───────────────────────────────────────────────────────
    mkSession("ds-03", "demo-legs", "Leg Day", 35, 3600, 5200, [
      { exerciseId: "e10", name: "Squats", muscleGroup: "Quads", sets: [
        { id: "s015", weight: 80, reps: 8, completed: true },
        { id: "s016", weight: 90, reps: 6, completed: true },
        { id: "s017", weight: 90, reps: 6, completed: true },
      ]},
      { exerciseId: "e11", name: "Romanian Deadlift", muscleGroup: "Hamstrings", sets: [
        { id: "s018", weight: 60, reps: 10, completed: true },
        { id: "s019", weight: 65, reps: 8, completed: true },
      ]},
      { exerciseId: "e13", name: "Calf Raises", muscleGroup: "Calves", sets: [
        { id: "s020", weight: 40, reps: 15, completed: true },
        { id: "s021", weight: 40, reps: 14, completed: true },
        { id: "s022", weight: 40, reps: 12, completed: true },
      ]},
    ]),
    mkSession("ds-04", "demo-push", "Push Day", 33, 3420, 3650, [
      { exerciseId: "e1", name: "Bench Press", muscleGroup: "Chest", sets: [
        { id: "s023", weight: 65, reps: 10, completed: true },
        { id: "s024", weight: 70, reps: 8, completed: true },
        { id: "s025", weight: 70, reps: 8, completed: true },
        { id: "s026", weight: 65, reps: 9, completed: true },
      ]},
      { exerciseId: "e2", name: "Overhead Press", muscleGroup: "Shoulders", sets: [
        { id: "s027", weight: 40, reps: 10, completed: true },
        { id: "s028", weight: 42.5, reps: 8, completed: true },
        { id: "s029", weight: 42.5, reps: 7, completed: true },
      ]},
      { exerciseId: "e5", name: "Tricep Pushdowns", muscleGroup: "Triceps", sets: [
        { id: "s030", weight: 25, reps: 12, completed: true },
        { id: "s031", weight: 25, reps: 11, completed: true },
      ]},
    ]),

    // ── Week 4 ───────────────────────────────────────────────────────
    mkSession("ds-05", "demo-pull", "Pull Day", 30, 3500, 4500, [
      { exerciseId: "e6", name: "Deadlift", muscleGroup: "Back", sets: [
        { id: "s032", weight: 110, reps: 5, completed: true },
        { id: "s033", weight: 115, reps: 5, completed: true },
        { id: "s034", weight: 120, reps: 4, completed: true },
        { id: "s035", weight: 110, reps: 6, completed: true },
      ]},
      { exerciseId: "e7", name: "Barbell Rows", muscleGroup: "Back", sets: [
        { id: "s036", weight: 60, reps: 10, completed: true },
        { id: "s037", weight: 65, reps: 8, completed: true },
        { id: "s038", weight: 65, reps: 8, completed: true },
      ]},
      { exerciseId: "e9", name: "Barbell Curls", muscleGroup: "Biceps", sets: [
        { id: "s039", weight: 27.5, reps: 10, completed: true },
        { id: "s040", weight: 27.5, reps: 10, completed: true },
      ]},
    ]),
    mkSession("ds-06", "demo-legs", "Leg Day", 28, 3800, 6100, [
      { exerciseId: "e10", name: "Squats", muscleGroup: "Quads", sets: [
        { id: "s041", weight: 90, reps: 8, completed: true },
        { id: "s042", weight: 95, reps: 6, completed: true },
        { id: "s043", weight: 95, reps: 6, completed: true },
        { id: "s044", weight: 90, reps: 7, completed: true },
      ]},
      { exerciseId: "e11", name: "Romanian Deadlift", muscleGroup: "Hamstrings", sets: [
        { id: "s045", weight: 70, reps: 10, completed: true },
        { id: "s046", weight: 75, reps: 8, completed: true },
        { id: "s047", weight: 75, reps: 8, completed: true },
      ]},
      { exerciseId: "e13", name: "Calf Raises", muscleGroup: "Calves", sets: [
        { id: "s048", weight: 50, reps: 15, completed: true },
        { id: "s049", weight: 50, reps: 13, completed: true },
        { id: "s050", weight: 50, reps: 12, completed: true },
      ]},
    ]),
    mkSession("ds-07", "demo-push", "Push Day", 26, 3540, 4000, [
      { exerciseId: "e1", name: "Bench Press", muscleGroup: "Chest", sets: [
        { id: "s051", weight: 70, reps: 10, completed: true },
        { id: "s052", weight: 75, reps: 8, completed: true },
        { id: "s053", weight: 75, reps: 8, completed: true },
        { id: "s054", weight: 70, reps: 10, completed: true },
      ]},
      { exerciseId: "e2", name: "Overhead Press", muscleGroup: "Shoulders", sets: [
        { id: "s055", weight: 42.5, reps: 10, completed: true },
        { id: "s056", weight: 45, reps: 8, completed: true },
      ]},
      { exerciseId: "e4", name: "Lateral Raises", muscleGroup: "Shoulders", sets: [
        { id: "s057", weight: 10, reps: 15, completed: true },
        { id: "s058", weight: 10, reps: 14, completed: true },
        { id: "s059", weight: 10, reps: 12, completed: true },
      ]},
    ]),

    // ── Week 3 ───────────────────────────────────────────────────────
    mkSession("ds-08", "demo-pull", "Pull Day", 22, 3200, 4800, [
      { exerciseId: "e6", name: "Deadlift", muscleGroup: "Back", sets: [
        { id: "s060", weight: 115, reps: 5, completed: true },
        { id: "s061", weight: 120, reps: 5, completed: true },
        { id: "s062", weight: 125, reps: 4, completed: true },
        { id: "s063", weight: 115, reps: 6, completed: true },
      ]},
      { exerciseId: "e8", name: "Pull-Ups", muscleGroup: "Back", sets: [
        { id: "s064", weight: 0, reps: 8, completed: true },
        { id: "s065", weight: 0, reps: 7, completed: true },
        { id: "s066", weight: 0, reps: 6, completed: true },
      ]},
      { exerciseId: "e9", name: "Barbell Curls", muscleGroup: "Biceps", sets: [
        { id: "s067", weight: 30, reps: 10, completed: true },
        { id: "s068", weight: 30, reps: 10, completed: true },
      ]},
    ]),
    mkSession("ds-09", "demo-legs", "Leg Day", 20, 4200, 7200, [
      { exerciseId: "e10", name: "Squats", muscleGroup: "Quads", sets: [
        { id: "s069", weight: 95, reps: 8, completed: true },
        { id: "s070", weight: 100, reps: 6, completed: true },
        { id: "s071", weight: 105, reps: 5, completed: true },
        { id: "s072", weight: 95, reps: 8, completed: true },
      ]},
      { exerciseId: "e11", name: "Romanian Deadlift", muscleGroup: "Hamstrings", sets: [
        { id: "s073", weight: 75, reps: 10, completed: true },
        { id: "s074", weight: 80, reps: 8, completed: true },
        { id: "s075", weight: 80, reps: 8, completed: true },
      ]},
      { exerciseId: "e12", name: "Leg Press", muscleGroup: "Quads", sets: [
        { id: "s076", weight: 140, reps: 12, completed: true },
        { id: "s077", weight: 160, reps: 10, completed: true },
        { id: "s078", weight: 160, reps: 10, completed: true },
      ]},
      { exerciseId: "e13", name: "Calf Raises", muscleGroup: "Calves", sets: [
        { id: "s079", weight: 55, reps: 15, completed: true },
        { id: "s080", weight: 55, reps: 13, completed: true },
      ]},
    ]),

    // ── Week 2 ───────────────────────────────────────────────────────
    mkSession("ds-10", "demo-push", "Push Day", 15, 3600, 4350, [
      { exerciseId: "e1", name: "Bench Press", muscleGroup: "Chest", sets: [
        { id: "s081", weight: 75, reps: 10, completed: true },
        { id: "s082", weight: 80, reps: 8, completed: true },
        { id: "s083", weight: 80, reps: 7, completed: true },
        { id: "s084", weight: 75, reps: 9, completed: true },
      ]},
      { exerciseId: "e2", name: "Overhead Press", muscleGroup: "Shoulders", sets: [
        { id: "s085", weight: 45, reps: 10, completed: true },
        { id: "s086", weight: 47.5, reps: 8, completed: true },
        { id: "s087", weight: 47.5, reps: 7, completed: true },
      ]},
      { exerciseId: "e3", name: "Incline Dumbbell Press", muscleGroup: "Chest", sets: [
        { id: "s088", weight: 28, reps: 10, completed: true },
        { id: "s089", weight: 28, reps: 10, completed: true },
      ]},
      { exerciseId: "e5", name: "Tricep Pushdowns", muscleGroup: "Triceps", sets: [
        { id: "s090", weight: 30, reps: 12, completed: true },
        { id: "s091", weight: 30, reps: 10, completed: true },
      ]},
    ]),
    mkSession("ds-11", "demo-pull", "Pull Day", 13, 3100, 5000, [
      { exerciseId: "e6", name: "Deadlift", muscleGroup: "Back", sets: [
        { id: "s092", weight: 120, reps: 5, completed: true },
        { id: "s093", weight: 125, reps: 5, completed: true },
        { id: "s094", weight: 130, reps: 4, completed: true },
        { id: "s095", weight: 120, reps: 6, completed: true },
      ]},
      { exerciseId: "e7", name: "Barbell Rows", muscleGroup: "Back", sets: [
        { id: "s096", weight: 65, reps: 10, completed: true },
        { id: "s097", weight: 70, reps: 8, completed: true },
        { id: "s098", weight: 70, reps: 8, completed: true },
      ]},
      { exerciseId: "e9", name: "Barbell Curls", muscleGroup: "Biceps", sets: [
        { id: "s099", weight: 30, reps: 12, completed: true },
        { id: "s100", weight: 32.5, reps: 10, completed: true },
        { id: "s101", weight: 30, reps: 11, completed: true },
      ]},
    ]),
    mkSession("ds-12", "demo-legs", "Leg Day", 11, 4000, 7500, [
      { exerciseId: "e10", name: "Squats", muscleGroup: "Quads", sets: [
        { id: "s102", weight: 100, reps: 8, completed: true },
        { id: "s103", weight: 105, reps: 6, completed: true },
        { id: "s104", weight: 105, reps: 6, completed: true },
        { id: "s105", weight: 100, reps: 8, completed: true },
      ]},
      { exerciseId: "e11", name: "Romanian Deadlift", muscleGroup: "Hamstrings", sets: [
        { id: "s106", weight: 80, reps: 10, completed: true },
        { id: "s107", weight: 85, reps: 8, completed: true },
      ]},
      { exerciseId: "e12", name: "Leg Press", muscleGroup: "Quads", sets: [
        { id: "s108", weight: 160, reps: 12, completed: true },
        { id: "s109", weight: 180, reps: 10, completed: true },
        { id: "s110", weight: 180, reps: 9, completed: true },
      ]},
      { exerciseId: "e13", name: "Calf Raises", muscleGroup: "Calves", sets: [
        { id: "s111", weight: 55, reps: 15, completed: true },
        { id: "s112", weight: 60, reps: 12, completed: true },
        { id: "s113", weight: 60, reps: 12, completed: true },
      ]},
    ]),

    // ── Week 1 (most recent) ─────────────────────────────────────────
    mkSession("ds-13", "demo-push", "Push Day", 7, 3540, 4250, [
      { exerciseId: "e1", name: "Bench Press", muscleGroup: "Chest", sets: [
        { id: "s114", weight: 80, reps: 10, completed: true },
        { id: "s115", weight: 82.5, reps: 8, completed: true },
        { id: "s116", weight: 82.5, reps: 7, completed: true },
        { id: "s117", weight: 80, reps: 9, completed: true },
      ]},
      { exerciseId: "e2", name: "Overhead Press", muscleGroup: "Shoulders", sets: [
        { id: "s118", weight: 47.5, reps: 10, completed: true },
        { id: "s119", weight: 50, reps: 8, completed: true },
        { id: "s120", weight: 50, reps: 7, completed: true },
      ]},
      { exerciseId: "e4", name: "Lateral Raises", muscleGroup: "Shoulders", sets: [
        { id: "s121", weight: 12, reps: 15, completed: true },
        { id: "s122", weight: 12, reps: 12, completed: true },
        { id: "s123", weight: 10, reps: 15, completed: true },
      ]},
    ]),
    mkSession("ds-14", "demo-pull", "Pull Day", 5, 3180, 5100, [
      { exerciseId: "e6", name: "Deadlift", muscleGroup: "Back", sets: [
        { id: "s124", weight: 125, reps: 5, completed: true },
        { id: "s125", weight: 130, reps: 5, completed: true },
        { id: "s126", weight: 135, reps: 4, completed: true },
        { id: "s127", weight: 125, reps: 6, completed: true },
      ]},
      { exerciseId: "e7", name: "Barbell Rows", muscleGroup: "Back", sets: [
        { id: "s128", weight: 70, reps: 10, completed: true },
        { id: "s129", weight: 75, reps: 8, completed: true },
        { id: "s130", weight: 75, reps: 8, completed: true },
      ]},
      { exerciseId: "e9", name: "Barbell Curls", muscleGroup: "Biceps", sets: [
        { id: "s131", weight: 32.5, reps: 12, completed: true },
        { id: "s132", weight: 35, reps: 10, completed: true },
        { id: "s133", weight: 32.5, reps: 11, completed: true },
      ]},
    ]),
    mkSession("ds-15", "demo-legs", "Leg Day", 3, 3900, 7800, [
      { exerciseId: "e10", name: "Squats", muscleGroup: "Quads", sets: [
        { id: "s134", weight: 105, reps: 8, completed: true },
        { id: "s135", weight: 110, reps: 6, completed: true },
        { id: "s136", weight: 110, reps: 6, completed: true },
        { id: "s137", weight: 105, reps: 8, completed: true },
      ]},
      { exerciseId: "e11", name: "Romanian Deadlift", muscleGroup: "Hamstrings", sets: [
        { id: "s138", weight: 85, reps: 10, completed: true },
        { id: "s139", weight: 90, reps: 8, completed: true },
        { id: "s140", weight: 90, reps: 8, completed: true },
      ]},
      { exerciseId: "e13", name: "Calf Raises", muscleGroup: "Calves", sets: [
        { id: "s141", weight: 60, reps: 15, completed: true },
        { id: "s142", weight: 65, reps: 12, completed: true },
        { id: "s143", weight: 65, reps: 12, completed: true },
        { id: "s144", weight: 60, reps: 14, completed: true },
      ]},
    ]),
    mkSession("ds-16", "demo-push", "Push Day", 1, 3600, 4500, [
      { exerciseId: "e1", name: "Bench Press", muscleGroup: "Chest", sets: [
        { id: "s145", weight: 82.5, reps: 10, completed: true },
        { id: "s146", weight: 85, reps: 8, completed: true },
        { id: "s147", weight: 85, reps: 7, completed: true },
        { id: "s148", weight: 80, reps: 10, completed: true },
      ]},
      { exerciseId: "e2", name: "Overhead Press", muscleGroup: "Shoulders", sets: [
        { id: "s149", weight: 50, reps: 10, completed: true },
        { id: "s150", weight: 52.5, reps: 8, completed: true },
        { id: "s151", weight: 52.5, reps: 7, completed: true },
      ]},
      { exerciseId: "e3", name: "Incline Dumbbell Press", muscleGroup: "Chest", sets: [
        { id: "s152", weight: 30, reps: 10, completed: true },
        { id: "s153", weight: 30, reps: 10, completed: true },
        { id: "s154", weight: 30, reps: 8, completed: true },
      ]},
      { exerciseId: "e5", name: "Tricep Pushdowns", muscleGroup: "Triceps", sets: [
        { id: "s155", weight: 32.5, reps: 12, completed: true },
        { id: "s156", weight: 32.5, reps: 10, completed: true },
        { id: "s157", weight: 30, reps: 12, completed: true },
      ]},
    ]),
  ];

  lsSet(LS_ROUTINES, demoRoutines);
  lsSet(LS_SESSIONS, demoSessions);

  // ── Seed body measurements (6 entries over 6 weeks showing progress) ───
  const measurementEntries = [
    { id: "m1", date: new Date(now.getTime() - 40 * DAY).toISOString(), chest: 96, shoulders: 115, neck: 37, bicepL: 33, bicepR: 33.5, forearmL: 27, forearmR: 27.5, waist: 84, hips: 97, thighL: 56, thighR: 56.5, calfL: 36, calfR: 36 },
    { id: "m2", date: new Date(now.getTime() - 33 * DAY).toISOString(), chest: 96.5, shoulders: 115.5, neck: 37, bicepL: 33.2, bicepR: 33.7, forearmL: 27, forearmR: 27.5, waist: 83.5, hips: 97, thighL: 56.5, thighR: 56.5, calfL: 36, calfR: 36.2 },
    { id: "m3", date: new Date(now.getTime() - 26 * DAY).toISOString(), chest: 97, shoulders: 116, neck: 37.2, bicepL: 33.5, bicepR: 34, forearmL: 27.2, forearmR: 27.8, waist: 83, hips: 96.5, thighL: 57, thighR: 57, calfL: 36.2, calfR: 36.5 },
    { id: "m4", date: new Date(now.getTime() - 19 * DAY).toISOString(), chest: 97.5, shoulders: 116.5, neck: 37.3, bicepL: 33.8, bicepR: 34.3, forearmL: 27.5, forearmR: 28, waist: 82.5, hips: 96, thighL: 57.5, thighR: 57.5, calfL: 36.5, calfR: 36.8 },
    { id: "m5", date: new Date(now.getTime() - 12 * DAY).toISOString(), chest: 98, shoulders: 117, neck: 37.5, bicepL: 34, bicepR: 34.5, forearmL: 27.5, forearmR: 28, waist: 82, hips: 96, thighL: 58, thighR: 58, calfL: 36.5, calfR: 37 },
    { id: "m6", date: new Date(now.getTime() - 5 * DAY).toISOString(), chest: 98.5, shoulders: 117.5, neck: 37.5, bicepL: 34.2, bicepR: 34.8, forearmL: 27.8, forearmR: 28.2, waist: 81.5, hips: 95.5, thighL: 58.5, thighR: 58.5, calfL: 37, calfR: 37.2 },
  ];
  localStorage.setItem("overload_measurements", JSON.stringify({ entries: measurementEntries, unit: "cm" }));

  // ── Seed basic info ────────────────────────────────────────────────────
  localStorage.setItem("overload_basic_info", JSON.stringify({
    gender: "male", height: "178", heightUnit: "cm", weight: "78", weightUnit: "kg", goalWeight: "75", bodyFat: "16",
  }));

  // ── Seed weight log (gradual cut over 6 weeks) ────────────────────────
  const weightLogSeed = [
    { date: new Date(now.getTime() - 40 * DAY).toISOString(), weight: 82 },
    { date: new Date(now.getTime() - 35 * DAY).toISOString(), weight: 81.5 },
    { date: new Date(now.getTime() - 30 * DAY).toISOString(), weight: 81.2 },
    { date: new Date(now.getTime() - 25 * DAY).toISOString(), weight: 80.5 },
    { date: new Date(now.getTime() - 20 * DAY).toISOString(), weight: 80.1 },
    { date: new Date(now.getTime() - 15 * DAY).toISOString(), weight: 79.5 },
    { date: new Date(now.getTime() - 10 * DAY).toISOString(), weight: 79.0 },
    { date: new Date(now.getTime() - 5 * DAY).toISOString(), weight: 78.5 },
    { date: new Date(now.getTime() - 1 * DAY).toISOString(), weight: 78 },
  ];
  localStorage.setItem("overload_weight_log", JSON.stringify(weightLogSeed));

  // ── Seed body fat log (slow decrease) ─────────────────────────────────
  const bodyFatLogSeed = [
    { date: new Date(now.getTime() - 40 * DAY).toISOString(), bodyFat: 19.5 },
    { date: new Date(now.getTime() - 30 * DAY).toISOString(), bodyFat: 18.8 },
    { date: new Date(now.getTime() - 20 * DAY).toISOString(), bodyFat: 18.0 },
    { date: new Date(now.getTime() - 12 * DAY).toISOString(), bodyFat: 17.2 },
    { date: new Date(now.getTime() - 5 * DAY).toISOString(), bodyFat: 16.5 },
    { date: new Date(now.getTime() - 1 * DAY).toISOString(), bodyFat: 16.0 },
  ];
  localStorage.setItem("overload_bodyfat_log", JSON.stringify(bodyFatLogSeed));

  // ── Seed XP data (matching 16 demo sessions) ──────────────────────────
  // Approximate: 16 workouts × 50 base + volume/variety/long bonuses + milestones
  // first_workout=100, 10th=150, weekly consistency bonuses, etc.
  const seedXP = {
    totalXP: 1680,
    milestones: ["first_workout", "workout_10", "first_routine"],
  };
  localStorage.setItem("overload_xp_data", JSON.stringify(seedXP));

  localStorage.setItem("overload_guest_seeded", SEED_VERSION);
}

// ── Guest-local API implementation ──────────────────────────────────────────
const guestApi = {
  routines: {
    list: async (): Promise<Routine[]> => {
      seedGuestDataIfNeeded();
      return lsGet<Routine>(LS_ROUTINES);
    },
    create: async (routine: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Routine> => {
      const all = lsGet<Routine>(LS_ROUTINES);
      const now = new Date().toISOString();
      const newR: Routine = { ...routine, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as Routine;
      all.push(newR);
      lsSet(LS_ROUTINES, all);
      return newR;
    },
    update: async (id: string, data: Partial<Routine>): Promise<Routine> => {
      const all = lsGet<Routine>(LS_ROUTINES);
      const idx = all.findIndex((r: any) => r.id === id);
      if (idx === -1) throw new Error("Not found");
      all[idx] = { ...all[idx], ...data, id, updatedAt: new Date().toISOString() };
      lsSet(LS_ROUTINES, all);
      return all[idx];
    },
    delete: async (id: string): Promise<void> => {
      const all = lsGet<Routine>(LS_ROUTINES).filter((r: any) => r.id !== id);
      lsSet(LS_ROUTINES, all);
    },
  },
  sessions: {
    list: async (): Promise<WorkoutSession[]> => {
      seedGuestDataIfNeeded();
      const data = lsGet<WorkoutSession>(LS_SESSIONS);
      data.sort((a: any, b: any) =>
        new Date(b?.startTime ?? 0).getTime() - new Date(a?.startTime ?? 0).getTime()
      );
      return data;
    },
    save: async (session: WorkoutSession): Promise<WorkoutSession> => {
      const all = lsGet<WorkoutSession>(LS_SESSIONS);
      const s = { ...session, id: session.id || crypto.randomUUID() };
      const idx = all.findIndex((x: any) => x.id === s.id);
      if (idx !== -1) all[idx] = s; else all.push(s);
      lsSet(LS_SESSIONS, all);
      return s;
    },
    delete: async (id: string): Promise<void> => {
      const all = lsGet<WorkoutSession>(LS_SESSIONS).filter((s: any) => s.id !== id);
      lsSet(LS_SESSIONS, all);
    },
  },
  ai: {
    generateRoutine: async (_prompt: string): Promise<Routine> => {
      throw new Error("AI features require a signed-in account. Sign up to unlock AI-generated routines!");
    },
    getCoachingInsights: async (_sessions: WorkoutSession[]): Promise<string> => {
      throw new Error("AI coaching requires a signed-in account. Sign up to unlock AI insights!");
    },
  },
  auth: {
    signup: async () => { throw new Error("Not available in guest mode"); },
    deleteAccount: async () => { /* handled by AuthContext */ },
  },
};

// ── Remote API (Supabase Edge Function) ─────────────────────────────────────
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = publicAnonKey;
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) token = data.session.access_token;
  } catch {
    /* keep publicAnonKey */
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': publicAnonKey,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

const remoteApi = {
  routines: {
    list: (): Promise<Routine[]> =>
      request('/routines'),

    create: (routine: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Routine> =>
      request('/routines', { method: 'POST', body: JSON.stringify(routine) }),

    update: (id: string, data: Partial<Routine>): Promise<Routine> =>
      request(`/routines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id: string): Promise<void> =>
      request(`/routines/${id}`, { method: 'DELETE' }),
  },

  sessions: {
    list: (): Promise<WorkoutSession[]> =>
      request('/sessions'),

    save: (session: WorkoutSession): Promise<WorkoutSession> =>
      request('/sessions', { method: 'POST', body: JSON.stringify(session) }),

    delete: (id: string): Promise<void> =>
      request(`/sessions/${id}`, { method: 'DELETE' }),
  },

  ai: {
    generateRoutine: (prompt: string): Promise<Routine> =>
      request('/ai/generate-routine', { method: 'POST', body: JSON.stringify({ prompt }) }),

    getCoachingInsights: async (sessions: WorkoutSession[]): Promise<string> => {
      const data = await request<{ insights: string }>('/ai/coaching', {
        method: 'POST',
        body: JSON.stringify({ sessions }),
      });
      return data.insights;
    },
  },

  auth: {
    signup: (email: string, password: string, name: string): Promise<{ user: unknown }> =>
      request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) }),

    deleteAccount: (): Promise<void> =>
      request('/auth/delete-account', { method: 'DELETE' }),
  },
};

// ── Proxy API that delegates to guest or remote ──────────────────────────────
function createApiProxy() {
  const handler: ProxyHandler<typeof remoteApi> = {
    get(target, prop) {
      const namespace = _isGuest ? (guestApi as any)[prop] : (target as any)[prop];
      return namespace;
    },
  };
  return new Proxy(remoteApi, handler);
}

export const api = createApiProxy();