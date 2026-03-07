import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.pageTop,
        paddingBottom: insets.bottom + spacing[8],
        paddingHorizontal: spacing.pageX,
      }}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: colors.accentText }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
        <Text style={[styles.value, { color: colors.foreground }]}>{user?.email ?? '—'}</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {user?.user_metadata?.full_name ?? '—'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={toggleTheme}
        style={[styles.button, { backgroundColor: colors.muted }]}
      >
        <Text style={[styles.buttonText, { color: colors.foreground }]}>
          Theme: {isDark ? 'Dark' : 'Light'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => signOut()}
        style={[styles.button, { backgroundColor: colors.destructive }]}
      >
        <Text style={[styles.buttonText, { color: '#fff' }]}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  backText: { fontSize: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  card: {
    borderRadius: radius.cardCustom,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  label: { fontSize: 12, marginBottom: 2 },
  value: { fontSize: 16, marginBottom: spacing[3] },
  button: {
    borderRadius: radius.buttonCta,
    paddingVertical: spacing[3],
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  buttonText: { fontSize: 14, fontWeight: '600' },
});
