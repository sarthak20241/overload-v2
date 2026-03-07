import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { format, subWeeks } from 'date-fns';
import type { Database } from '../types/database';

type SessionRow = Database['public']['Tables']['workout_sessions']['Row'];

const CHART_WIDTH = Dimensions.get('window').width - spacing.pageX * 2 - 32;
const CHART_HEIGHT = 180;

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const since = subWeeks(new Date(), 6).toISOString();
    supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', since)
      .order('start_time', { ascending: true })
      .then(({ data }) => setSessions(data ?? []));
  }, [user?.id]);

  const volumeByWeek = React.useMemo(() => {
    const map: { label: string; volume: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = subWeeks(new Date(), i + 1);
      const end = subWeeks(new Date(), i);
      const total = sessions
        .filter((s) => {
          const t = new Date(s.start_time).getTime();
          return t >= start.getTime() && t < end.getTime();
        })
        .reduce((sum, s) => sum + Number(s.total_volume), 0);
      map.push({
        label: format(start, 'MMM d'),
        volume: total,
      });
    }
    return map;
  }, [sessions]);

  const maxVol = Math.max(1, ...volumeByWeek.map((d) => d.volume));
  const points = volumeByWeek
    .map((d, i) => {
      const x = (i / (volumeByWeek.length - 1 || 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - (d.volume / maxVol) * (CHART_HEIGHT - 20);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.pageTop,
        paddingBottom: spacing.navContentReserve + spacing[6],
        paddingHorizontal: spacing.pageX,
      }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Volume over the last 6 weeks
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <Svg width={CHART_WIDTH + 32} height={CHART_HEIGHT + 24}>
          {/* Grid line */}
          <Line
            x1={0}
            y1={CHART_HEIGHT}
            x2={CHART_WIDTH}
            y2={CHART_HEIGHT}
            stroke={colors.chartGrid}
            strokeWidth={1}
          />
          {/* Volume line */}
          {points.trim() && (
            <>
              <Polyline
                points={points}
                fill="none"
                stroke={colors.chart1}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {volumeByWeek.map((d, i) => {
                const x = (i / (volumeByWeek.length - 1 || 1)) * CHART_WIDTH;
                const y = CHART_HEIGHT - (d.volume / maxVol) * (CHART_HEIGHT - 20);
                return (
                  <Circle
                    key={d.label}
                    cx={x}
                    cy={y}
                    r={4}
                    fill={colors.chart1}
                  />
                );
              })}
            </>
          )}
        </Svg>
        <View style={styles.labels}>
          {volumeByWeek.map((d) => (
            <Text key={d.label} style={[styles.label, { color: colors.chartTick }]} numberOfLines={1}>
              {d.label}
            </Text>
          ))}
        </View>
      </View>

      {sessions.length === 0 && (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Complete workouts to see volume trends.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: spacing[4] },
  card: {
    borderRadius: radius.cardCustom,
    borderWidth: 1,
    padding: spacing[4],
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: { fontSize: 9 },
  empty: { textAlign: 'center', marginTop: spacing[6], fontSize: 14 },
});
