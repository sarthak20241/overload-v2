import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LogOut, Trash2, Scale, ChevronRight,
  Shield, X, Sun, Moon, Bug, Send, User, Ruler, Weight,
  Target, Plus
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../../utils/api";
import type { WorkoutSession } from "../../types";
import { toast } from "sonner";
import { XPProfileCard } from "../../components/XPLevelBadge";
import { useXP } from "../../context/XPContext";

/* -- Helpers -- */
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

interface BasicInfo {
  gender: "male" | "female" | "other" | "";
  height: string;
  heightUnit: "cm" | "ft";
  weight: string;
  weightUnit: "kg" | "lbs";
  goalWeight: string;
  bodyFat: string;
}

function loadBasicInfo(): BasicInfo {
  try {
    const raw = localStorage.getItem("overload_basic_info");
    if (raw) {
      const p = JSON.parse(raw);
      return { gender: p.gender || "", height: p.height || "", heightUnit: p.heightUnit || "cm", weight: p.weight || "", weightUnit: p.weightUnit || "kg", goalWeight: p.goalWeight || "", bodyFat: p.bodyFat || "" };
    }
  } catch {}
  return { gender: "", height: "", heightUnit: "cm", weight: "", weightUnit: "kg", goalWeight: "", bodyFat: "" };
}

function saveBasicInfo(info: BasicInfo) {
  localStorage.setItem("overload_basic_info", JSON.stringify(info));
}

export interface WeightEntry { date: string; weight: number; }
export interface BodyFatEntry { date: string; bodyFat: number; }

export function loadWeightLog(): WeightEntry[] {
  try { const r = localStorage.getItem("overload_weight_log"); if (r) return JSON.parse(r); } catch {} return [];
}
export function saveWeightLog(log: WeightEntry[]) { localStorage.setItem("overload_weight_log", JSON.stringify(log)); }

export function loadBodyFatLog(): BodyFatEntry[] {
  try { const r = localStorage.getItem("overload_bodyfat_log"); if (r) return JSON.parse(r); } catch {} return [];
}
export function saveBodyFatLog(log: BodyFatEntry[]) { localStorage.setItem("overload_bodyfat_log", JSON.stringify(log)); }

/* -- Main Component -- */
export function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut, deleteAccount, isGuest } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { level, titleColor } = useXP();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">(
    () => (localStorage.getItem("overload_unit") as "kg" | "lbs") || "kg"
  );
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugCategory, setBugCategory] = useState<"ui" | "data" | "crash" | "performance" | "other">("ui");
  const [bugSubmitting, setBugSubmitting] = useState(false);

  const [basicInfo, setBasicInfo] = useState<BasicInfo>(loadBasicInfo);
  const [weightLog, setWeightLog] = useState<WeightEntry[]>(loadWeightLog);
  const [bodyFatLog, setBodyFatLog] = useState<BodyFatEntry[]>(loadBodyFatLog);

  useEffect(() => {
    api.sessions.list().then(setSessions).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalWorkouts = sessions.length;
  const rawName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Athlete";
  const displayName = rawName;
  const email = user?.email || (isGuest || user?.is_anonymous ? "Guest account" : "—");
  const isGuestUser = isGuest || user?.is_anonymous;
  const initials = getInitials(displayName);
  const memberSince = user?.created_at ? format(new Date(user.created_at), "MMM yyyy") : "—";

  const toggleUnit = () => {
    const next = weightUnit === "kg" ? "lbs" : "kg";
    setWeightUnit(next);
    localStorage.setItem("overload_unit", next);
    toast.success(`Weight unit set to ${next}`);
  };

  const handleSignOut = async () => {
    try { await signOut(); navigate("/auth", { replace: true }); } catch (err: any) { toast.error(err.message || "Failed to sign out"); }
  };
  const handleDeleteAccount = async () => {
    try { await deleteAccount(); navigate("/auth", { replace: true }); } catch (err: any) { toast.error(err.message || "Failed to delete account"); }
  };

  const updateBasicInfo = (patch: Partial<BasicInfo>) => {
    const updated = { ...basicInfo, ...patch };
    setBasicInfo(updated);
    saveBasicInfo(updated);
  };

  const addWeightEntry = () => {
    const num = parseFloat(basicInfo.weight);
    if (isNaN(num) || num <= 0) { toast.error("Enter a valid weight first"); return; }
    const entry: WeightEntry = { date: new Date().toISOString(), weight: num };
    const today = format(new Date(), "yyyy-MM-dd");
    const latest = weightLog.length > 0 ? weightLog[weightLog.length - 1] : null;
    const updated = (latest && format(new Date(latest.date), "yyyy-MM-dd") === today)
      ? [...weightLog.slice(0, -1), entry] : [...weightLog, entry];
    setWeightLog(updated); saveWeightLog(updated);
    toast.success("Weight logged");
  };

  const logBodyFat = () => {
    const num = parseFloat(basicInfo.bodyFat);
    if (isNaN(num) || num <= 0 || num > 60) { toast.error("Enter valid body fat %"); return; }
    const entry: BodyFatEntry = { date: new Date().toISOString(), bodyFat: num };
    const today = format(new Date(), "yyyy-MM-dd");
    const latest = bodyFatLog.length > 0 ? bodyFatLog[bodyFatLog.length - 1] : null;
    const updated = (latest && format(new Date(latest.date), "yyyy-MM-dd") === today)
      ? [...bodyFatLog.slice(0, -1), entry] : [...bodyFatLog, entry];
    setBodyFatLog(updated); saveBodyFatLog(updated);
    toast.success("Body fat logged");
  };

  const goalProgress = (() => {
    const current = parseFloat(basicInfo.weight);
    const goal = parseFloat(basicInfo.goalWeight);
    if (isNaN(current) || isNaN(goal) || current <= 0 || goal <= 0) return null;
    const startWeight = weightLog.length > 0 ? weightLog[0].weight : current;
    const totalDelta = Math.abs(startWeight - goal);
    const currentDelta = Math.abs(current - goal);
    const pct = totalDelta > 0 ? Math.max(0, Math.min(1, 1 - currentDelta / totalDelta)) : (Math.abs(current - goal) < 0.5 ? 1 : 0);
    const diff = current - goal;
    let label = "";
    if (Math.abs(diff) < 0.5) label = "At goal!";
    else if (diff > 0) label = `${diff.toFixed(1)} to lose`;
    else label = `${Math.abs(diff).toFixed(1)} to gain`;
    return { pct, label };
  })();

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* Hero */}
      <div className="relative pt-14 pb-6 px-5 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 60% at 50% -20%, var(--t-accent-text), transparent)` }} />
        <div className="relative flex flex-col items-center text-center">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }} className="relative mb-3">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-black"
              style={{ background: `linear-gradient(135deg, var(--t-circle-bg), var(--t-circle-bg))`, color: 'var(--t-circle-fg)', boxShadow: 'var(--t-circle-shadow)', border: 'var(--t-circle-border)' }}>
              {initials}
            </div>
            {isGuestUser && <div className="absolute -bottom-1.5 -right-1.5 bg-[#f59e0b] text-[#0a0a0a] text-[8px] font-bold px-1.5 py-0.5 rounded-full">GUEST</div>}
            {!isGuestUser && (
              <div className="absolute -bottom-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-black"
                style={{ backgroundColor: titleColor, color: '#0a0a0a', boxShadow: `0 0 8px ${titleColor}50` }}>{level}</div>
            )}
          </motion.div>
          <h1 className="text-xl font-black tracking-tight">{displayName}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>{email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full border" style={{ color: 'var(--t-text-secondary)', backgroundColor: 'var(--t-badge-bg)', borderColor: 'var(--t-border-light)' }}>Since {memberSince}</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full border" style={{ color: 'var(--t-accent-text)', backgroundColor: 'var(--t-primary-muted)', borderColor: 'var(--t-primary-border)' }}>{totalWorkouts} workouts</span>
          </div>
        </div>
      </div>

      {/* XP */}
      <section className="px-5 mb-4"><XPProfileCard /></section>

      {/* Basic Info */}
      <section className="px-5 mb-4">
        <SectionLabel icon={<User size={12} />}>Basic Information</SectionLabel>
        <div className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--t-border-subtle)', boxShadow: 'var(--t-shadow-card)' }}>

          {/* Gender */}
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid var(--t-border-subtle)' }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#a855f715' }}>
              <User size={11} className="text-[#a855f7]" />
            </div>
            <span className="text-[11px] font-medium flex-shrink-0">Gender</span>
            <div className="flex gap-1 ml-auto">
              {([{ value: "male", label: "M" }, { value: "female", label: "F" }, { value: "other", label: "O" }] as const).map(opt => (
                <button key={opt.value} onClick={() => updateBasicInfo({ gender: opt.value })}
                  className="px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all"
                  style={{
                    backgroundColor: basicInfo.gender === opt.value ? 'var(--primary)' : 'transparent',
                    color: basicInfo.gender === opt.value ? 'var(--primary-foreground)' : 'var(--t-text-secondary)',
                    borderColor: basicInfo.gender === opt.value ? 'var(--primary)' : 'var(--t-border-light)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Height */}
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid var(--t-border-subtle)' }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#06b6d415' }}>
              <Ruler size={11} className="text-[#06b6d4]" />
            </div>
            <span className="text-[11px] font-medium flex-shrink-0">Height</span>
            <div className="flex items-center gap-1.5 ml-auto flex-1 justify-end">
              <input type="number" value={basicInfo.height} onChange={(e) => updateBasicInfo({ height: e.target.value })}
                placeholder={basicInfo.heightUnit === "cm" ? "175" : "5.9"}
                className="w-20 px-2.5 py-1.5 rounded-lg text-sm outline-none border text-right placeholder:opacity-30"
                style={{ backgroundColor: 'var(--t-glow-1)', borderColor: 'var(--t-border-subtle)', color: 'var(--foreground)' }} />
              <button onClick={() => updateBasicInfo({ heightUnit: basicInfo.heightUnit === "cm" ? "ft" : "cm" })}
                className="flex items-center h-6 rounded-full overflow-hidden border flex-shrink-0"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}>
                {(["cm", "ft"] as const).map(u => (
                  <span key={u} className="px-1.5 h-full flex items-center text-[8px] font-bold transition-all"
                    style={{ backgroundColor: basicInfo.heightUnit === u ? 'var(--primary)' : 'transparent', color: basicInfo.heightUnit === u ? 'var(--primary-foreground)' : 'var(--t-text-muted)' }}>
                    {u}
                  </span>
                ))}
              </button>
            </div>
          </div>

          {/* Weight */}
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid var(--t-border-subtle)' }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#10b98115' }}>
              <Weight size={11} className="text-[#10b981]" />
            </div>
            <span className="text-[11px] font-medium flex-shrink-0">Weight</span>
            <div className="flex items-center gap-1.5 ml-auto flex-1 justify-end">
              <input type="number" value={basicInfo.weight} onChange={(e) => updateBasicInfo({ weight: e.target.value })}
                placeholder={basicInfo.weightUnit === "kg" ? "75" : "165"}
                className="w-20 px-2.5 py-1.5 rounded-lg text-sm outline-none border text-right placeholder:opacity-30"
                style={{ backgroundColor: 'var(--t-glow-1)', borderColor: 'var(--t-border-subtle)', color: 'var(--foreground)' }} />
              <button onClick={() => updateBasicInfo({ weightUnit: basicInfo.weightUnit === "kg" ? "lbs" : "kg" })}
                className="flex items-center h-6 rounded-full overflow-hidden border flex-shrink-0"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}>
                {(["kg", "lbs"] as const).map(u => (
                  <span key={u} className="px-1.5 h-full flex items-center text-[8px] font-bold transition-all"
                    style={{ backgroundColor: basicInfo.weightUnit === u ? 'var(--primary)' : 'transparent', color: basicInfo.weightUnit === u ? 'var(--primary-foreground)' : 'var(--t-text-muted)' }}>
                    {u}
                  </span>
                ))}
              </button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={addWeightEntry}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }} title="Log weight">
                <Plus size={12} />
              </motion.button>
            </div>
          </div>

          {/* Goal Weight */}
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid var(--t-border-subtle)' }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f59e0b15' }}>
              <Target size={11} className="text-[#f59e0b]" />
            </div>
            <span className="text-[11px] font-medium flex-shrink-0">Goal</span>
            <div className="flex items-center gap-1.5 ml-auto flex-1 justify-end">
              <input type="number" value={basicInfo.goalWeight} onChange={(e) => updateBasicInfo({ goalWeight: e.target.value })}
                placeholder={basicInfo.weightUnit}
                className="w-20 px-2.5 py-1.5 rounded-lg text-sm outline-none border text-right placeholder:opacity-30"
                style={{ backgroundColor: 'var(--t-glow-1)', borderColor: 'var(--t-border-subtle)', color: 'var(--foreground)' }} />
              {goalProgress && (
                <span className="text-[8px] font-semibold whitespace-nowrap" style={{ color: 'var(--t-text-muted)' }}>{goalProgress.label}</span>
              )}
            </div>
          </div>

          {/* Body Fat */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ef444415' }}>
              <Scale size={11} className="text-[#ef4444]" />
            </div>
            <span className="text-[11px] font-medium flex-shrink-0">Body Fat</span>
            <div className="flex items-center gap-1.5 ml-auto flex-1 justify-end">
              <input type="number" value={basicInfo.bodyFat} onChange={(e) => updateBasicInfo({ bodyFat: e.target.value })}
                placeholder="%"
                className="w-16 px-2.5 py-1.5 rounded-lg text-sm outline-none border text-right placeholder:opacity-30"
                style={{ backgroundColor: 'var(--t-glow-1)', borderColor: 'var(--t-border-subtle)', color: 'var(--foreground)' }} />
              <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--t-text-dim)' }}>%</span>
              <motion.button whileTap={{ scale: 0.9 }} onClick={logBodyFat}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }} title="Log body fat">
                <Plus size={12} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Goal progress bar */}
        {goalProgress && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px]" style={{ color: 'var(--t-text-dim)' }}>{Math.round(goalProgress.pct * 100)}% to goal</span>
              <span className="text-[8px]" style={{ color: 'var(--t-text-dim)' }}>{basicInfo.weight} → {basicInfo.goalWeight} {basicInfo.weightUnit}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f59e0b15' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${goalProgress.pct * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full"
                style={{ backgroundColor: '#f59e0b', boxShadow: '0 0 8px #f59e0b40' }} />
            </div>
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="px-5 mb-4">
        <SectionLabel icon={<Shield size={12} />}>Preferences</SectionLabel>
        <div className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--t-border-subtle)', boxShadow: 'var(--t-shadow-card)' }}>

          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid var(--t-border-subtle)' }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--t-glow-2)' }}>
              {isDark ? <Moon size={11} style={{ color: 'var(--muted-foreground)' }} /> : <Sun size={11} style={{ color: 'var(--muted-foreground)' }} />}
            </div>
            <span className="text-[11px] font-medium flex-1">Appearance</span>
            <button onClick={toggleTheme} className="flex items-center h-6 rounded-full overflow-hidden border"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}>
              {(["dark", "light"] as const).map(mode => (
                <span key={mode} className="px-2 h-full flex items-center text-[10px] font-bold transition-all"
                  style={{
                    backgroundColor: (isDark && mode === "dark") || (!isDark && mode === "light") ? 'var(--primary)' : 'transparent',
                    color: (isDark && mode === "dark") || (!isDark && mode === "light") ? 'var(--primary-foreground)' : 'var(--t-text-muted)',
                  }}>
                  {mode === "dark" ? <Moon size={10} /> : <Sun size={10} />}
                </span>
              ))}
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid var(--t-border-subtle)' }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--t-glow-2)' }}>
              <Scale size={11} style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <span className="text-[11px] font-medium flex-1">Weight Unit</span>
            <button onClick={toggleUnit} className="flex items-center h-6 rounded-full overflow-hidden border"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}>
              {(["kg", "lbs"] as const).map(unit => (
                <span key={unit} className="px-2 h-full flex items-center text-[10px] font-bold transition-all"
                  style={{ backgroundColor: weightUnit === unit ? 'var(--primary)' : 'transparent', color: weightUnit === unit ? 'var(--primary-foreground)' : 'var(--t-text-muted)' }}>
                  {unit}
                </span>
              ))}
            </button>
          </div>

          <button onClick={() => setBugModalOpen(true)} className="flex items-center gap-2 px-3 py-2.5 w-full text-left hover:opacity-80">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f9731615' }}>
              <Bug size={11} className="text-[#f97316]" />
            </div>
            <span className="text-[11px] font-medium flex-1">Report a Bug</span>
            <ChevronRight size={12} style={{ color: 'var(--t-text-dim)' }} />
          </button>
        </div>
      </section>

      {/* Account */}
      <section className="px-5 mb-4">
        <SectionLabel>Account</SectionLabel>
        <div className="space-y-2">
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleSignOut}
            className="w-full flex items-center gap-2 p-3 rounded-2xl border"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--t-border-subtle)', boxShadow: 'var(--t-shadow-card)' }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--t-glow-2)' }}>
              <LogOut size={11} style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <span className="text-[11px] font-medium">Sign Out</span>
          </motion.button>
          <AnimatePresence mode="wait">
            {!deleteConfirm ? (
              <motion.button key="del" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                whileTap={{ scale: 0.98 }} onClick={() => setDeleteConfirm(true)}
                className="w-full flex items-center gap-2 p-3 rounded-2xl bg-red-500/8 border border-red-500/15">
                <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={11} className="text-red-400" />
                </div>
                <span className="text-[11px] font-medium text-red-400">Delete Account</span>
              </motion.button>
            ) : (
              <motion.div key="del-c" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25">
                <p className="text-[11px] text-red-400 mb-2">This permanently deletes your account and <strong>all data</strong>.</p>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1" style={{ backgroundColor: 'var(--t-glow-3)' }}><X size={10} /> Cancel</button>
                  <button onClick={handleDeleteAccount} className="flex-1 py-1.5 rounded-xl bg-red-500 text-white text-[11px] font-bold flex items-center justify-center gap-1"><Trash2 size={10} /> Delete</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <div className="px-5 text-center">
        <p className="text-[9px]" style={{ color: 'var(--t-text-faint)' }}>Overload v1.0</p>
      </div>

      {/* Bug Report Modal */}
      <AnimatePresence>
        {bugModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setBugModalOpen(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-t-3xl overflow-hidden"
              style={{ backgroundColor: 'var(--card)', borderTop: '1px solid var(--t-border-subtle)' }}>
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--t-text-faint)' }} />
              </div>
              <div className="px-5 pb-8">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f9731615' }}>
                      <Bug size={16} className="text-[#f97316]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Report a Bug</h2>
                      <p className="text-[11px]" style={{ color: 'var(--t-text-muted)' }}>We'll look into it ASAP</p>
                    </div>
                  </div>
                  <button onClick={() => setBugModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--t-glow-2)' }}>
                    <X size={16} style={{ color: 'var(--muted-foreground)' }} />
                  </button>
                </div>
                <div className="mb-4">
                  <label className="text-[10px] font-semibold tracking-widest uppercase mb-2 block" style={{ color: 'var(--t-text-muted)' }}>Category</label>
                  <div className="flex flex-wrap gap-2">
                    {([{ value: "ui", label: "UI" }, { value: "data", label: "Data" }, { value: "crash", label: "Crash" }, { value: "performance", label: "Perf" }, { value: "other", label: "Other" }] as const).map(cat => (
                      <button key={cat.value} onClick={() => setBugCategory(cat.value)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                        style={{
                          backgroundColor: bugCategory === cat.value ? 'var(--primary)' : 'transparent',
                          color: bugCategory === cat.value ? 'var(--primary-foreground)' : 'var(--t-text-secondary)',
                          borderColor: bugCategory === cat.value ? 'var(--primary)' : 'var(--t-border-light)',
                        }}>{cat.label}</button>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <input type="text" value={bugTitle} onChange={(e) => setBugTitle(e.target.value)}
                    placeholder="Brief summary..." maxLength={100}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none border placeholder:opacity-40"
                    style={{ backgroundColor: 'var(--t-glow-1)', borderColor: 'var(--t-border-subtle)', color: 'var(--foreground)' }} />
                </div>
                <div className="mb-5">
                  <textarea value={bugDescription} onChange={(e) => setBugDescription(e.target.value)}
                    placeholder="What happened?" rows={3} maxLength={1000}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none border resize-none placeholder:opacity-40"
                    style={{ backgroundColor: 'var(--t-glow-1)', borderColor: 'var(--t-border-subtle)', color: 'var(--foreground)' }} />
                </div>
                <motion.button whileTap={{ scale: 0.97 }} disabled={!bugTitle.trim() || bugSubmitting}
                  onClick={async () => {
                    setBugSubmitting(true);
                    try {
                      const report = { id: `bug_${Date.now()}`, category: bugCategory, title: bugTitle.trim(), description: bugDescription.trim(), timestamp: new Date().toISOString(), user: isGuestUser ? "guest" : (user?.email || "unknown"), theme: isDark ? "dark" : "light", appVersion: "1.0" };
                      const existing = JSON.parse(localStorage.getItem("overload_bug_reports") || "[]");
                      existing.push(report); localStorage.setItem("overload_bug_reports", JSON.stringify(existing));
                      toast.success("Bug report submitted!"); setBugTitle(""); setBugDescription(""); setBugCategory("ui"); setBugModalOpen(false);
                    } catch { toast.error("Failed"); } finally { setBugSubmitting(false); }
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}>
                  {bugSubmitting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <><Send size={14} /> Submit</>}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {icon && <span style={{ color: 'var(--t-text-muted)' }}>{icon}</span>}
      <h2 className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--t-text-muted)' }}>{children}</h2>
    </div>
  );
}
