/**
 * Seed dummy data for a user. Uses Supabase anon key and signs in with email/password.
 *
 * Set in mobile/.env (do not commit real passwords):
 *   EXPO_PUBLIC_SUPABASE_URL=...
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
 *   SEED_USER_EMAIL=sarthakkumar131@gmail.com
 *   SEED_USER_PASSWORD=your_password
 *
 * Run from mobile directory (no need to put password in .env):
 *   SEED_USER_EMAIL=sarthakkumar131@gmail.com SEED_USER_PASSWORD=yourpass node scripts/seed-dummy-data.mjs
 * Or add SEED_USER_EMAIL and SEED_USER_PASSWORD to mobile/.env then:
 *   node scripts/seed-dummy-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const email = process.env.SEED_USER_EMAIL?.trim();
const password = process.env.SEED_USER_PASSWORD?.trim();

if (!supabaseUrl || !anonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}
if (!email || !password) {
  console.error('Set SEED_USER_EMAIL and SEED_USER_PASSWORD in mobile/.env to run the seed.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

function toISO(d) {
  return d.toISOString().replace('Z', '+00:00');
}

function addMinutes(d, m) {
  const out = new Date(d);
  out.setMinutes(out.getMinutes() + m);
  return out;
}

async function main() {
  console.log('Signing in as', email, '...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error('Auth failed:', authErr.message);
    process.exit(1);
  }
  const userId = auth.user.id;
  console.log('User id:', userId);

  // Ensure profile exists and set display name
  await supabase.from('profiles').upsert(
    { id: userId, display_name: 'Sarthak' },
    { onConflict: 'id' }
  );
  console.log('Profile upserted.');

  // XP
  await supabase.from('xp_data').upsert(
    { user_id: userId, total_xp: 1250, milestones: null },
    { onConflict: 'user_id' }
  );
  console.log('XP data upserted.');

  // Weight log (last 30 days)
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const { error } = await supabase.from('weight_log').insert({
      user_id: userId,
      date: d.toISOString().slice(0, 10),
      weight: 72 + (i % 3) * 0.2,
    });
    if (error) { /* ignore duplicate or constraint */ }
  }
  console.log('Weight log inserted.');

  // Routines
  const { data: r1 } = await supabase.from('routines').insert({
    user_id: userId,
    name: 'Push Day',
    description: 'Chest, shoulders, triceps',
  }).select('id').single();
  const { data: r2 } = await supabase.from('routines').insert({
    user_id: userId,
    name: 'Pull Day',
    description: 'Back and biceps',
  }).select('id').single();
  const { data: r3 } = await supabase.from('routines').insert({
    user_id: userId,
    name: 'Leg Day',
    description: 'Quads, hamstrings, calves',
  }).select('id').single();
  const routineIds = [r1?.id, r2?.id, r3?.id].filter(Boolean);
  console.log('Routines created:', routineIds.length);

  if (routineIds[0]) {
    await supabase.from('routine_exercises').insert([
      { routine_id: routineIds[0], name: 'Bench Press', muscle_group: 'Chest', target_sets: 4, target_reps: '8-10', rest_seconds: 90, sort_order: 0 },
      { routine_id: routineIds[0], name: 'Overhead Press', muscle_group: 'Shoulders', target_sets: 3, target_reps: '10', rest_seconds: 60, sort_order: 1 },
      { routine_id: routineIds[0], name: 'Tricep Pushdown', muscle_group: 'Arms', target_sets: 3, target_reps: '12', rest_seconds: 45, sort_order: 2 },
    ]);
  }
  if (routineIds[1]) {
    await supabase.from('routine_exercises').insert([
      { routine_id: routineIds[1], name: 'Barbell Row', muscle_group: 'Back', target_sets: 4, target_reps: '8', rest_seconds: 90, sort_order: 0 },
      { routine_id: routineIds[1], name: 'Lat Pulldown', muscle_group: 'Back', target_sets: 3, target_reps: '10', rest_seconds: 60, sort_order: 1 },
      { routine_id: routineIds[1], name: 'Barbell Curl', muscle_group: 'Arms', target_sets: 3, target_reps: '12', rest_seconds: 45, sort_order: 2 },
    ]);
  }
  if (routineIds[2]) {
    await supabase.from('routine_exercises').insert([
      { routine_id: routineIds[2], name: 'Squat', muscle_group: 'Legs', target_sets: 4, target_reps: '8-10', rest_seconds: 120, sort_order: 0 },
      { routine_id: routineIds[2], name: 'Romanian Deadlift', muscle_group: 'Legs', target_sets: 3, target_reps: '10', rest_seconds: 90, sort_order: 1 },
      { routine_id: routineIds[2], name: 'Calf Raise', muscle_group: 'Legs', target_sets: 3, target_reps: '15', rest_seconds: 45, sort_order: 2 },
    ]);
  }

  const routineNames = ['Push Day', 'Pull Day', 'Leg Day'];
  const exercisesByRoutine = [
    [{ name: 'Bench Press', muscle_group: 'Chest', sets: [[60, 10], [65, 8], [70, 8], [70, 6]] }, { name: 'Overhead Press', muscle_group: 'Shoulders', sets: [[40, 10], [42, 8], [42, 8]] }, { name: 'Tricep Pushdown', muscle_group: 'Arms', sets: [[25, 12], [27, 10], [27, 10]] }],
    [{ name: 'Barbell Row', muscle_group: 'Back', sets: [[50, 10], [55, 8], [55, 8]] }, { name: 'Lat Pulldown', muscle_group: 'Back', sets: [[45, 10], [50, 8], [50, 8]] }, { name: 'Barbell Curl', muscle_group: 'Arms', sets: [[20, 12], [22, 10], [22, 10]] }],
    [{ name: 'Squat', muscle_group: 'Legs', sets: [[80, 8], [85, 8], [90, 6], [90, 6]] }, { name: 'Romanian Deadlift', muscle_group: 'Legs', sets: [[60, 10], [65, 8], [65, 8]] }, { name: 'Calf Raise', muscle_group: 'Legs', sets: [[0, 15], [0, 15], [0, 15]] }],
  ];

  // Workout sessions over the last ~5 weeks so dashboard streak, volume chart, and recent show data.
  // Always include a session for TODAY (date when script runs) so the dashboard shows today as done.
  const now = new Date();
  const sessionsToCreate = [];

  // First: add a session for today (e.g. March 9)
  const today = new Date(now);
  today.setHours(9, 0, 0, 0);
  const todayRoutineIndex = 0;
  const todayEnd = addMinutes(today, 50);
  let todayVol = 0;
  exercisesByRoutine[todayRoutineIndex].forEach((ex) => {
    ex.sets.forEach(([wgt, reps]) => { todayVol += wgt * reps; });
  });
  sessionsToCreate.push({
    user_id: userId,
    routine_id: routineIds[todayRoutineIndex] || null,
    routine_name: routineNames[todayRoutineIndex],
    start_time: toISO(today),
    end_time: toISO(todayEnd),
    duration_seconds: 50 * 60,
    total_volume: Math.round(todayVol),
    notes: null,
  });

  // Then: past weeks (going back from yesterday)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  for (let w = 0; w < 5; w++) {
    const weekStart = new Date(yesterday);
    weekStart.setDate(weekStart.getDate() - w * 7);
    for (let d = 0; d < 3; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() - d);
      day.setHours(8 + d, 30, 0, 0);
      const routineIndex = (w * 3 + d) % 3;
      const end = addMinutes(day, 45 + d * 5);
      let totalVol = 0;
      exercisesByRoutine[routineIndex].forEach((ex) => {
        ex.sets.forEach(([wgt, reps]) => { totalVol += wgt * reps; });
      });
      sessionsToCreate.push({
        user_id: userId,
        routine_id: routineIds[routineIndex] || null,
        routine_name: routineNames[routineIndex],
        start_time: toISO(day),
        end_time: toISO(end),
        duration_seconds: (45 + d * 5) * 60,
        total_volume: Math.round(totalVol),
        notes: null,
      });
    }
  }

  for (const sess of sessionsToCreate) {
    const { data: sessionRow, error: sessErr } = await supabase.from('workout_sessions').insert(sess).select('id').single();
    if (sessErr) {
      console.warn('Session insert failed:', sessErr.message);
      continue;
    }
    const sessionId = sessionRow.id;
    const routineIndex = routineNames.indexOf(sess.routine_name);
    const exercises = exercisesByRoutine[routineIndex >= 0 ? routineIndex : 0];
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const { data: exRow, error: exErr } = await supabase.from('session_exercises').insert({
        session_id: sessionId,
        exercise_id: null,
        name: ex.name,
        muscle_group: ex.muscle_group,
        notes: null,
        sort_order: i,
      }).select('id').single();
      if (exErr) continue;
      for (const [weight, reps] of ex.sets) {
        await supabase.from('session_sets').insert({
          session_exercise_id: exRow.id,
          weight,
          reps,
          completed: true,
        });
      }
    }
  }
  console.log('Workout sessions and sets created:', sessionsToCreate.length);
  console.log('Done. Open the app and log in as', email, 'to see the dummy data.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
