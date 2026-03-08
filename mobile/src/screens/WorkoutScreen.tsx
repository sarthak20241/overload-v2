import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/tokens';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { useXP } from '../context/XPContext';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary';
import type { WorkoutSessionForXP } from '../services/xpEngine';

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const workout = useWorkout();
  const xp = useXP();
  const routineId = route.params?.routineId ?? 'new';
  const { exercises, currentIdx, setExercises, setCurrentIdx, prevPerf, startTime, elapsed, routineName, workoutNotes, clearWorkout } = workout;
  const currentEx = exercises[currentIdx];

  const [inputWeight, setInputWeight] = useState(0);
  const [inputReps, setInputReps] = useState(10);
  const [restEndTime, setRestEndTime] = useState<number | null>(null);
  const [restRemaining, setRestRemaining] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const restTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

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
      setInputReps(parseInt(currentEx.targetReps, 10) || 10);
    }
  }, [currentIdx, currentEx?.name, currentEx?.sets.length]);

  useEffect(() => {
    if (restEndTime === null) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
      setRestRemaining(rem);
      if (rem <= 0 && restTickRef.current) {
        clearInterval(restTickRef.current);
        restTickRef.current = null;
      }
    };
    tick();
    restTickRef.current = setInterval(tick, 1000);
    return () => {
      if (restTickRef.current) clearInterval(restTickRef.current);
    };
  }, [restEndTime]);

  const handleStartExercise = () => {
    const now = Date.now();
    setExercises((prev) =>
      prev.map((ex, i) => (i === currentIdx ? { ...ex, started: true, startedAt: now } : ex))
    );
    setRestEndTime(null);
  };

  const handleLogSet = () => {
    if (!currentEx?.started) return;
    const now = Date.now();
    const newSet = {
      id: `set-${now}-${Math.random().toString(36).slice(2)}`,
      weight: inputWeight,
      reps: inputReps,
      completed: true,
      loggedAt: now,
    };
    setExercises((prev) =>
      prev.map((ex, i) => (i === currentIdx ? { ...ex, sets: [...ex.sets, newSet] } : ex))
    );
    setRestEndTime(now + currentEx.restSeconds * 1000);
  };

  const handleFinishExercise = () => {
    const now = Date.now();
    setExercises((prev) =>
      prev.map((ex, i) => (i === currentIdx ? { ...ex, finished: true, finishedAt: now } : ex))
    );
    setRestEndTime(null);
    const nextUnfinished = exercises.findIndex((ex, i) => i > currentIdx && !ex.finished);
    if (nextUnfinished !== -1) setCurrentIdx(nextUnfinished);
  };

  const addExerciseFromLibrary = (name: string, muscleGroup: string) => {
    const newEx = {
      exerciseId: `ex-${Date.now()}`,
      name,
      muscleGroup,
      targetSets: 3,
      targetReps: '8-12',
      restSeconds: 90,
      sets: [],
      notes: '',
      started: false,
      finished: false,
    };
    setExercises((prev) => [...prev, newEx]);
    setCurrentIdx(exercises.length);
    setShowAddExercise(false);
  };

  const totalVolume = exercises.flatMap((e) => e.sets.map((s) => s.weight * s.reps)).reduce((a, b) => a + b, 0);

  const handleFinishWorkout = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { data: sessionRow, error: sessErr } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          routine_id: routineId === 'new' ? null : routineId,
          routine_name: routineName,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date().toISOString(),
          duration_seconds: elapsed,
          total_volume: totalVolume,
          notes: workoutNotes || null,
        })
        .select('id')
        .single();
      if (sessErr) throw sessErr;
      const sessionId = (sessionRow as { id: string }).id;

      const exercisesWithSets = exercises.filter((ex) => ex.sets.length > 0);
      for (let i = 0; i < exercisesWithSets.length; i++) {
        const ex = exercisesWithSets[i];
        const { data: sessExRow, error: exErr } = await supabase
          .from('session_exercises')
          .insert({
            session_id: sessionId,
            exercise_id: ex.exerciseId.startsWith('ex-') ? null : ex.exerciseId,
            name: ex.name,
            muscle_group: ex.muscleGroup ?? null,
            notes: ex.notes || null,
            sort_order: i,
          })
          .select('id')
          .single();
        if (exErr) throw exErr;
        const sessExId = (sessExRow as { id: string }).id;
        for (const s of ex.sets) {
          await supabase.from('session_sets').insert({
            session_exercise_id: sessExId,
            weight: s.weight,
            reps: s.reps,
            completed: true,
          });
        }
      }

      const currentSession: WorkoutSessionForXP = {
        id: sessionId,
        startTime: new Date(startTime).toISOString(),
        durationSeconds: elapsed,
        totalVolume,
        exercises: exercisesWithSets.map((ex) => ({
          name: ex.name,
          sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, completed: true })),
        })),
      };
      const { data: allRows } = await supabase
        .from('workout_sessions')
        .select('id, start_time, duration_seconds, total_volume, session_exercises(name, session_sets(weight, reps))')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });
      const allSessions: WorkoutSessionForXP[] = (allRows ?? []).map((row: any) => ({
        id: row.id,
        startTime: row.start_time,
        durationSeconds: row.duration_seconds ?? 0,
        totalVolume: row.total_volume ?? 0,
        exercises: (row.session_exercises ?? []).map((se: any) => ({
          name: se.name,
          sets: (se.session_sets ?? []).map((ss: any) => ({
            weight: ss.weight,
            reps: ss.reps,
            completed: true,
          })),
        })),
      }));
      await xp.awardWorkoutXP(currentSession, allSessions);

      clearWorkout();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  const isResting = restEndTime !== null && restRemaining > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing[3] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.accentText, fontSize: 16 }}>Done</Text>
        </TouchableOpacity>
        <Text style={[styles.timer, { color: colors.foreground }]}>{fmt(elapsed)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.navContentReserve + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No exercises. Add one to start.</Text>
            <TouchableOpacity
              onPress={() => setShowAddExercise(true)}
              style={[styles.addExBtn, { backgroundColor: colors.ctaBg }]}
            >
              <Text style={[styles.addExBtnText, { color: colors.ctaFg }]}>Add exercise</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {exercises.map((ex, idx) => (
              <View
                key={ex.exerciseId + idx}
                style={[
                  styles.exerciseCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: idx === currentIdx ? colors.ctaBg : colors.borderSubtle,
                    borderWidth: idx === currentIdx ? 2 : 1,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.exerciseHeader}
                  onPress={() => setCurrentIdx(idx)}
                  activeOpacity={0.8}
                >
                  <View style={styles.exerciseTitleRow}>
                    <Text style={[styles.exerciseName, { color: colors.foreground }]} numberOfLines={1}>
                      {ex.name || 'Unnamed'}
                    </Text>
                    {ex.finished && <Text style={[styles.finishedBadge, { color: colors.semanticSuccess }]}>Done</Text>}
                  </View>
                  {ex.muscleGroup ? (
                    <Text style={[styles.muscleGroup, { color: colors.mutedForeground }]}>{ex.muscleGroup}</Text>
                  ) : null}
                  <View style={styles.setsPreview}>
                    {ex.sets.slice(0, 5).map((s, i) => (
                      <Text key={s.id} style={[styles.setChip, { color: colors.textMuted }]}>
                        {s.weight}×{s.reps}
                      </Text>
                    ))}
                    {ex.sets.length > 5 && (
                      <Text style={[styles.setChip, { color: colors.textMuted }]}>+{ex.sets.length - 5}</Text>
                    )}
                  </View>
                </TouchableOpacity>

                {idx === currentIdx && (
                  <View style={[styles.currentExercisePanel, { borderTopColor: colors.borderSubtle }]}>
                    {!ex.started ? (
                      <TouchableOpacity
                        onPress={handleStartExercise}
                        style={[styles.cta, { backgroundColor: colors.ctaBg }]}
                      >
                        <Text style={[styles.ctaText, { color: colors.ctaFg }]}>Start exercise</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <View style={styles.inputRow}>
                          <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Weight</Text>
                            <TextInput
                              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                              value={String(inputWeight)}
                              onChangeText={(t) => setInputWeight(parseFloat(t) || 0)}
                              keyboardType="decimal-pad"
                            />
                          </View>
                          <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Reps</Text>
                            <TextInput
                              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                              value={String(inputReps)}
                              onChangeText={(t) => setInputReps(parseInt(t, 10) || 0)}
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={handleLogSet}
                          disabled={isResting}
                          style={[styles.cta, { backgroundColor: isResting ? colors.muted : colors.ctaBg }]}
                        >
                          <Text style={[styles.ctaText, { color: colors.ctaFg }]}>
                            {isResting ? `Rest ${restRemaining}s` : 'Log set'}
                          </Text>
                        </TouchableOpacity>
                        {ex.sets.length > 0 && (
                          <TouchableOpacity
                            onPress={handleFinishExercise}
                            style={[styles.finishExBtn, { borderColor: colors.border }]}
                          >
                            <Text style={{ color: colors.accentText, fontSize: 14, fontWeight: '600' }}>
                              Finish exercise
                            </Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>
            ))}

            {exercises.length > 0 && routineId === 'new' && (
              <TouchableOpacity
                onPress={() => setShowAddExercise(true)}
                style={[styles.addAnother, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.accentText, fontSize: 14 }}>+ Add exercise</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {exercises.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleFinishWorkout}
            disabled={saving}
            style={[styles.cta, styles.footerCta, { backgroundColor: colors.ctaBg }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.ctaFg} />
            ) : (
              <Text style={[styles.ctaText, { color: colors.ctaFg }]}>Finish Workout</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {showAddExercise && (
        <View style={[styles.addExModal, { backgroundColor: colors.overlay }]}>
          <View style={[styles.addExSheet, { backgroundColor: colors.elevated, paddingTop: insets.top + spacing[4] }]}>
            <View style={styles.addExHeader}>
              <Text style={[styles.addExTitle, { color: colors.foreground }]}>Add exercise</Text>
              <TouchableOpacity onPress={() => setShowAddExercise(false)}>
                <Text style={{ color: colors.accentText }}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.addExList}>
              {EXERCISE_LIBRARY.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.addExItem, { borderBottomColor: colors.borderSubtle }]}
                  onPress={() => addExerciseFromLibrary(item.name, item.muscleGroup)}
                >
                  <Text style={{ color: colors.foreground }}>{item.name}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.muscleGroup}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.pageX,
    paddingBottom: spacing[3],
  },
  timer: { fontSize: 20, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.pageX, paddingTop: spacing[4] },
  emptyState: { paddingVertical: spacing[8], alignItems: 'center' },
  emptyText: { fontSize: 14, marginBottom: spacing[4] },
  addExBtn: { paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radius.buttonCta },
  addExBtnText: { fontSize: 14, fontWeight: '700' },
  exerciseCard: {
    borderRadius: radius.cardCustom,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  exerciseHeader: {},
  exerciseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  exerciseName: { fontSize: 16, fontWeight: '600' },
  finishedBadge: { fontSize: 12, fontWeight: '600' },
  muscleGroup: { fontSize: 12, marginTop: 2 },
  setsPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing[2] },
  setChip: { fontSize: 11 },
  currentExercisePanel: { marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1 },
  inputRow: { flexDirection: 'row', gap: spacing[4], marginBottom: spacing[3] },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: radius.inputCustom,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 16,
  },
  cta: {
    borderRadius: radius.buttonCta,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { fontSize: 14, fontWeight: '900' },
  finishExBtn: {
    marginTop: spacing[2],
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  addAnother: {
    borderWidth: 1,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  footer: {
    paddingHorizontal: spacing.pageX,
    paddingVertical: spacing[3],
    paddingBottom: spacing[8],
    borderTopWidth: 1,
  },
  footerCta: { width: '100%' },
  addExModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  addExSheet: {
    borderTopLeftRadius: radius.sheetTop,
    borderTopRightRadius: radius.sheetTop,
    maxHeight: '70%',
    paddingHorizontal: spacing.pageX,
    paddingBottom: spacing[6],
  },
  addExHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  addExTitle: { fontSize: 18, fontWeight: '600' },
  addExList: { maxHeight: 320 },
  addExItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
});
