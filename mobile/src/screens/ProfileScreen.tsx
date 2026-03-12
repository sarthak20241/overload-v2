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
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useXP } from '../context/XPContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import {
  Users,
  User,
  Ruler,
  Scale,
  Target,
  Activity,
  Settings,
  LogOut,
  Trash2,
  Moon,
  Sun,
  Plus,
} from 'lucide-react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { Database } from '../types/database';

const APP_VERSION_RAW = require('../../app.json').expo.version || '1.0.0';
const APP_VERSION = APP_VERSION_RAW.split('.').slice(0, 2).join('.');

const pill = (selected: boolean, colors: Record<string, string>) =>
  selected ? { backgroundColor: colors.ctaBg } : { backgroundColor: colors.muted };
const pillText = (selected: boolean, colors: Record<string, string>) =>
  selected ? colors.ctaFg : colors.foreground;

const BASIC_INFO_COLORS = {
  iconPurple: '#a855f7',
  iconTeal: '#06b6d4',
  iconOrange: '#f59e0b',
  iconRedOrange: '#f97316',
} as const;

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type BodyMeasurementRow = Database['public']['Tables']['body_measurements']['Row'];
type WeightLogRow = Database['public']['Tables']['weight_log']['Row'];
type BodyfatLogRow = Database['public']['Tables']['bodyfat_log']['Row'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
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
  const [workoutCount, setWorkoutCount] = useState<number>(0);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    const [profileRes, countRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setProfile((profileRes.data as ProfileRow) ?? null);
    setWorkoutCount(countRes.count ?? 0);
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
    loadProfile().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, loadProfile]);

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
  const isGuest = user?.is_anonymous ?? false;
  const displayName =
    (p.display_name?.trim() || user?.user_metadata?.full_name) ?? (isGuest ? 'Guest' : '');
  const sinceDate = p.created_at ?? user?.created_at;
  const sinceLabel = sinceDate ? format(new Date(sinceDate), 'MMM yyyy') : null;
  const initial = displayName ? displayName.trim().charAt(0).toUpperCase() : '?';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.pageTop,
        paddingBottom: insets.bottom + spacing[8],
        paddingHorizontal: spacing.pageX,
      }}
    >
      {/* Hero — Figma: square-rounded avatar with glow, GUEST pill, name, subtitle, pills */}
      <View style={styles.hero}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.ctaBg ?? colors.card,
              borderColor: colors.accentText ?? colors.ctaBg,
              shadowColor: colors.accentText ?? colors.ctaBg,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.ctaFg ?? colors.primaryForeground }]}>{initial}</Text>
        </View>
        {isGuest && (
          <View style={[styles.guestPill, { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.guestPillText}>GUEST</Text>
          </View>
        )}
        <Text style={[styles.heroName, { color: colors.foreground }]}>{displayName || 'Profile'}</Text>
        <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
          {isGuest ? 'Guest account' : 'Member'}
        </Text>
        <View style={styles.heroPills}>
          {sinceLabel && (
            <View style={[styles.heroPill, { backgroundColor: colors.surfaceHover ?? colors.muted }]}>
              <Text style={[styles.heroPillText, { color: colors.mutedForeground }]}>Since {sinceLabel}</Text>
            </View>
          )}
          <View style={[styles.heroPill, { backgroundColor: colors.ctaBg }]}>
            <Text style={[styles.heroPillText, { color: colors.ctaFg }]}>{workoutCount} workouts</Text>
          </View>
        </View>
      </View>

      {/* XP / Level card — Figma: large level #, leaf + tier + total XP, Level X→X+1, bar, XP details */}
      <View style={[styles.xpCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <View style={styles.xpCardRow}>
          <Text style={[styles.xpLevelBig, { color: colors.mutedForeground }]}>{xp.level}</Text>
          <View style={styles.xpCardRight}>
            <View style={styles.xpTitleRow}>
              <Text style={[styles.xpTitleIcon, { color: colors.foreground }]}>{xp.titleIcon}</Text>
              <Text style={[styles.xpTitle, { color: colors.foreground }]}>{xp.title}</Text>
            </View>
            <Text style={[styles.xpTotal, { color: colors.mutedForeground }]}>
              {xp.totalXP.toLocaleString()} total XP
            </Text>
          </View>
        </View>
        <Text style={[styles.xpLevelLabel, { color: colors.mutedForeground }]}>
          Level {xp.level} → {xp.level + 1}
        </Text>
        <View style={[styles.xpBarBg, { backgroundColor: colors.muted }]}>
          <View
            style={[styles.xpBarFill, { width: `${Math.min(100, xp.progress * 100)}%`, backgroundColor: xp.titleColor }]}
          />
        </View>
        <View style={styles.xpBarLabels}>
          <Text style={[styles.xpBarLabel, { color: colors.mutedForeground }]}>
            {xp.xpInCurrentLevel} / {xp.xpNeededForNext} XP
          </Text>
          <Text style={[styles.xpBarLabel, { color: colors.mutedForeground }]}>
            {Math.round(xp.progress * 100)}% to next level
          </Text>
        </View>
      </View>

      {/* BASIC INFORMATION — Match design: colored icons per row, pills, dark value fields, goal bar */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconWrap}>
            <User size={14} color={BASIC_INFO_COLORS.iconPurple} />
          </View>
          <Text style={[styles.sectionTitleUc, { color: colors.mutedForeground }]}>BASIC INFORMATION</Text>
        </View>

        {/* Gender — purple person icon + M/F/O pills (selected lime, unselected dark grey + white text) */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <User size={20} color={BASIC_INFO_COLORS.iconPurple} />
          </View>
          <Text style={[styles.infoRowLabel, { color: colors.foreground }]}>Gender</Text>
          <View style={styles.unitRowInline}>
            {(['M', 'F', 'O'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), gender: g }))}
                style={[styles.basicPill, pill((p.gender ?? '') === g, colors)]}
              >
                <Text style={[styles.basicPillText, { color: pillText((p.gender ?? '') === g, colors) }]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Height — teal ruler + value field + cm/ft pills */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Ruler size={20} color={BASIC_INFO_COLORS.iconTeal} />
          </View>
          <Text style={[styles.infoRowLabel, { color: colors.foreground }]}>Height</Text>
          <View style={styles.infoRowControl}>
            <TextInput
              style={[styles.basicInput, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.borderSubtle }]}
              value={p.height ?? ''}
              onChangeText={(t) => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), height: t || null }))}
              placeholder="—"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitRowInline}>
              {(['cm', 'ft'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), height_unit: u }))}
                  style={[styles.basicPill, pill((p.height_unit ?? 'cm') === u, colors)]}
                >
                  <Text style={[styles.basicPillText, { color: pillText((p.height_unit ?? 'cm') === u, colors) }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Weight — teal scale + value field + kg/lbs pills + circular lime + */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Scale size={20} color={BASIC_INFO_COLORS.iconTeal} />
          </View>
          <Text style={[styles.infoRowLabel, { color: colors.foreground }]}>Weight</Text>
          <View style={styles.infoRowControl}>
            <TextInput
              style={[styles.basicInput, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.borderSubtle }]}
              value={p.weight ?? ''}
              onChangeText={(t) => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), weight: t || null }))}
              placeholder="—"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitRowInline}>
              {['kg', 'lbs'].map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), weight_unit: u }))}
                  style={[styles.basicPill, pill((p.weight_unit ?? 'kg') === u, colors)]}
                >
                  <Text style={[styles.basicPillText, { color: pillText((p.weight_unit ?? 'kg') === u, colors) }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setShowWeightModal(true)}
              style={[styles.plusBtn, { backgroundColor: colors.ctaBg }]}
            >
              <Plus size={20} color={colors.ctaFg} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Goal — orange target icon + value field + muted "X to lose" */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Target size={20} color={BASIC_INFO_COLORS.iconOrange} />
          </View>
          <Text style={[styles.infoRowLabel, { color: colors.foreground }]}>Goal</Text>
          <View style={styles.infoRowControl}>
            <TextInput
              style={[styles.basicInput, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.borderSubtle }]}
              value={p.goal_weight ?? ''}
              onChangeText={(t) => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), goal_weight: t || null }))}
              placeholder="—"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
            {(() => {
              const w = p.weight ? parseFloat(p.weight) : NaN;
              const g = p.goal_weight ? parseFloat(p.goal_weight) : NaN;
              const toLose = !Number.isNaN(w) && !Number.isNaN(g) && w > g ? (w - g).toFixed(1) : null;
              return toLose != null ? (
                <Text style={[styles.toLose, { color: colors.textMuted ?? colors.mutedForeground }]}>{toLose} to lose</Text>
              ) : null;
            })()}
          </View>
        </View>

        {/* Body Fat — reddish-orange icon + value field + % + circular lime + */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Activity size={20} color={BASIC_INFO_COLORS.iconRedOrange} />
          </View>
          <Text style={[styles.infoRowLabel, { color: colors.foreground }]}>Body Fat</Text>
          <View style={styles.infoRowControl}>
            <TextInput
              style={[styles.basicInput, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.borderSubtle }]}
              value={p.body_fat ?? ''}
              onChangeText={(t) => setProfile((prev) => ({ ...(prev ?? ({} as ProfileRow)), body_fat: t || null }))}
              placeholder="—"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.basicPercent, { color: colors.foreground }]}>%</Text>
            <TouchableOpacity
              onPress={() => setShowBodyfatModal(true)}
              style={[styles.plusBtn, { backgroundColor: colors.ctaBg }]}
            >
              <Plus size={20} color={colors.ctaFg} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Goal progress bar */}
        {(() => {
          const w = p.weight ? parseFloat(p.weight) : NaN;
          const g = p.goal_weight ? parseFloat(p.goal_weight) : NaN;
          const pct =
            !Number.isNaN(w) && !Number.isNaN(g) && w > 0 && g > 0
              ? Math.min(100, Math.max(0, w >= g ? (g / w) * 100 : 100))
              : null;
          const unit = p.weight_unit ?? 'kg';
          return (
            <View style={styles.goalBarBlock}>
              <View style={styles.goalBarLabels}>
                <Text style={[styles.xpBarLabel, { color: colors.mutedForeground }]}>
                  {pct != null ? `${Math.round(pct)}% to goal` : '—'}
                </Text>
                <Text style={[styles.xpBarLabel, { color: colors.mutedForeground }]}>
                  {!Number.isNaN(w) && !Number.isNaN(g) ? `${w} → ${g} ${unit}` : '—'}
                </Text>
              </View>
              <View style={[styles.xpBarBg, { backgroundColor: colors.muted }]}>
                {pct != null && pct > 0 && (
                  <View style={[styles.goalBarFill, { width: `${pct}%` }]}>
                    <Svg width={300} height={8} viewBox="0 0 300 8" preserveAspectRatio="none">
                      <Defs>
                        <LinearGradient id="goalBarGrad" x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0" stopColor="#f59e0b" />
                          <Stop offset="1" stopColor="#eab308" />
                        </LinearGradient>
                      </Defs>
                      <Rect x={0} y={0} width={300} height={8} rx={4} fill="url(#goalBarGrad)" />
                    </Svg>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

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

      {/* PREFERENCES — Figma: header + Appearance row (moon/sun + toggle only) */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconWrap}>
            <Settings size={14} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.sectionTitleUc, { color: colors.mutedForeground }]}>PREFERENCES</Text>
        </View>
        <View style={styles.prefRow}>
          {isDark ? <Moon size={20} color={colors.mutedForeground} /> : <Sun size={20} color={colors.mutedForeground} />}
          <Text style={[styles.prefRowLabel, { color: colors.foreground }]}>Appearance</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.muted, true: colors.ctaBg }}
            thumbColor={colors.ctaFg}
          />
        </View>
      </View>

      {/* ACCOUNT */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitleUc, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        </View>
        <TouchableOpacity
          onPress={() => signOut()}
          style={[styles.accountRow, { backgroundColor: colors.muted }]}
        >
          <LogOut size={20} color={colors.foreground} />
          <Text style={[styles.accountRowText, { color: colors.foreground }]}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Delete Account',
              'Account deletion is not available in this build. Contact support if you need to delete your data.',
              [{ text: 'OK' }]
            );
          }}
          style={[styles.accountRow, { backgroundColor: colors.destructive }]}
        >
          <Trash2 size={20} color="#fff" />
          <Text style={[styles.accountRowText, { color: '#fff' }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.versionFooter, { color: colors.textMuted }]}>Overload v{APP_VERSION}</Text>

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
  hero: { alignItems: 'center', marginBottom: spacing[6] },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  avatarText: { fontSize: 32, fontWeight: '700' },
  guestPill: { paddingHorizontal: spacing[2], paddingVertical: 4, borderRadius: 999, marginBottom: spacing[2] },
  guestPillText: { fontSize: 12, fontWeight: '700', color: '#0a0a0a' },
  heroName: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  heroSubtitle: { fontSize: 14, marginBottom: spacing[3] },
  heroPills: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap', justifyContent: 'center' },
  heroPill: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: 999 },
  heroPillText: { fontSize: 12, fontWeight: '600' },
  xpCard: {
    borderRadius: radius.cardCustom,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  xpCardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[3] },
  xpLevelBig: { fontSize: 48, fontWeight: '800', marginRight: spacing[4], lineHeight: 52 },
  xpCardRight: { flex: 1 },
  xpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  xpTitleIcon: { fontSize: 16 },
  xpTitle: { fontSize: 16, fontWeight: '600' },
  xpTotal: { fontSize: 12 },
  xpLevelLabel: { fontSize: 12, marginBottom: spacing[1] },
  xpBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 4 },
  xpBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[1] },
  xpBarLabel: { fontSize: 11 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing[3] },
  sectionIconWrap: { width: 20, alignItems: 'center', justifyContent: 'center' },
  sectionTitleUc: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[4] },
  infoIconWrap: { width: 28, alignItems: 'center', justifyContent: 'center', marginRight: spacing[2] },
  infoRowLabel: { fontSize: 14, flex: 1, fontWeight: '500' },
  infoRowControl: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  basicInput: {
    width: 64,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    fontSize: 14,
    textAlign: 'center',
  },
  basicPill: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999 },
  basicPillText: { fontSize: 14, fontWeight: '600' },
  basicPercent: { fontSize: 14, fontWeight: '500', marginLeft: 2 },
  plusBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  toLose: { fontSize: 12, marginLeft: spacing[1], fontWeight: '500' },
  goalBarBlock: { marginTop: spacing[2], marginBottom: spacing[3] },
  goalBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  goalBarFill: { height: 8, borderRadius: 4, overflow: 'hidden' },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  prefRowLabel: { fontSize: 14, flex: 1 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[3], borderRadius: radius.lg, marginBottom: spacing[2] },
  accountRowText: { fontSize: 14, fontWeight: '600' },
  versionFooter: { fontSize: 11, textAlign: 'center', marginTop: spacing[4], marginBottom: spacing[2] },
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
  unitRowInline: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
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
