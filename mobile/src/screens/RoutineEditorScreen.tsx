import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary';
import type { RoutineExercise } from '../types/app';
import type { Database } from '../types/database';

type RoutineRow = Database['public']['Tables']['routines']['Row'];
type RoutineExerciseRow = Database['public']['Tables']['routine_exercises']['Row'];

function toEditorExercise(row: RoutineExerciseRow): RoutineExercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group ?? undefined,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    restSeconds: row.rest_seconds,
    notes: row.notes ?? undefined,
  };
}

function newExercise(): RoutineExercise {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: '',
    muscleGroup: '',
    targetSets: 3,
    targetReps: '8-12',
    restSeconds: 90,
    notes: '',
  };
}

export default function RoutineEditorScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const route = useRoute<{ params: { routineId?: string } }>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const routineId = route.params?.routineId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<RoutineExercise[]>([newExercise()]);
  const [loading, setLoading] = useState(!!routineId);
  const [saving, setSaving] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const isCreate = !routineId;

  useEffect(() => {
    if (!user?.id) return;
    if (isCreate) {
      setExercises([newExercise()]);
      setLoading(false);
      return;
    }
    (async () => {
      const { data: routine, error: rErr } = await supabase
        .from('routines')
        .select('*')
        .eq('id', routineId!)
        .eq('user_id', user.id)
        .single();
      if (rErr || !routine) {
        setLoading(false);
        return;
      }
      setName((routine as RoutineRow).name);
      setDescription((routine as RoutineRow).description ?? '');

      const { data: exRows } = await supabase
        .from('routine_exercises')
        .select('*')
        .eq('routine_id', routineId!)
        .order('sort_order', { ascending: true });
      setExercises(
        (exRows?.length ? exRows : []).map((r: RoutineExerciseRow) => toEditorExercise(r))
      );
      if (!exRows?.length) setExercises([newExercise()]);
      setLoading(false);
    })();
  }, [user?.id, routineId, isCreate]);

  const addExercise = () => {
    setExercises((prev) => [...prev, newExercise()]);
  };

  const pickFromLibrary = (entry: { name: string; muscleGroup: string }) => {
    if (editingIndex !== null) {
      setExercises((prev) =>
        prev.map((ex, i) =>
          i === editingIndex ? { ...ex, name: entry.name, muscleGroup: entry.muscleGroup } : ex
        )
      );
    } else {
      setExercises((prev) => [
        ...prev,
        {
          ...newExercise(),
          name: entry.name,
          muscleGroup: entry.muscleGroup,
        },
      ]);
    }
    setPickerVisible(false);
    setEditingIndex(null);
    setSearch('');
  };

  const updateExercise = (index: number, patch: Partial<RoutineExercise>) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex))
    );
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [newExercise()];
    });
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setExercises((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const moveDown = (index: number) => {
    if (index >= exercises.length - 1) return;
    setExercises((prev) => {
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Missing name', 'Enter a routine name.');
      return;
    }
    const validExercises = exercises.filter((e) => e.name.trim());
    if (validExercises.length === 0) {
      Alert.alert('Add exercises', 'Add at least one exercise.');
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      if (isCreate) {
        const { data: routine, error: rErr } = await supabase
          .from('routines')
          .insert({
            user_id: user.id,
            name: trimmedName,
            description: description.trim() || null,
          })
          .select('id')
          .single();
        if (rErr) throw rErr;
        const rid = (routine as { id: string }).id;
        await supabase.from('routine_exercises').insert(
          validExercises.map((ex, i) => ({
            routine_id: rid,
            name: ex.name.trim(),
            muscle_group: ex.muscleGroup || null,
            target_sets: ex.targetSets,
            target_reps: ex.targetReps,
            rest_seconds: ex.restSeconds,
            notes: ex.notes?.trim() || null,
            sort_order: i,
          }))
        );
        navigation.goBack();
        return;
      }
      await supabase
        .from('routines')
        .update({
          name: trimmedName,
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', routineId!)
        .eq('user_id', user.id);
      await supabase.from('routine_exercises').delete().eq('routine_id', routineId!);
      await supabase.from('routine_exercises').insert(
        validExercises.map((ex, i) => ({
          routine_id: routineId!,
          name: ex.name.trim(),
          muscle_group: ex.muscleGroup || null,
          target_sets: ex.targetSets,
          target_reps: ex.targetReps,
          rest_seconds: ex.restSeconds,
          notes: ex.notes?.trim() || null,
          sort_order: i,
        }))
      );
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save routine');
    } finally {
      setSaving(false);
    }
  };

  const deleteRoutine = () => {
    if (isCreate) return;
    Alert.alert(
      'Delete routine',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            await supabase.from('routine_exercises').delete().eq('routine_id', routineId!);
            await supabase.from('routines').delete().eq('id', routineId!).eq('user_id', user.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const filteredLibrary = EXERCISE_LIBRARY.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.muscleGroup.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.ctaBg} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing[3] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.accentText, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isCreate ? 'New routine' : 'Edit routine'}
        </Text>
        <TouchableOpacity onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.ctaBg} />
          ) : (
            <Text style={{ color: colors.accentText, fontSize: 16, fontWeight: '600' }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.navContentReserve + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push Day"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: spacing[4] }]}>
          Description (optional)
        </Text>
        <TextInput
          style={[styles.input, styles.inputMultiline, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Notes about this routine"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <View style={styles.exercisesHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Exercises</Text>
          <TouchableOpacity onPress={() => { setEditingIndex(null); setPickerVisible(true); }}>
            <Text style={{ color: colors.accentText, fontSize: 14, fontWeight: '600' }}>Add from library</Text>
          </TouchableOpacity>
        </View>

        {exercises.map((ex, index) => (
          <View
            key={ex.id}
            style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
          >
            <View style={styles.exerciseRow}>
              <View style={styles.moveButtons}>
                <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0} style={styles.moveBtn}>
                  <Text style={{ color: index === 0 ? colors.textMuted : colors.foreground, fontSize: 12 }}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveDown(index)} disabled={index === exercises.length - 1} style={styles.moveBtn}>
                  <Text style={{ color: index === exercises.length - 1 ? colors.textMuted : colors.foreground, fontSize: 12 }}>↓</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.exerciseNameRow}
                onPress={() => { setEditingIndex(index); setPickerVisible(true); }}
              >
                <Text style={[styles.exerciseName, { color: colors.foreground }]} numberOfLines={1}>
                  {ex.name || 'Select exercise...'}
                </Text>
                {ex.muscleGroup ? (
                  <Text style={[styles.muscleGroup, { color: colors.mutedForeground }]}>{ex.muscleGroup}</Text>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeExercise(index)} style={styles.removeBtn}>
                <Text style={{ color: colors.destructive, fontSize: 14 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.exerciseFields, { borderTopColor: colors.borderSubtle }]}>
              <View style={styles.fieldRow}>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Sets</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                    value={String(ex.targetSets)}
                    onChangeText={(t) => updateExercise(index, { targetSets: parseInt(t, 10) || 0 })}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reps</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                    value={ex.targetReps}
                    onChangeText={(t) => updateExercise(index, { targetReps: t })}
                    placeholder="8-12"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Rest (s)</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                    value={String(ex.restSeconds)}
                    onChangeText={(t) => updateExercise(index, { restSeconds: parseInt(t, 10) || 0 })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={styles.notesRow}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.notesInput, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                  value={ex.notes ?? ''}
                  onChangeText={(t) => updateExercise(index, { notes: t })}
                  placeholder="Optional"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </View>
        ))}

        {!isCreate && (
          <TouchableOpacity style={[styles.deleteBtn, { marginTop: spacing[6] }]} onPress={deleteRoutine}>
            <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete routine</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.elevated, paddingTop: insets.top + spacing[4] }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choose exercise</Text>
              <TouchableOpacity onPress={() => { setPickerVisible(false); setEditingIndex(null); setSearch(''); }}>
                <Text style={{ color: colors.accentText }}>Done</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.searchInput, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
              placeholderTextColor={colors.textMuted}
            />
            <FlatList
              data={
                search.trim() && !filteredLibrary.some((e) => e.name.toLowerCase() === search.toLowerCase())
                  ? [...filteredLibrary, { name: search.trim(), muscleGroup: 'Other' }]
                  : filteredLibrary
              }
              keyExtractor={(item) => item.name}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: colors.borderSubtle }]}
                  onPress={() => pickFromLibrary(item)}
                >
                  <Text style={{ color: colors.foreground }}>{item.name}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.muscleGroup}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.pageX,
    paddingBottom: spacing[3],
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.pageX, paddingTop: spacing[4] },
  label: { fontSize: 12, marginBottom: spacing[1], fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: radius.inputCustom,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 16,
  },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  searchInput: { marginBottom: spacing[2] },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  exerciseCard: {
    borderWidth: 1,
    borderRadius: radius.cardCustom,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  exerciseRow: { flexDirection: 'row', alignItems: 'center' },
  moveButtons: { marginRight: spacing[2] },
  moveBtn: { padding: spacing[1] },
  exerciseNameRow: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '600' },
  muscleGroup: { fontSize: 12, marginTop: 2 },
  removeBtn: { padding: spacing[2] },
  exerciseFields: { marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1 },
  fieldRow: { flexDirection: 'row', gap: spacing[2] },
  field: { flex: 1 },
  fieldLabel: { fontSize: 11, marginBottom: 4 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    fontSize: 14,
  },
  notesRow: { marginTop: spacing[3] },
  notesInput: { marginTop: 4 },
  deleteBtn: { alignItems: 'center', paddingVertical: spacing[3] },
  deleteBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: radius.sheetTop, borderTopRightRadius: radius.sheetTop, maxHeight: '80%', paddingHorizontal: spacing.pageX, paddingBottom: spacing[6] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  pickerList: { maxHeight: 320 },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
});
