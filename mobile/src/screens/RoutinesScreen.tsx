import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius, routineColors } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type RoutineRow = Database['public']['Tables']['routines']['Row'] & {
  routine_exercises?: { id: string }[];
};

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [routines, setRoutines] = useState<RoutineRow[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('routines')
      .select('*, routine_exercises(id)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setRoutines(data ?? []));
  }, [user?.id]);

  const renderItem = ({ item, index }: { item: RoutineRow; index: number }) => {
    const color = routineColors[index % routineColors.length];
    return (
      <TouchableOpacity
        onPress={() => {}}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.borderSubtle },
        ]}
      >
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <View style={styles.cardBody}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>
            {item.routine_exercises?.length ?? 0} exercises
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.pageTop }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Routines</Text>
      </View>
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: spacing.navContentReserve + spacing[6] },
        ]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No routines. Create one to get started.
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.cardCustom,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing[3] },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', paddingVertical: spacing[8], fontSize: 14 },
});
