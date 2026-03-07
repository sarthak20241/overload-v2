import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/tokens';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const workout = useWorkout();
  const routineId = route.params?.routineId ?? 'new';
  const elapsed = workout.elapsed;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handleFinish = async () => {
    if (!user?.id) return;
    await supabase.from('workout_sessions').insert({
      user_id: user.id,
      routine_id: routineId === 'new' ? null : routineId,
      routine_name: workout.routineName,
      start_time: new Date(Date.now() - elapsed * 1000).toISOString(),
      end_time: new Date().toISOString(),
      duration_seconds: elapsed,
      total_volume: 0,
    } as any);
    workout.endWorkout();
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[3] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.accentText, fontSize: 16 }}>Done</Text>
        </TouchableOpacity>
        <Text style={[styles.timer, { color: colors.foreground }]}>{fmt(elapsed)}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: spacing[8] }}
      >
        <Text style={[styles.placeholder, { color: colors.textMuted }]}>
          {routineId === 'new' ? 'Blank workout' : `Routine ${routineId}`}
        </Text>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleFinish}
          style={[styles.cta, { backgroundColor: colors.ctaBg }]}
        >
          <Text style={[styles.ctaText, { color: colors.ctaFg }]}>Finish Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  scroll: { flex: 1, paddingHorizontal: spacing.pageX },
  placeholder: { fontSize: 14, marginTop: spacing[4] },
  footer: {
    paddingHorizontal: spacing.pageX,
    paddingVertical: spacing[3],
    paddingBottom: spacing[8],
    borderTopWidth: 1,
  },
  cta: {
    borderRadius: radius.buttonCta,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { fontSize: 14, fontWeight: '900' },
});
