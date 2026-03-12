import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Play, Home, Dumbbell, History, BarChart2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useWorkout, type ActiveExercise } from '../context/WorkoutContext';
import { spacing, radius } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useWorkoutSelector, WorkoutSelectorProvider } from '../context/WorkoutSelectorContext';
import { supabase } from '../lib/supabase';
import DashboardScreen from '../screens/DashboardScreen';
import RoutinesScreen from '../screens/RoutinesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WorkoutSelectorModal from '../components/WorkoutSelectorModal';

const Tab = createBottomTabNavigator();

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function PlayButton() {
  const { colors } = useTheme();
  const { openWorkoutSelector } = useWorkoutSelector();
  return (
    <TouchableOpacity
      onPress={openWorkoutSelector}
      activeOpacity={0.9}
      style={[
        styles.playButton,
        {
          backgroundColor: colors.ctaBg,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        },
      ]}
    >
      <Play size={26} color={colors.ctaFg} strokeWidth={2.5} fill={colors.ctaFg} />
    </TouchableOpacity>
  );
}

function FloatingWorkoutBar() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const workout = useWorkout();
  if (!workout.isActive) return null;
  return (
    <TouchableOpacity
      onPress={() => navigation.getParent()?.navigate('Workout', { routineId: workout.routineId })}
      style={[
        styles.floatingBar,
        {
          backgroundColor: colors.elevated,
          borderColor: colors.ctaBg,
          shadowColor: colors.primary,
        },
      ]}
    >
      <View style={[styles.pulseDot, { backgroundColor: colors.ctaBg }]} />
      <View style={styles.floatingBarBody}>
        <Text style={[styles.floatingBarTitle, { color: colors.foreground }]} numberOfLines={1}>
          {workout.routineName}
        </Text>
        <Text style={[styles.floatingBarSub, { color: colors.textMuted }]}>
          {fmt(workout.elapsed)} · {workout.exercises.flatMap((e) => e.sets).length} sets
        </Text>
      </View>
      <View style={[styles.returnBtn, { backgroundColor: colors.ctaBg }]}>
        <Text style={[styles.returnBtnText, { color: colors.ctaFg }]}>Return</Text>
        <Text style={[styles.returnBtnText, { color: colors.ctaFg }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MainTabs() {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <WorkoutSelectorProvider openWorkoutSelector={() => setModalVisible(true)}>
      <MainTabsWithModal modalVisible={modalVisible} setModalVisible={setModalVisible} />
    </WorkoutSelectorProvider>
  );
}

function MainTabsWithModal({
  modalVisible,
  setModalVisible,
}: {
  modalVisible: boolean;
  setModalVisible: (v: boolean) => void;
}) {
  const navigation = useNavigation<any>();
  const workout = useWorkout();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (id: string) => {
    setModalVisible(false);
    if (id === 'new') {
      workout.beginWorkout('new', 'New Workout', [], {});
      navigation.getParent()?.navigate('Workout', { routineId: id });
      return;
    }
    setLoading(true);
    try {
      const { data: routine, error: rErr } = await supabase
        .from('routines')
        .select('id, name')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();
      if (rErr || !routine) {
        Alert.alert('Error', 'Routine not found');
        setLoading(false);
        return;
      }
      const { data: exRows } = await supabase
        .from('routine_exercises')
        .select('*')
        .eq('routine_id', id)
        .order('sort_order', { ascending: true });
      const exercises: ActiveExercise[] = (exRows ?? []).map((ex: any) => ({
        exerciseId: ex.id,
        name: ex.name,
        muscleGroup: ex.muscle_group ?? undefined,
        targetSets: ex.target_sets,
        targetReps: ex.target_reps,
        restSeconds: ex.rest_seconds,
        sets: [],
        notes: ex.notes ?? '',
        started: false,
        finished: false,
      }));
      let prevPerf: Record<string, { weight: number; reps: number }[]> = {};
      const { data: lastSession } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user!.id)
        .eq('routine_id', id)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastSession?.id) {
        const { data: sessExs } = await supabase
          .from('session_exercises')
          .select('id, name')
          .eq('session_id', (lastSession as { id: string }).id);
        const { data: sets } = await supabase
          .from('session_sets')
          .select('session_exercise_id, weight, reps')
          .in('session_exercise_id', (sessExs ?? []).map((e: any) => e.id));
        const exIdsToName: Record<string, string> = {};
        (sessExs ?? []).forEach((e: any) => { exIdsToName[e.id] = e.name; });
        (sets ?? []).forEach((s: any) => {
          const name = exIdsToName[s.session_exercise_id];
          if (!name) return;
          if (!prevPerf[name]) prevPerf[name] = [];
          prevPerf[name].push({ weight: s.weight, reps: s.reps });
        });
      }
      workout.beginWorkout(id, (routine as { name: string }).name, exercises, prevPerf);
      navigation.getParent()?.navigate('Workout', { routineId: id });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to load routine');
    } finally {
      setLoading(false);
    }
  };

  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            height: spacing.navHeight,
            backgroundColor: colors.navBg,
            borderTopColor: colors.border,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: colors.accentText,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
          tabBarShowLabel: true,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Home size={size ?? 22} color={color} strokeWidth={2} />,
          }}
        />
        <Tab.Screen
          name="Routines"
          component={RoutinesScreen}
          options={{
            title: 'Routines',
            tabBarIcon: ({ color, size }) => <Dumbbell size={size ?? 22} color={color} strokeWidth={2} />,
          }}
        />
        <Tab.Screen
          name="Play"
          component={View}
          options={{
            title: '',
            tabBarButton: () => (
              <View style={styles.playButtonContainer}>
                <PlayButton />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => <History size={size ?? 22} color={color} strokeWidth={2} />,
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, size }) => <BarChart2 size={size ?? 22} color={color} strokeWidth={2} />,
          }}
        />
      </Tab.Navigator>
      <FloatingWorkoutBar />
      <WorkoutSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectRoutine={handleSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    position: 'absolute',
    left: spacing[3],
    right: spacing[3],
    bottom: spacing.navHeight + 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    zIndex: 55,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing[3],
  },
  floatingBarBody: { flex: 1 },
  floatingBarTitle: { fontSize: 12, fontWeight: '700' },
  floatingBarSub: { fontSize: 10, marginTop: 2 },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2.5],
    paddingVertical: 6,
    borderRadius: radius.xl,
    gap: 2,
  },
  returnBtnText: { fontSize: 10, fontWeight: '700' },
  playButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'android' && { overflow: 'hidden' }),
  },
  playIcon: {
    fontSize: 22,
    marginLeft: 2,
  },
});
