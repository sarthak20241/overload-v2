import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius, routineColors } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type RoutineRow = Database['public']['Tables']['routines']['Row'] & {
  routine_exercises?: { id: string }[];
};

interface WorkoutSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectRoutine: (id: string) => void;
}

export default function WorkoutSelectorModal({
  visible,
  onClose,
  onSelectRoutine,
}: WorkoutSelectorModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('routines')
      .select('*, routine_exercises(id)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setRoutines(data ?? []);
        }
      })
      .then(
        () => { if (!cancelled) setLoading(false); },
        () => { if (!cancelled) setLoading(false); }
      );
    return () => { cancelled = true; };
  }, [visible, user?.id]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
        <View style={[styles.handle, { backgroundColor: colors.handle }]} />
        <View style={styles.header}>
          <View>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Start Workout</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
              Choose a routine or start blank
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.glow3 }]}
          >
            <Text style={{ color: colors.foreground, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => onSelectRoutine('new')}
          style={[styles.blankRow, { backgroundColor: colors.primarySubtle, borderColor: colors.primaryBorder }]}
        >
          <Text style={[styles.blankTitle, { color: colors.accentText }]}>Blank Workout</Text>
          <Text style={[styles.blankSub, { color: colors.mutedForeground }]}>Add exercises as you go</Text>
        </TouchableOpacity>
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>or from routine</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
        </View>
        {loading ? (
          <ActivityIndicator color={colors.accentText} style={{ marginVertical: spacing[6] }} />
        ) : (
          <FlatList
            data={routines}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const color = routineColors[index % routineColors.length];
              return (
                <TouchableOpacity
                  onPress={() => onSelectRoutine(item.id)}
                  style={[styles.routineRow, { backgroundColor: colors.muted, borderColor: colors.borderLight }]}
                >
                  <View style={[styles.routineDot, { backgroundColor: color }]} />
                  <View style={styles.routineBody}>
                    <Text style={[styles.routineName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.routineCount, { color: colors.mutedForeground }]}>
                      {item.routine_exercises?.length ?? 0} exercises
                    </Text>
                  </View>
                  <Text style={{ color: colors.textDim }}>▶</Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: spacing[8] }}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textMuted }]}>No routines yet.</Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.sheetTop,
    borderTopRightRadius: radius.sheetTop,
    borderTopWidth: 1,
    maxHeight: '80%',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSubtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blankRow: {
    borderWidth: 1,
    borderRadius: radius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  blankTitle: { fontSize: 14, fontWeight: '600' },
  blankSub: { fontSize: 12, marginTop: 2 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, marginHorizontal: spacing[3] },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  routineDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing[3] },
  routineBody: { flex: 1 },
  routineName: { fontSize: 14, fontWeight: '600' },
  routineCount: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', paddingVertical: spacing[6], fontSize: 14 },
});
