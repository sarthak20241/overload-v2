import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius, typography } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register' | 'forgot';

export default function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'register') {
        if (!name.trim()) throw new Error('Please enter your name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await signUp(email, password, name.trim());
      } else {
        await resetPassword(email);
        setError('');
        setMode('login');
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <Text style={[styles.logoText, { color: colors.foreground }]}>
            OVER<Text style={{ color: colors.accentText }}>LOAD</Text>
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Progressive Overload Tracker
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.borderLight }]}>
          {mode !== 'forgot' && (
            <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
              {(['login', 'register'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => { setMode(m); setError(''); }}
                  style={[
                    styles.tab,
                    mode === m && { backgroundColor: colors.primaryMuted },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: mode === m ? colors.accentText : colors.mutedForeground },
                    ]}
                  >
                    {m === 'login' ? 'Sign in' : 'Sign up'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {mode !== 'forgot' && (
            <>
              {mode === 'register' && (
                <TextInput
                  placeholder="Name"
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.input }]}
                  autoCapitalize="words"
                />
              )}
              <TextInput
                placeholder="Email"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.input }]}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.input }]}
              />
            </>
          )}
          {mode === 'forgot' && (
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.input }]}
            />
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.cta, { backgroundColor: colors.ctaBg }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.ctaFg} />
            ) : (
              <Text style={[styles.ctaText, { color: colors.ctaFg }]}>
                {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
              </Text>
            )}
          </TouchableOpacity>

          {mode !== 'forgot' && (
            <>
              <TouchableOpacity
                onPress={handleGoogle}
                disabled={loading}
                style={[styles.googleBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Text style={[styles.googleBtnText, { color: colors.foreground }]}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setMode('forgot'); setError(''); }}
                style={styles.link}
              >
                <Text style={{ color: colors.accentText, fontSize: 14 }}>Forgot password?</Text>
              </TouchableOpacity>
            </>
          )}
          {mode === 'forgot' && (
            <TouchableOpacity onPress={() => { setMode('login'); setError(''); }} style={styles.link}>
              <Text style={{ color: colors.accentText, fontSize: 14 }}>Back to sign in</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.pageX,
    paddingVertical: spacing[10],
  },
  logo: { alignItems: 'center', marginBottom: spacing[10] },
  logoText: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 14, marginTop: 4 },
  card: {
    borderRadius: radius['3xl'],
    borderWidth: 1,
    padding: spacing[6],
    maxWidth: 384,
    alignSelf: 'center',
    width: '100%',
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: radius['2xl'],
    padding: 4,
    marginBottom: spacing[6],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: radius.xl,
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  errorBox: { padding: spacing[3], borderRadius: radius.lg, marginBottom: spacing[3] },
  errorText: { fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: radius.inputCustom,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 16,
    marginBottom: spacing[3],
  },
  cta: {
    borderRadius: radius.buttonCta,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing[2],
  },
  ctaText: { fontSize: 14, fontWeight: '900' },
  googleBtn: {
    borderWidth: 1,
    borderRadius: radius['2xl'],
    paddingVertical: spacing[3],
    alignItems: 'center',
    marginTop: spacing[3],
  },
  googleBtnText: { fontSize: 14, fontWeight: '600' },
  link: { alignItems: 'center', marginTop: spacing[4] },
});
