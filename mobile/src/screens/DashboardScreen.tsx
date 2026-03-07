import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius, typography } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<{ start_time: string }[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('workout_sessions')
      .select('start_time')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(100)
      .then(({ data }) => setSessions(data ?? []));
  }, [user?.id]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + spacing.pageTop, paddingBottom: spacing.navContentReserve + spacing[6] }}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>Hey</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user?.user_metadata?.full_name || 'Athlete'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={[styles.avatar, { backgroundColor: colors.ctaBg }]}>
            <Text style={[styles.avatarText, { color: colors.ctaFg }]}>
              {(user?.user_metadata?.full_name || 'A').charAt(0).toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.weekRow, { marginHorizontal: spacing.pageX, marginBottom: spacing[6] }]}>
        {weekDays.map((day) => {
          const hasWorkout = sessions.some((s) => isSameDay(new Date(s.start_time), day));
          const today = isToday(day);
          return (
            <View key={day.toISOString()} style={styles.dayCol}>
              <Text
                style={[
                  styles.dayLabel,
                  { color: today ? colors.accentText : colors.textMuted },
                ]}
              >
                {format(day, 'EEE').charAt(0)}
              </Text>
              <View
                style={[
                  styles.dayCircle,
                  {
                    backgroundColor: hasWorkout
                      ? colors.ctaBg
                      : today
                        ? colors.primarySubtle
                        : colors.muted,
                    borderWidth: today && !hasWorkout ? 1 : 0,
                    borderColor: colors.primaryBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: hasWorkout ? colors.ctaFg : colors.foreground,
                    },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle, marginHorizontal: spacing.pageX }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Recent Workouts</Text>
        {sessions.length === 0 ? (
          <Text style={[styles.muted, { color: colors.textMuted }]}>No workouts yet. Tap Play to start.</Text>
        ) : (
          sessions.slice(0, 5).map((s) => (
            <View key={s.start_time} style={[styles.sessionRow, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.sessionDate, { color: colors.foreground }]}>
                {format(new Date(s.start_time), 'MMM d')}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.pageX,
    marginBottom: spacing[6],
  },
  greeting: { fontSize: 14 },
  name: { fontSize: 24, fontWeight: '700' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center' },
  dayLabel: { fontSize: 10, marginBottom: 4 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNum: { fontSize: 12, fontWeight: '700' },
  card: {
    borderRadius: radius.cardCustom,
    borderWidth: 1,
    padding: spacing[4],
  },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing[3] },
  sessionRow: { paddingVertical: spacing[2], borderTopWidth: 1 },
  sessionDate: { fontSize: 14 },
  muted: { fontSize: 14 },
});
