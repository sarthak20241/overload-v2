import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import {
  Dumbbell,
  Flame,
  TrendingUp,
  Activity,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius, routineColors } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useXP } from '../context/XPContext';
import { useWorkoutSelector } from '../context/WorkoutSelectorContext';
import { supabase } from '../lib/supabase';
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  isSameDay,
  startOfDay,
  subDays,
  subWeeks,
} from 'date-fns';

const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#ef4444',
  Back: '#3b82f6',
  Shoulders: '#f59e0b',
  Arms: '#a855f7',
  Legs: '#10b981',
  Core: '#f97316',
  Glutes: '#14b8a6',
  Other: '#6b7280',
};

type SessionRow = {
  id: string;
  start_time: string;
  total_volume: number;
  duration_seconds: number;
  routine_name: string;
  session_exercises?: {
    name: string;
    muscle_group: string | null;
    session_sets?: { reps: number }[];
  }[];
};

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

function fmtDuration(sec: number) {
  const totalM = Math.floor(sec / 60);
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  if (h > 0) return `${h}h ${m}m`;
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const CARD_GAP = 12;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAD = spacing.pageX;
const GRID_WIDTH = SCREEN_WIDTH - PAD * 2;
const CARD_WIDTH = (GRID_WIDTH - CARD_GAP) / 2;
const DONUT_SIZE = 110;
const VOLUME_CHART_WIDTH = CARD_WIDTH - 24;
const VOLUME_CHART_HEIGHT = 72;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const xp = useXP();
  const { openWorkoutSelector } = useWorkoutSelector();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const chartLineProgress = useRef(new Animated.Value(0)).current;
  const donutScale = useRef(new Animated.Value(0.85)).current;
  const donutOpacity = useRef(new Animated.Value(0)).current;
  const xpBarProgress = useRef(new Animated.Value(0)).current;
  const [activeSegment, setActiveSegment] = useState<{
    name: string;
    value: number;
    color: string;
  } | null>(null);
  const [selectedVolumePoint, setSelectedVolumePoint] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const volumeAnimationStarted = useRef(false);
  const donutAnimationStarted = useRef(false);
  useEffect(() => {
    Animated.timing(xpBarProgress, {
      toValue: Math.min(1, xp.progress),
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [xp.progress]);

  useEffect(() => {
    if (!user?.id) return;
    const since = subWeeks(new Date(), 6).toISOString();
    supabase
      .from('workout_sessions')
      .select(
        'id, start_time, total_volume, duration_seconds, routine_name, session_exercises(name, muscle_group, session_sets(reps))'
      )
      .eq('user_id', user.id)
      .gte('start_time', since)
      .order('start_time', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.warn('Dashboard sessions (with nested):', error.message);
          // Fallback: fetch without nested relations (stats still work from total_volume / duration_seconds)
          supabase
            .from('workout_sessions')
            .select('id, start_time, total_volume, duration_seconds, routine_name')
            .eq('user_id', user.id)
            .gte('start_time', since)
            .order('start_time', { ascending: false })
            .then(({ data: fallbackData }) => setSessions((fallbackData as SessionRow[]) ?? []));
          return;
        }
        setSessions((data as SessionRow[]) ?? []);
      });
  }, [user?.id]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  // Use "last 7 days" for stats so analytics show even if week boundary or timezone differs
  const sevenDaysAgo = subDays(startOfDay(new Date()), 7);
  const thisWeekSessions = sessions.filter((s) => new Date(s.start_time) >= sevenDaysAgo);

  let streak = 0;
  let checkDate = startOfDay(new Date());
  const sessionDates = sessions.map((s) => startOfDay(new Date(s.start_time)));
  while (sessionDates.some((d) => isSameDay(d, checkDate))) {
    streak++;
    checkDate = subDays(checkDate, 1);
  }

  const volumeThisWeek = thisWeekSessions.reduce((sum, s) => sum + (s.total_volume ?? 0), 0);
  const workoutsThisWeek = thisWeekSessions.length;

  let totalSets = 0;
  let totalReps = 0;
  const muscleMap: Record<string, number> = {};
  thisWeekSessions.forEach((s) => {
    s.session_exercises?.forEach((ex) => {
      const group = ex.muscle_group || 'Other';
      const setCount = ex.session_sets?.length ?? 0;
      muscleMap[group] = (muscleMap[group] || 0) + setCount;
      totalSets += setCount;
      ex.session_sets?.forEach((set) => {
        totalReps += set.reps || 0;
      });
    });
  });

  const muscleSplit = useMemo(
    () =>
      Object.entries(muscleMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({
          name,
          value,
          color: MUSCLE_COLORS[name] || MUSCLE_COLORS.Other,
        })),
    [sessions]
  );

  const donutSegmentBounds = useMemo(() => {
    const slice = muscleSplit.slice(0, 6);
    const total = slice.reduce((s, d) => s + d.value, 0) || 1;
    const paddingDeg = 2;
    const paddingRad = (paddingDeg / 360) * 2 * Math.PI;
    const out: { seg: (typeof muscleSplit)[0]; start: number; end: number }[] = [];
    let acc = 0;
    slice.forEach((seg) => {
      const pct = seg.value / total;
      const angle = ((pct * 360 - paddingDeg) / 360) * 2 * Math.PI;
      const start = acc;
      acc += angle + paddingRad;
      out.push({ seg, start, end: start + angle });
    });
    return out;
  }, [muscleSplit]);

  const avgDuration =
    thisWeekSessions.length > 0
      ? Math.round(
          thisWeekSessions.reduce((s, w) => s + (w.duration_seconds ?? 0), 0) /
            thisWeekSessions.length
        )
      : 0;

  const weeklyTrend = useMemo(() => {
    const out: { week: string; volume: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = subWeeks(weekStart, i + 1);
      const end = subWeeks(weekStart, i);
      const total = sessions
        .filter((s) => {
          const t = new Date(s.start_time).getTime();
          return t >= start.getTime() && t < end.getTime();
        })
        .reduce((sum, s) => sum + (s.total_volume ?? 0), 0);
      out.push({ week: format(start, 'MMM d'), volume: total });
    }
    return out;
  }, [sessions, weekStart]);

  const displayName =
    user?.user_metadata?.full_name?.trim() || 'Guest';
  const recentSessions = sessions.slice(0, 5);
  const maxTrendVol = Math.max(1, ...weeklyTrend.map((d) => d.volume));
  const hasVolumeData = weeklyTrend.some((d) => d.volume > 0);
  const hasDonutData = muscleSplit.length > 0;

  useEffect(() => {
    if (!hasVolumeData) setSelectedVolumePoint(null);
  }, [hasVolumeData]);

  useEffect(() => {
    if (!hasVolumeData) {
      volumeAnimationStarted.current = false;
      return;
    }
    if (volumeAnimationStarted.current) return;
    volumeAnimationStarted.current = true;
    chartLineProgress.setValue(0);
    Animated.timing(chartLineProgress, { toValue: 1, duration: 750, useNativeDriver: true }).start();
  }, [hasVolumeData]);

  useEffect(() => {
    if (!hasDonutData) {
      donutAnimationStarted.current = false;
      return;
    }
    if (donutAnimationStarted.current) return;
    donutAnimationStarted.current = true;
    donutOpacity.setValue(0);
    donutScale.setValue(0.85);
    Animated.parallel([
      Animated.timing(donutOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(donutScale, { toValue: 1, useNativeDriver: true, friction: 9, tension: 50 }),
    ]).start();
  }, [hasDonutData]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 48),
        paddingBottom: spacing.navContentReserve + spacing[6],
        paddingHorizontal: PAD,
      }}
      showsVerticalScrollIndicator={true}
    >
      {/* ── Header: greeting, name, XP bar, Start, avatar (Figma: pt-12 pb-4, mb-2 greeting, animated bar) ── */}
      <View style={[styles.header, { paddingBottom: 16 }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.textDim, marginBottom: 8 }]}>
            {getTimeGreeting()}
          </Text>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.xpRow}>
            <View
              style={[
                styles.levelBadge,
                {
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.35)',
                  shadowColor: xp.titleColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  elevation: 4,
                  overflow: 'hidden',
                },
              ]}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="levelGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor={xp.titleColor} />
                    <Stop offset="100%" stopColor={xp.titleColor} stopOpacity={0.8} />
                  </LinearGradient>
                </Defs>
                <Circle cx={12} cy={12} r={12} fill="url(#levelGrad)" />
              </Svg>
              <Text style={[styles.levelNum, { color: '#ffffff' }]}>{xp.level}</Text>
            </View>
            <View style={[styles.xpBarTrackWrap, { backgroundColor: 'transparent', marginLeft: -4 }]}>
              <View
                style={[
                  styles.xpBarTrack,
                  {
                    backgroundColor: colors.primarySubtle,
                    borderTopRightRadius: 1.5,
                    borderBottomRightRadius: 1.5,
                    overflow: 'hidden',
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.xpBarFill,
                    {
                      width: xpBarProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      borderTopRightRadius: 1.5,
                      borderBottomRightRadius: 1.5,
                      overflow: 'hidden',
                      shadowColor: xp.titleColor,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 3,
                    },
                  ]}
                >
                  <Svg width="100%" height="100%" viewBox="0 0 100 3" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                    <Defs>
                      <LinearGradient id="xpFillGrad" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor={xp.titleColor} stopOpacity={0.87} />
                        <Stop offset="100%" stopColor={xp.titleColor} />
                      </LinearGradient>
                      <LinearGradient id="xpHighlight" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                        <Stop offset="100%" stopColor="transparent" />
                      </LinearGradient>
                    </Defs>
                    <Rect x={0} y={0} width={100} height={3} fill="url(#xpFillGrad)" />
                    <Rect x={0} y={0} width={100} height={1.2} fill="url(#xpHighlight)" />
                  </Svg>
                </Animated.View>
              </View>
            </View>
            <Text
              style={[styles.xpFraction, { color: colors.textDim }, { fontVariant: ['tabular-nums'] }]}
              allowFontScaling={false}
            >
              {xp.xpInCurrentLevel}/{xp.xpNeededForNext}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={openWorkoutSelector}
            style={[styles.startButton, { backgroundColor: colors.ctaBg }]}
          >
            <Dumbbell size={16} color={colors.ctaFg} strokeWidth={2} />
            <Text style={[styles.startLabel, { color: colors.ctaFg }]}>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={[
              styles.avatar,
              {
                backgroundColor: colors.circleBg,
                borderWidth: colors.circleBorder === 'transparent' ? 0 : 1,
                borderColor: colors.circleBorder,
                shadowColor: colors.circleShadow,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.35,
                shadowRadius: 20,
                elevation: 4,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.circleFg }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Date row: M T W T F S S + circles (Figma: letter color today, gap 6, glow) ── */}
      <View style={[styles.weekRow, { marginTop: spacing[6], marginBottom: spacing[5] }]}>
        {weekDays.map((day) => {
          const hasWorkout = sessions.some((s) => isSameDay(new Date(s.start_time), day));
          const isDayToday = isToday(day);
          return (
            <View key={day.toISOString()} style={styles.dayCol}>
              <Text
                style={[
                  styles.dayLetter,
                  { color: isDayToday ? colors.accentText : colors.mutedForeground },
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
                      : isDayToday
                        ? colors.primarySubtle
                        : colors.muted,
                    borderWidth: isDayToday && !hasWorkout ? 1 : 0,
                    borderColor: colors.primaryBorder,
                    shadowColor: hasWorkout ? colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: hasWorkout ? 0.35 : 0,
                    shadowRadius: hasWorkout ? 10 : 0,
                    elevation: hasWorkout ? 4 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: hasWorkout
                        ? colors.ctaFg
                        : isDayToday
                          ? colors.accentText
                          : colors.mutedForeground,
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

      {/* ── Stats grid 2x3 (Figma: gap 12, label = icon color 10px, value 24px, card glow) ── */}
      <View style={[styles.statsGrid, { marginBottom: spacing[6] }]}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <View style={styles.statCardContent}>
            <View style={styles.statLabelRow}>
              <Dumbbell size={12} color="#84cc16" strokeWidth={2.5} />
              <Text style={[styles.statTitle, { color: '#84cc16' }]}>WORKOUTS</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{workoutsThisWeek}</Text>
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>this week</Text>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <View style={styles.statCardContent}>
            <View style={styles.statLabelRow}>
              <Flame size={12} color="#f97316" strokeWidth={2.5} />
              <Text style={[styles.statTitle, { color: '#f97316' }]}>STREAK</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{streak}</Text>
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>days</Text>
            {streak === 0 && (
              <Text style={[styles.statHint, { color: colors.textDim }]}>Start today!</Text>
            )}
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <View style={styles.statCardContent}>
            <View style={styles.statLabelRow}>
              <TrendingUp size={12} color="#3b82f6" strokeWidth={2.5} />
              <Text style={[styles.statTitle, { color: '#3b82f6' }]}>VOLUME</Text>
            </View>
            <Text style={[styles.statValueVolume, { color: colors.foreground }]}>
              {volumeThisWeek >= 1000 ? `${(volumeThisWeek / 1000).toFixed(1)}k` : volumeThisWeek}
            </Text>
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>kg</Text>
            {weeklyTrend.some((d) => d.volume > 0) ? (
              <View style={styles.miniChart}>
                <View
                  style={styles.volumeChartTouchArea}
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={(e) => {
                    const { locationX } = e.nativeEvent;
                    const n = weeklyTrend.length;
                    if (n === 0) return;
                    const fraction = Math.max(0, Math.min(1, locationX / VOLUME_CHART_WIDTH));
                    const index = n === 1 ? 0 : Math.round(fraction * (n - 1));
                    const w = CARD_WIDTH - 32;
                    const h = 56;
                    const baseY = 68;
                    const vol = weeklyTrend[index]?.volume ?? 0;
                    const x = 4 + (index / (n - 1 || 1)) * w;
                    const y = baseY - (vol / maxTrendVol) * h;
                    setSelectedVolumePoint({ index, x, y });
                  }}
                  onResponderRelease={() => setSelectedVolumePoint(null)}
                  onResponderTerminate={() => setSelectedVolumePoint(null)}
                >
                  <Svg width={VOLUME_CHART_WIDTH} height={VOLUME_CHART_HEIGHT} viewBox={`0 0 ${VOLUME_CHART_WIDTH} ${VOLUME_CHART_HEIGHT}`} pointerEvents="none">
                    <Defs>
                      <LinearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                        <Stop offset="60%" stopColor="#3b82f6" stopOpacity="0.12" />
                        <Stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                      </LinearGradient>
                    </Defs>
                    {(() => {
                      const w = CARD_WIDTH - 32;
                      const h = 56;
                      const baseY = 68;
                      const pts = weeklyTrend.map((d, i) => {
                        const x = 4 + (i / (weeklyTrend.length - 1 || 1)) * w;
                        const y = baseY - (d.volume / maxTrendVol) * h;
                        return { x, y };
                      });
                      let lineLength = 0;
                      for (let i = 1; i < pts.length; i++) {
                        lineLength += Math.sqrt((pts[i].x - pts[i - 1].x) ** 2 + (pts[i].y - pts[i - 1].y) ** 2);
                      }
                      const areaD = pts.length
                        ? `M ${pts[0].x} ${baseY} L ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${pts[pts.length - 1].x} ${baseY} Z`
                        : '';
                      const lineD = pts.length
                        ? `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`
                        : '';
                      const sel = selectedVolumePoint != null && pts[selectedVolumePoint.index] ? pts[selectedVolumePoint.index] : null;
                      return (
                        <>
                          <Path d={areaD} fill="url(#volGrad)" />
                          <AnimatedPath
                            d={lineD}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={lineLength}
                            strokeDashoffset={chartLineProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [lineLength, 0],
                            })}
                          />
                          {sel != null && (
                            <Circle cx={sel.x} cy={sel.y} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
                          )}
                        </>
                      );
                    })()}
                  </Svg>
                </View>
                {selectedVolumePoint !== null && weeklyTrend[selectedVolumePoint.index] != null && (() => {
                  const pt = selectedVolumePoint;
                  const showAbove = pt.y > VOLUME_CHART_HEIGHT / 2;
                  const tooltipTop = showAbove ? pt.y - 28 : pt.y + 8;
                  return (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.volumeTooltipOverlay,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.borderSubtle,
                          left: pt.x,
                          top: tooltipTop,
                          transform: [{ translateX: -70 }],
                        },
                      ]}
                    >
                      <Text style={[styles.volumeTooltipLabel, { color: colors.textDim }]}>
                        {weeklyTrend[pt.index].week}:
                      </Text>
                      <Text style={[styles.volumeTooltipValue, { color: colors.foreground }]}>
                        {weeklyTrend[pt.index].volume} kg
                      </Text>
                    </View>
                  );
                })()}
              </View>
            ) : (
              <View style={[styles.miniChart, { justifyContent: 'center' }]}>
                <Text style={[styles.chartNoData, { color: colors.textDim }]}>No data</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <View style={styles.statCardContent}>
            <View style={styles.statLabelRow}>
              <Activity size={12} color="#ec4899" strokeWidth={2.5} />
              <Text style={[styles.statTitle, { color: '#ec4899' }]}>MUSCLES</Text>
            </View>
            {muscleSplit.length > 0 ? (
              <Animated.View
                style={[
                  styles.donutWrap,
                  {
                    opacity: donutOpacity,
                    transform: [{ scale: donutScale }],
                  },
                ]}
              >
                <View
                  style={styles.donutTouchArea}
                  onStartShouldSetResponder={() => true}
                  onResponderRelease={(e) => {
                    const { locationX, locationY } = e.nativeEvent;
                    const x = (locationX / DONUT_SIZE) * 100;
                    const y = (locationY / DONUT_SIZE) * 100;
                    const dist = Math.sqrt((x - 50) ** 2 + (y - 50) ** 2);
                    if (dist < 28 || dist > 52) return;
                    let angle = Math.atan2(x - 50, 50 - y);
                    if (angle < 0) angle += 2 * Math.PI;
                    const hit = donutSegmentBounds.find(({ start, end }) => angle >= start && angle < end);
                    if (hit) setActiveSegment(hit.seg);
                  }}
                >
                  <Svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox="0 0 100 100" pointerEvents="none">
                    {(() => {
                      const total = muscleSplit.reduce((s, d) => s + d.value, 0);
                      const displayed = activeSegment ?? muscleSplit[0];
                      const paddingDeg = 2;
                      const innerR = 30;
                      const outerR = 50;
                      const cx = 50;
                      const cy = 50;
                      return muscleSplit.slice(0, 6).map((seg, i) => {
                        const pct = seg.value / total;
                        const angle = (pct * 360 - paddingDeg) / 360 * 2 * Math.PI;
                        const start = (() => {
                          let acc = 0;
                          for (let j = 0; j < i; j++) {
                            const segPct = muscleSplit[j].value / total;
                            acc += (segPct * 360 - paddingDeg) / 360 * 2 * Math.PI;
                            acc += (paddingDeg / 360) * 2 * Math.PI;
                          }
                          return acc;
                        })();
                        const end = start + angle;
                        const x1 = cx + outerR * Math.cos(start - Math.PI / 2);
                        const y1 = cy + outerR * Math.sin(start - Math.PI / 2);
                        const x2 = cx + outerR * Math.cos(end - Math.PI / 2);
                        const y2 = cy + outerR * Math.sin(end - Math.PI / 2);
                        const x3 = cx + innerR * Math.cos(end - Math.PI / 2);
                        const y3 = cy + innerR * Math.sin(end - Math.PI / 2);
                        const x4 = cx + innerR * Math.cos(start - Math.PI / 2);
                        const y4 = cy + innerR * Math.sin(start - Math.PI / 2);
                        const large = angle > Math.PI ? 1 : 0;
                        const d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`;
                        const isActive = displayed?.name === seg.name;
                        return (
                          <Path
                            key={seg.name}
                            d={d}
                            fill={seg.color}
                            opacity={isActive ? 1 : 0.5}
                          />
                        );
                      });
                    })()}
                    <Circle cx={50} cy={50} r={28} fill={colors.card} />
                  </Svg>
                </View>
                <View style={styles.donutCenter} pointerEvents="none">
                  {(() => {
                    const seg = activeSegment ?? muscleSplit[0];
                    const pct = seg && totalSets > 0 ? Math.round((seg.value / totalSets) * 100) : seg ? 100 : 0;
                    return (
                      <>
                        <Text style={[styles.musclePct, { color: seg?.color ?? colors.mutedForeground }]}>
                          {pct}%
                        </Text>
                        <Text style={[styles.muscleName, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {seg?.name || '—'}
                        </Text>
                      </>
                    );
                  })()}
                </View>
              </Animated.View>
            ) : (
              <>
                <Text style={[styles.statValue, { color: colors.foreground }]}>—</Text>
                <Text style={[styles.statSub, { color: colors.mutedForeground }]}>No data</Text>
              </>
            )}
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <View style={styles.statCardContent}>
            <View style={styles.statLabelRow}>
              <Clock size={12} color="#a855f7" strokeWidth={2.5} />
              <Text style={[styles.statTitle, { color: '#a855f7' }]}>AVG DURATION</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {Math.round(avgDuration / 60)}
            </Text>
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>min</Text>
            <Text style={[styles.statHint, { color: colors.textDim }]}>per workout</Text>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <View style={styles.statCardContent}>
            <View style={styles.statLabelRow}>
              <Dumbbell size={12} color="#10b981" strokeWidth={2.5} />
              <Text style={[styles.statTitle, { color: '#10b981' }]}>SETS</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{totalSets}</Text>
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>sets</Text>
            <Text style={[styles.statHint, { color: colors.textDim }]}>{totalReps} reps total</Text>
          </View>
        </View>
      </View>

      {/* ── Recent Workouts (Figma: card wrapper, 14px header, 36x36 icon box, 8px gap, p-3) ── */}
      <View style={[styles.recentSection, { marginTop: spacing[6], paddingBottom: spacing[6] }]}>
        <View
          style={[
            styles.recentCardWrapper,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.recentHeader}>
            <Clock size={14} color={colors.accentText} strokeWidth={2.5} />
            <Text style={[styles.recentTitle, { color: colors.accentText }]}>Recent Workouts</Text>
            {recentSessions.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('History')}
                style={[styles.recentArrowBtn, { backgroundColor: colors.primaryMuted }]}
              >
                <ChevronRight size={12} color={colors.accentText} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
          {recentSessions.length === 0 ? (
            <Text style={[styles.emptyRecent, { color: colors.textMuted }]}>
              No workouts yet. Tap Start to begin.
            </Text>
          ) : (
            <View style={styles.recentList}>
              {recentSessions.map((s, idx) => {
                const exerciseNames = s.session_exercises?.map((e) => e.name) ?? [];
                const tags = exerciseNames.slice(0, 3);
                const more = exerciseNames.length - 3;
                const dotColor = routineColors[idx % routineColors.length];
                return (
                  <View
                    key={s.id}
                    style={[styles.recentCard, { backgroundColor: colors.glow3, borderColor: colors.borderSubtle }]}
                  >
                    <View style={[styles.recentIconBox, { backgroundColor: colors.secondary }]}>
                      <View style={[styles.recentDot, { backgroundColor: dotColor }]} />
                    </View>
                    <View style={styles.recentCardBody}>
                      <Text style={[styles.recentCardName, { color: colors.foreground }]} numberOfLines={1}>
                        {s.routine_name}
                      </Text>
                      <Text style={[styles.recentCardDate, { color: colors.mutedForeground }]}>
                        {format(new Date(s.start_time), 'EEE, MMM d')}
                      </Text>
                      <View style={styles.tagRow}>
                        {tags.map((name) => (
                          <View key={name} style={[styles.tag, { backgroundColor: colors.surfaceHover }]}>
                            <Text style={[styles.tagText, { color: colors.mutedForeground }]} numberOfLines={1}>
                              {name}
                            </Text>
                          </View>
                        ))}
                        {more > 0 && (
                          <View style={[styles.tag, { backgroundColor: colors.surfaceHover }]}>
                            <Text style={[styles.tagText, { color: colors.mutedForeground }]}>+{more} more</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.recentCardRight}>
                      <Text style={[styles.recentDuration, { color: colors.foreground }]}>
                        {fmtDuration(s.duration_seconds ?? 0)}
                      </Text>
                      <Text style={[styles.recentVolume, { color: colors.foreground }]}>
                        {s.total_volume ?? 0}kg
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { flex: 1, minWidth: 0, maxWidth: 200 },
  greeting: { fontSize: 10, fontWeight: '500', letterSpacing: 1 },
  userName: { fontSize: 18, fontWeight: '800', marginTop: -2, marginLeft: 2, maxWidth: 200 },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: 0,
  },
  levelBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNum: { fontSize: 10, fontWeight: '800' },
  xpBarTrackWrap: { flex: 1, minWidth: 0, height: 3, alignSelf: 'center' },
  xpBarTrack: {
    flex: 1,
    height: 3,
    borderRadius: 0,
    overflow: 'hidden',
  },
  xpBarFill: { height: '100%', borderRadius: 0 },
  xpFraction: { fontSize: 8, fontWeight: '700', marginLeft: 6 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 12,
    marginTop: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: 999,
    gap: 8,
  },
  startLabel: { fontSize: 14, fontWeight: '600' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '800' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center' },
  dayLetter: { fontSize: 10, marginBottom: 6, fontWeight: '500' },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNum: { fontSize: 12, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  statCard: {
    width: CARD_WIDTH,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    padding: spacing[3],
    overflow: 'hidden',
    position: 'relative',
  },
  statCardContent: { position: 'relative' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statTitle: { fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  statValue: { fontSize: 24, fontWeight: '800', marginTop: 0 },
  statValueVolume: { fontSize: 20, fontWeight: '800', marginTop: 0 },
  statSub: { fontSize: 10, marginTop: 2 },
  statHint: { fontSize: 10, marginTop: 2 },
  miniChart: { marginTop: 6, height: 72, position: 'relative' },
  volumeTooltipOverlay: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
  },
  volumeTooltipLabel: { fontSize: 10, fontWeight: '600' },
  volumeTooltipValue: { fontSize: 12, fontWeight: '800' },
  volumeChartTouchArea: { width: VOLUME_CHART_WIDTH, height: VOLUME_CHART_HEIGHT },
  chartNoData: { fontSize: 10 },
  donutWrap: { position: 'relative', alignItems: 'center', marginVertical: 4, width: DONUT_SIZE, height: DONUT_SIZE },
  donutTouchArea: { width: DONUT_SIZE, height: DONUT_SIZE },
  donutCenter: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  musclePct: { fontSize: 18, fontWeight: '800', lineHeight: 20 },
  muscleName: { fontSize: 8, fontWeight: '600', marginTop: 2 },
  recentSection: {},
  recentCardWrapper: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    padding: spacing[4],
    overflow: 'hidden',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
    gap: 6,
  },
  recentTitle: { fontSize: 14, fontWeight: '600' },
  recentArrowBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  emptyRecent: { fontSize: 14 },
  recentList: { gap: 8 },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[3],
  },
  recentIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentCardBody: { flex: 1, minWidth: 0 },
  recentCardName: { fontSize: 14, fontWeight: '600' },
  recentCardDate: { fontSize: 12, marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing[2] },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: { fontSize: 10 },
  recentCardRight: { alignItems: 'flex-end', marginLeft: spacing[2] },
  recentDuration: { fontSize: 12 },
  recentVolume: { fontSize: 12, marginTop: 2 },
});
