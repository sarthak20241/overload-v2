import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, FlatList } from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { format, subWeeks } from 'date-fns';
import type { Database } from '../types/database';

type SessionRow = Database['public']['Tables']['workout_sessions']['Row'];

type SessionWithExercises = SessionRow & {
  session_exercises?: { name: string; session_sets?: { weight: number; reps: number }[] }[];
};

const CHART_WIDTH = Dimensions.get('window').width - spacing.pageX * 2 - 32;
const CHART_HEIGHT = 180;

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithExercises[]>([]);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const since = subWeeks(new Date(), 6).toISOString();
    supabase
      .from('workout_sessions')
      .select('id, start_time, total_volume, session_exercises(name, session_sets(weight, reps))')
      .eq('user_id', user.id)
      .gte('start_time', since)
      .order('start_time', { ascending: true })
      .then(({ data }) => {
        const rows = (data ?? []) as SessionWithExercises[];
        setSessions(rows);
        const names = new Set<string>();
        rows.forEach((s) => s.session_exercises?.forEach((e) => names.add(e.name)));
        setExerciseNames(Array.from(names).sort());
      });
  }, [user?.id]);

  const volumeByWeek = useMemo(() => {
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

  const exerciseVolumeByWeek = useMemo(() => {
    if (!selectedExercise) return null;
    const map: { label: string; volume: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = subWeeks(new Date(), i + 1);
      const end = subWeeks(new Date(), i);
      let total = 0;
      sessions
        .filter((s) => {
          const t = new Date(s.start_time).getTime();
          return t >= start.getTime() && t < end.getTime();
        })
        .forEach((s) => {
          const ex = s.session_exercises?.find((e) => e.name === selectedExercise);
          if (ex?.session_sets) {
            total += ex.session_sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
          }
        });
      map.push({ label: format(start, 'MMM d'), volume: total });
    }
    return map;
  }, [sessions, selectedExercise]);

  const chartData = selectedExercise && exerciseVolumeByWeek ? exerciseVolumeByWeek : volumeByWeek;
  const chartTitle = selectedExercise ? `Volume: ${selectedExercise}` : 'Volume (all)';
  const maxVol = Math.max(1, ...chartData.map((d) => d.volume));
  const points = chartData
    .map((d, i) => {
      const x = (i / (chartData.length - 1 || 1)) * CHART_WIDTH;
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

      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={[styles.pickerBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
      >
        <Text style={[styles.pickerBtnText, { color: colors.foreground }]}>
          {selectedExercise ? selectedExercise : 'All exercises'}
        </Text>
        <Text style={{ color: colors.mutedForeground }}>▼</Text>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.chartTitle, { color: colors.foreground }]}>{chartTitle}</Text>
        <Svg width={CHART_WIDTH + 32} height={CHART_HEIGHT + 24}>
          <Line
            x1={0}
            y1={CHART_HEIGHT}
            x2={CHART_WIDTH}
            y2={CHART_HEIGHT}
            stroke={colors.chartGrid}
            strokeWidth={1}
          />
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
              {chartData.map((d, i) => {
                const x = (i / (chartData.length - 1 || 1)) * CHART_WIDTH;
                const y = CHART_HEIGHT - (d.volume / maxVol) * (CHART_HEIGHT - 20);
                return (
                  <Circle key={d.label} cx={x} cy={y} r={4} fill={colors.chart1} />
                );
              })}
            </>
          )}
        </Svg>
        <View style={styles.labels}>
          {chartData.map((d) => (
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

      <Modal visible={showPicker} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        />
        <View style={[styles.pickerSheet, { backgroundColor: colors.elevated, paddingTop: insets.top + spacing[4] }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Filter by exercise</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={{ color: colors.accentText }}>Done</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.pickerRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => { setSelectedExercise(null); setShowPicker(false); }}
          >
            <Text style={{ color: colors.foreground }}>All exercises</Text>
          </TouchableOpacity>
          <FlatList
            data={exerciseNames}
            keyExtractor={(item) => item}
            style={styles.pickerList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerRow, { borderBottomColor: colors.borderSubtle }]}
                onPress={() => { setSelectedExercise(item); setShowPicker(false); }}
              >
                <Text style={{ color: colors.foreground }}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: spacing[4] },
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing[4],
  },
  pickerBtnText: { fontSize: 14, fontWeight: '500' },
  card: {
    borderRadius: radius.cardCustom,
    borderWidth: 1,
    padding: spacing[4],
  },
  chartTitle: { fontSize: 14, fontWeight: '600', marginBottom: spacing[2] },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: { fontSize: 9 },
  empty: { textAlign: 'center', marginTop: spacing[6], fontSize: 14 },
  modalOverlay: { flex: 1 },
  pickerSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.sheetTop,
    borderTopRightRadius: radius.sheetTop,
    maxHeight: '60%',
    paddingHorizontal: spacing.pageX,
    paddingBottom: spacing[6],
  },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  pickerTitle: { fontSize: 18, fontWeight: '600' },
  pickerList: { maxHeight: 280 },
  pickerRow: {
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
});
