import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useWorkout } from '../context/WorkoutContext';
import { spacing, radius } from '../theme/tokens';
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
  const navigation = useNavigation<any>();
  const workout = useWorkout();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (id: string) => {
    setModalVisible(false);
    const name = id === 'new' ? 'Blank Workout' : 'Workout';
    workout.startWorkout(id, name);
    navigation.getParent()?.navigate('Workout', { routineId: id });
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
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
        <Text style={[styles.playIcon, { color: colors.ctaFg }]}>▶</Text>
      </TouchableOpacity>
      <WorkoutSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectRoutine={handleSelect}
      />
    </>
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
          {fmt(workout.elapsed)} · {workout.completedSets} sets
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Routines" component={RoutinesScreen} options={{ title: 'Routines' }} />
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
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
    </Tab.Navigator>
    <FloatingWorkoutBar />
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
