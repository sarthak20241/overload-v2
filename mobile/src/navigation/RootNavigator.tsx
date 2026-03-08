import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import MainTabs from './MainTabs';
import WorkoutScreen from '../screens/WorkoutScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RoutineEditorScreen from '../screens/RoutineEditorScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Workout: { routineId: string };
  Profile: undefined;
  RoutineEditor: { routineId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Workout" component={WorkoutScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="RoutineEditor" component={RoutineEditorScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
