import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { WorkoutProvider } from './src/context/WorkoutContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <WorkoutProvider>
          <View style={{ flex: 1 }}>
            <StatusBar style="light" />
            <RootNavigator />
          </View>
          </WorkoutProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
