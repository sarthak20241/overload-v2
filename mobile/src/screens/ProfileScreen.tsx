import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useXP } from '../context/XPContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import type { Database } from '../types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type BodyMeasurementRow = Database['public']['Tables']['body_measurements']['Row'];
type WeightLogRow = Database['public']['Tables']['weight_log']['Row'];
type BodyfatLogRow = Database['public']['Tables']['bodyfat_log']['Row'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const xp = useXP();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [measurements, setMeasurements] = useState<BodyMeasurementRow[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLogRow[]>([]);
  const [bodyfatLogs, setBodyfatLogs] = useState<BodyfatLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showBodyfatModal, setShowBodyfatModal] = useState(false);
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [weightDate, setWeightDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weightValue, setWeightValue] = useState('');
  const [bodyfatDate, setBodyfatDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bodyfatValue, setBodyfatValue] = useState('');
  const [measureDate, setMeasureDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [measureWaist, setMeasureWaist] = useState('');

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setProfile((data as ProfileRow) ?? null);
  }, [user?.id]);

  const loadMeasurements = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(20);
    setMeasurements((data as BodyMeasurementRow[]) ?? []);
  }, [user?.id]);

  const loadWeightLogs = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('weight_log')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);
    setWeightLogs((data as WeightLogRow[]) ?? []);
  }, [user?.id]);

  const loadBodyfatLogs = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('bodyfat_log')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);
    setBodyfatLogs((data as BodyfatLogRow[]) ?? []);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([loadProfile(), loadMeasurements(), loadWeightLogs(), loadBodyfatLogs()]).finally(
      () => { if (!cancelled) setLoading(false); }
    );
    return () => { cancelled = true; };
  }, [user?.id, loadProfile, loadMeasurements, loadWeightLogs, loadBodyfatLogs]);

  const saveProfile = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    const p = profile ?? ({} as Partial<ProfileRow>);
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        display_name: p.display_name ?? null,
        weight_unit: p.weight_unit ?? null,
        height: p.height ?? null,
        height_unit: p.height_unit ?? null,
        weight: p.weight ?? null,
        goal_weight: p.goal_weight ?? null,
        body_fat: p.body_fat ?? null,
        gender: p.gender ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    setSavingProfile(false);
    loadProfile();
  };

  const addWeight = async () => {
    if (!user?.id || !weightValue.trim()) return;
    const w = parseFloat(weightValue);
    if (Number.isNaN(w)) return;
    await supabase.from('weight_log').insert({
      user_id: user.id,
      date: weightDate,
      weight: w,
    });
    setWeightValue('');
    setWeightDate(format(new Date(), 'yyyy-MM-dd'));
    setShowWeightModal(false);
    loadWeightLogs();
  };

  const addBodyfat = async () => {
    if (!user?.id || !bodyfatValue.trim()) return;
    const b = parseFloat(bodyfatValue);
    if (Number.isNaN(b)) return;
    await supabase.from('bodyfat_log').insert({
      user_id: user.id,
      date: bodyfatDate,
      bodyfat: b,
    });
    setBodyfatValue('');
    setBodyfatDate(format(new Date(), 'yyyy-MM-dd'));
    setShowBodyfatModal(false);
    loadBodyfatLogs();
  };

  const addMeasurement = async () => {
    if (!user?.id) return;
    const waist = measureWaist.trim() ? parseFloat(measureWaist) : null;
    await supabase.from('body_measurements').insert({
      user_id: user.id,
      date: measureDate,
      waist: waist ?? null,
    });
    setMeasureWaist('');
    setMeasureDate(format(new Date(), 'yyyy-MM-dd'));
    setShowMeasureModal(false);
    loadMeasurements();
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.ctaBg} />
      </View>
    );
  }

  const p = profile ?? ({} as Partial<ProfileRow>);

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

      <View style={[styles.xpCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <View style={styles.xpHeader}>
          <Text style={[styles.xpTitle, { color: colors.foreground }]}>
            {xp.titleIcon} Level {xp.level} · {xp.title}
          </Text>
          <Text style={[styles.xpTotal, { color: colors.mutedForeground }]}>{xp.totalXP} XP</Text>
        </View>
        <View style={[styles.xpBarBg, { backgroundColor: colors.muted }]}>
          <View
            style={[styles.xpBarFill, { width: `${Math.min(100, xp.progress * 100)}%`, backgroundColor: xp.titleColor }]}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Basic info</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Display name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
          value={p.display_name ?? ''}
          onChangeText={(t) => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), display_name: t || null }))}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Weight unit</Text>
        <View style={styles.unitRow}>
          {['kg', 'lbs'].map((u) => (
            <TouchableOpacity
              key={u}
              onPress={() => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), weight_unit: u }))}
              style={[
                styles.unitBtn,
                { borderColor: colors.border, backgroundColor: (p.weight_unit ?? 'kg') === u ? colors.ctaBg : colors.inputBackground },
              ]}
            >
              <Text style={[styles.unitBtnText, { color: (p.weight_unit ?? 'kg') === u ? colors.ctaFg : colors.foreground }]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Height</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
          value={p.height ?? ''}
          onChangeText={(t) => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), height: t || null }))}
          placeholder="e.g. 175"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Goal weight</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
          value={p.goal_weight ?? ''}
          onChangeText={(t) => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), goal_weight: t || null }))}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Body fat %</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
          value={p.body_fat ?? ''}
          onChangeText={(t) => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), body_fat: t || null }))}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity
          onPress={saveProfile}
          disabled={savingProfile}
          style={[styles.primaryBtn, { backgroundColor: colors.ctaBg }]}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color={colors.ctaFg} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.ctaFg }]}>Save profile</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weight log</Text>
          <TouchableOpacity onPress={() => setShowWeightModal(true)}>
            <Text style={{ color: colors.accentText, fontSize: 14 }}>Add</Text>
          </TouchableOpacity>
        </View>
        {weightLogs.length === 0 ? (
          <Text style={[styles.muted, { color: colors.textMuted }]}>No entries yet.</Text>
        ) : (
          weightLogs.slice(0, 10).map((row) => (
            <View key={row.id} style={[styles.logRow, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.logDate, { color: colors.foreground }]}>{format(new Date(row.date), 'MMM d, yyyy')}</Text>
              <Text style={[styles.logValue, { color: colors.foreground }]}>{row.weight} kg</Text>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Body fat log</Text>
          <TouchableOpacity onPress={() => setShowBodyfatModal(true)}>
            <Text style={{ color: colors.accentText, fontSize: 14 }}>Add</Text>
          </TouchableOpacity>
        </View>
        {bodyfatLogs.length === 0 ? (
          <Text style={[styles.muted, { color: colors.textMuted }]}>No entries yet.</Text>
        ) : (
          bodyfatLogs.slice(0, 10).map((row) => (
            <View key={row.id} style={[styles.logRow, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.logDate, { color: colors.foreground }]}>{format(new Date(row.date), 'MMM d, yyyy')}</Text>
              <Text style={[styles.logValue, { color: colors.foreground }]}>{row.bodyfat}%</Text>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Body measurements</Text>
          <TouchableOpacity onPress={() => setShowMeasureModal(true)}>
            <Text style={{ color: colors.accentText, fontSize: 14 }}>Add</Text>
          </TouchableOpacity>
        </View>
        {measurements.length === 0 ? (
          <Text style={[styles.muted, { color: colors.textMuted }]}>No measurements yet.</Text>
        ) : (
          measurements.slice(0, 10).map((row) => (
            <View key={row.id} style={[styles.logRow, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.logDate, { color: colors.foreground }]}>{format(new Date(row.date), 'MMM d, yyyy')}</Text>
              <Text style={[styles.logValue, { color: colors.foreground }]}>
                {row.waist != null ? `Waist: ${row.waist} cm` : '—'}
              </Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity onPress={toggleTheme} style={[styles.button, { backgroundColor: colors.muted }]}>
        <Text style={[styles.buttonText, { color: colors.foreground }]}>Theme: {isDark ? 'Dark' : 'Light'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => signOut()} style={[styles.button, { backgroundColor: colors.destructive }]}>
        <Text style={[styles.buttonText, { color: '#fff' }]}>Sign out</Text>
      </TouchableOpacity>

      <Modal visible={showWeightModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.elevated }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add weight</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
              value={weightDate}
              onChangeText={setWeightDate}
              placeholder="yyyy-MM-dd"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
              value={weightValue}
              onChangeText={setWeightValue}
              placeholder="Weight (kg)"
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowWeightModal(false)} style={[styles.modalBtn, { backgroundColor: colors.muted }]}>
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addWeight} style={[styles.modalBtn, { backgroundColor: colors.ctaBg }]}>
                <Text style={{ color: colors.ctaFg }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showBodyfatModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.elevated }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add body fat %</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
              value={bodyfatDate}
              onChangeText={setBodyfatDate}
              placeholder="yyyy-MM-dd"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
              value={bodyfatValue}
              onChangeText={setBodyfatValue}
              placeholder="Body fat %"
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowBodyfatModal(false)} style={[styles.modalBtn, { backgroundColor: colors.muted }]}>
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addBodyfat} style={[styles.modalBtn, { backgroundColor: colors.ctaBg }]}>
                <Text style={{ color: colors.ctaFg }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMeasureModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.elevated }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add measurement</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
              value={measureDate}
              onChangeText={setMeasureDate}
              placeholder="yyyy-MM-dd"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
              value={measureWaist}
              onChangeText={setMeasureWaist}
              placeholder="Waist (cm, optional)"
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowMeasureModal(false)} style={[styles.modalBtn, { backgroundColor: colors.muted }]}>
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addMeasurement} style={[styles.modalBtn, { backgroundColor: colors.ctaBg }]}>
                <Text style={{ color: colors.ctaFg }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  backText: { fontSize: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  xpCard: {
    borderRadius: radius.cardCustom,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  xpTitle: { fontSize: 14, fontWeight: '600' },
  xpTotal: { fontSize: 12 },
  xpBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 4 },
  card: {
    borderRadius: radius.cardCustom,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing[3] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  label: { fontSize: 12, marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderRadius: radius.inputCustom,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 16,
    marginBottom: spacing[3],
  },
  unitRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  unitBtn: { flex: 1, paddingVertical: spacing[2], alignItems: 'center', borderRadius: radius.lg, borderWidth: 1 },
  unitBtnText: { fontSize: 14, fontWeight: '600' },
  primaryBtn: {
    borderRadius: radius.buttonCta,
    paddingVertical: spacing[3],
    alignItems: 'center',
    marginTop: spacing[2],
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700' },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[2], borderTopWidth: 1 },
  logDate: { fontSize: 14 },
  logValue: { fontSize: 14, fontWeight: '600' },
  muted: { fontSize: 14 },
  button: {
    borderRadius: radius.buttonCta,
    paddingVertical: spacing[3],
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  buttonText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[5] },
  modalBox: { width: '100%', maxWidth: 340, borderRadius: radius['2xl'], padding: spacing[5] },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing[4] },
  modalActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  modalBtn: { flex: 1, paddingVertical: spacing[3], alignItems: 'center', borderRadius: radius.lg },
});
