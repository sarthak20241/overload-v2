import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import type { Database } from '../types/database';

type SessionRow = Database['public']['Tables']['workout_sessions']['Row'];

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .then(({ data }) => setSessions(data ?? []));
  }, [user?.id]);

  const renderItem = ({ item }: { item: SessionRow }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.borderSubtle },
      ]}
    >
      <Text style={[styles.name, { color: colors.foreground }]}>{item.routine_name}</Text>
      <Text style={[styles.muted, { color: colors.mutedForeground }]}>
        {format(new Date(item.start_time), 'MMM d, yyyy')} · {fmtDuration(item.duration_seconds)} · {item.total_volume} kg
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.pageTop }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
      </View>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: spacing.navContentReserve + spacing[6] },
        ]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>No workouts yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.pageX, paddingBottom: spacing[4] },
  title: { fontSize: 24, fontWeight: '700' },
  list: { paddingHorizontal: spacing.pageX, paddingTop: spacing[2] },
  card: {
    borderRadius: radius.cardCustom,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  name: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 12, marginTop: 4 },
  empty: { textAlign: 'center', paddingVertical: spacing[8], fontSize: 14 },
});
