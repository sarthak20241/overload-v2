/**
 * Body Measurements — Track and visualize body part measurements over time.
 * Compact layout: pill selector → chart → latest value card.
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, X, ChevronDown, TrendingUp, TrendingDown,
  Ruler, Calendar, Trash2, Save
} from "lucide-react";
import { format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

interface MeasurementEntry {
  id: string;
  date: string;
  chest?: number;
  shoulders?: number;
  neck?: number;
  bicepL?: number;
  bicepR?: number;
  forearmL?: number;
  forearmR?: number;
  waist?: number;
  hips?: number;
  thighL?: number;
  thighR?: number;
  calfL?: number;
  calfR?: number;
}

interface MeasurementsData {
  entries: MeasurementEntry[];
  unit: "cm" | "in";
}

// ── Measurement Fields Config ────────────────────────────────────────────────

const MEASUREMENT_FIELDS: {
  key: keyof Omit<MeasurementEntry, "id" | "date">;
  label: string;
  shortLabel: string;
  color: string;
  group: string;
}[] = [
  { key: "chest", label: "Chest", shortLabel: "Chest", color: "#ef4444", group: "Upper Body" },
  { key: "shoulders", label: "Shoulders", shortLabel: "Shoulders", color: "#f97316", group: "Upper Body" },
  { key: "neck", label: "Neck", shortLabel: "Neck", color: "#64748b", group: "Upper Body" },
  { key: "bicepL", label: "Bicep (L)", shortLabel: "Bicep L", color: "#06b6d4", group: "Arms" },
  { key: "bicepR", label: "Bicep (R)", shortLabel: "Bicep R", color: "#0ea5e9", group: "Arms" },
  { key: "forearmL", label: "Forearm (L)", shortLabel: "Forearm L", color: "#8b5cf6", group: "Arms" },
  { key: "forearmR", label: "Forearm (R)", shortLabel: "Forearm R", color: "#a855f7", group: "Arms" },
  { key: "waist", label: "Waist", shortLabel: "Waist", color: "#f59e0b", group: "Core" },
  { key: "hips", label: "Hips", shortLabel: "Hips", color: "#eab308", group: "Core" },
  { key: "thighL", label: "Thigh (L)", shortLabel: "Thigh L", color: "#10b981", group: "Legs" },
  { key: "thighR", label: "Thigh (R)", shortLabel: "Thigh R", color: "#34d399", group: "Legs" },
  { key: "calfL", label: "Calf (L)", shortLabel: "Calf L", color: "#84cc16", group: "Legs" },
  { key: "calfR", label: "Calf (R)", shortLabel: "Calf R", color: "#a3e635", group: "Legs" },
];

const GROUPS = ["Upper Body", "Arms", "Core", "Legs"] as const;

// ── Storage ──────────────────────────────────────────────────────────────────

const LS_KEY = "overload_measurements";

function loadMeasurements(): MeasurementsData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { entries: [], unit: "cm" };
}

function saveMeasurements(data: MeasurementsData) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs border"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--t-border-subtle)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      <p className="mb-0.5 font-medium" style={{ color: 'var(--t-text-muted)' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-black text-sm">
          {p.value} <span className="text-[10px] font-medium opacity-60">{unit}</span>
        </p>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function BodyMeasurements() {
  const [data, setData] = useState<MeasurementsData>(loadMeasurements);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedChart, setSelectedChart] = useState<string>("chest");
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const update = (newData: MeasurementsData) => {
    setData(newData);
    saveMeasurements(newData);
  };

  const toggleUnit = () => {
    update({ ...data, unit: data.unit === "cm" ? "in" : "cm" });
  };

  const openAddForm = () => {
    const lastEntry = data.entries[0];
    const prefill: Record<string, string> = {};
    if (lastEntry) {
      MEASUREMENT_FIELDS.forEach(f => {
        const val = lastEntry[f.key];
        if (val !== undefined) prefill[f.key] = String(val);
      });
    }
    setFormValues(prefill);
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setShowAddForm(true);
  };

  const saveEntry = () => {
    const entry: MeasurementEntry = {
      id: crypto.randomUUID(),
      date: new Date(formDate).toISOString(),
    };
    let hasValue = false;
    MEASUREMENT_FIELDS.forEach(f => {
      const val = formValues[f.key];
      if (val && !isNaN(Number(val)) && Number(val) > 0) {
        (entry as any)[f.key] = Number(val);
        hasValue = true;
      }
    });
    if (!hasValue) return;
    const newEntries = [entry, ...data.entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    update({ ...data, entries: newEntries });
    setShowAddForm(false);
    setFormValues({});
  };

  const deleteEntry = (id: string) => {
    update({ ...data, entries: data.entries.filter(e => e.id !== id) });
    setDeleteConfirmId(null);
  };

  const selectedField = MEASUREMENT_FIELDS.find(f => f.key === selectedChart)!;

  const chartData = useMemo(() => {
    return data.entries
      .slice()
      .reverse()
      .filter(e => (e as any)[selectedChart] !== undefined)
      .map(e => ({
        date: format(new Date(e.date), "MMM d"),
        value: (e as any)[selectedChart] as number,
      }));
  }, [data.entries, selectedChart]);

  // Latest values + trends for all fields
  const latestValues = useMemo(() => {
    const result: Record<string, { current: number; previous?: number; change?: number; first?: number; totalChange?: number }> = {};
    MEASUREMENT_FIELDS.forEach(f => {
      const withValue = data.entries.filter(e => (e as any)[f.key] !== undefined);
      if (withValue.length > 0) {
        const current = (withValue[0] as any)[f.key] as number;
        const previous = withValue.length > 1 ? (withValue[1] as any)[f.key] as number : undefined;
        const first = withValue.length > 1 ? (withValue[withValue.length - 1] as any)[f.key] as number : undefined;
        result[f.key] = {
          current,
          previous,
          change: previous !== undefined ? Number((current - previous).toFixed(1)) : undefined,
          first,
          totalChange: first !== undefined ? Number((current - first).toFixed(1)) : undefined,
        };
      }
    });
    return result;
  }, [data.entries]);

  // Fields that actually have data
  const fieldsWithData = MEASUREMENT_FIELDS.filter(f => latestValues[f.key]);
  const hasEntries = data.entries.length > 0;
  const selectedVal = latestValues[selectedChart];

  const cs = getComputedStyle(document.documentElement);
  const chartGrid = cs.getPropertyValue('--t-chart-grid').trim() || 'rgba(255,255,255,0.04)';
  const chartTick = cs.getPropertyValue('--t-chart-tick').trim() || '#555';

  return (
    <div className="space-y-3">
      {/* Header: unit toggle + log button */}
      <div className="flex items-center justify-between">
        <button
          onClick={toggleUnit}
          className="flex items-center h-7 rounded-full overflow-hidden border"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
        >
          {(["cm", "in"] as const).map(u => (
            <span
              key={u}
              className="px-2.5 h-full flex items-center text-[10px] font-bold transition-all duration-200"
              style={{
                backgroundColor: data.unit === u ? 'var(--primary)' : 'transparent',
                color: data.unit === u ? 'var(--primary-foreground)' : 'var(--t-text-muted)',
              }}
            >
              {u}
            </span>
          ))}
        </button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openAddForm}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
        >
          <Plus size={12} />
          Log
        </motion.button>
      </div>

      {/* Empty state */}
      {!hasEntries && (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--t-border-subtle)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'var(--t-glow-2)' }}
          >
            <Ruler size={22} style={{ color: 'var(--t-text-dim)' }} />
          </div>
          <p className="text-sm font-semibold mb-1">No measurements yet</p>
          <p className="text-xs mb-4" style={{ color: 'var(--t-text-muted)' }}>
            Track your body changes over time
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold"
            style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
          >
            <Plus size={12} />
            Log First Measurement
          </motion.button>
        </div>
      )}

      {/* Main card: selector + chart + stats */}
      {hasEntries && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--t-border-subtle)',
            boxShadow: 'var(--t-shadow-card)',
          }}
        >
          {/* Dropdown selector */}
          <div className="px-4 pt-4 pb-2" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 w-full group"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedField.color }}
              />
              <span className="text-sm font-bold flex-1 text-left">{selectedField.label}</span>
              {selectedVal && (
                <span className="text-lg font-black mr-1">
                  {selectedVal.current}
                  <span className="text-[10px] font-medium ml-0.5" style={{ color: 'var(--t-text-dim)' }}>
                    {data.unit}
                  </span>
                </span>
              )}
              <motion.div
                animate={{ rotate: dropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={16} style={{ color: 'var(--t-text-muted)' }} />
              </motion.div>
            </button>

            {/* Dropdown panel */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-3 rounded-xl border overflow-hidden max-h-[240px] overflow-y-auto"
                    style={{
                      borderColor: 'var(--t-border-subtle)',
                      backgroundColor: 'var(--t-glow-1)',
                    }}
                  >
                    {GROUPS.map(group => {
                      const fields = MEASUREMENT_FIELDS.filter(f => f.group === group);
                      const hasAny = fields.some(f => latestValues[f.key]);
                      if (!hasAny) return null;
                      return (
                        <div key={group}>
                          <div
                            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest sticky top-0"
                            style={{
                              color: 'var(--t-text-dim)',
                              backgroundColor: 'var(--t-glow-1)',
                              borderBottom: '1px solid var(--t-border-subtle)',
                            }}
                          >
                            {group}
                          </div>
                          {fields.map(f => {
                            const val = latestValues[f.key];
                            if (!val) return null;
                            const isActive = selectedChart === f.key;
                            return (
                              <button
                                key={f.key}
                                onClick={() => {
                                  setSelectedChart(f.key);
                                  setDropdownOpen(false);
                                }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 transition-colors"
                                style={{
                                  backgroundColor: isActive ? `${f.color}12` : 'transparent',
                                  borderLeft: isActive ? `3px solid ${f.color}` : '3px solid transparent',
                                }}
                              >
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: f.color }}
                                />
                                <span className="text-xs font-medium flex-1 text-left">{f.label}</span>
                                <span className="text-xs font-black">{val.current}</span>
                                {val.change !== undefined && val.change !== 0 && (
                                  <span
                                    className="text-[10px] font-bold flex items-center gap-0.5"
                                    style={{ color: val.change > 0 ? '#10b981' : '#ef4444' }}
                                  >
                                    {val.change > 0 ? "+" : ""}{val.change}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stats row */}
          {selectedVal && (
            <div className="px-4 pb-2 flex items-center gap-3">
              {selectedVal.change !== undefined && selectedVal.change !== 0 && (
                <span
                  className="text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{
                    color: selectedVal.change > 0 ? '#10b981' : '#ef4444',
                    backgroundColor: selectedVal.change > 0 ? '#10b98110' : '#ef444410',
                  }}
                >
                  {selectedVal.change > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {selectedVal.change > 0 ? "+" : ""}{selectedVal.change} last
                </span>
              )}
              {selectedVal.totalChange !== undefined && selectedVal.totalChange !== 0 && (
                <span
                  className="text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{
                    color: selectedVal.totalChange > 0 ? '#10b981' : '#ef4444',
                    backgroundColor: selectedVal.totalChange > 0 ? '#10b98110' : '#ef444410',
                  }}
                >
                  {selectedVal.totalChange > 0 ? "+" : ""}{selectedVal.totalChange} total
                </span>
              )}
              <span className="text-[10px] ml-auto" style={{ color: 'var(--t-text-dim)' }}>
                {chartData.length} entries
              </span>
            </div>
          )}

          {/* Chart */}
          {chartData.length >= 2 ? (
            <div className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={150} minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id={`grad-${selectedChart}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={selectedField.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={selectedField.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: chartTick, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: chartTick, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={["dataMin - 1", "dataMax + 1"]}
                  />
                  <Tooltip content={<ChartTooltip unit={data.unit} />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={selectedField.color}
                    strokeWidth={2.5}
                    fill={`url(#grad-${selectedChart})`}
                    dot={{ fill: selectedField.color, r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: selectedField.color, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="px-4 pb-4 text-center">
              <p className="text-[11px] py-6" style={{ color: 'var(--t-text-muted)' }}>
                Log one more entry to see the progress chart
              </p>
            </div>
          )}

          {/* Show history — inside the card */}
          {data.entries.length > 0 && (
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 text-[10px] font-semibold w-full justify-center py-2.5 border-t"
              style={{ color: 'var(--t-accent-text)', borderColor: 'var(--t-border-subtle)' }}
            >
              <Calendar size={10} />
              Show history ({data.entries.length})
            </button>
          )}
        </div>
      )}

      {/* History modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            onClick={() => setShowHistory(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-t-3xl overflow-hidden max-h-[75vh] flex flex-col"
              style={{
                backgroundColor: 'var(--card)',
                borderTop: '1px solid var(--t-border-subtle)',
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--t-text-faint)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: '#f59e0b15' }}
                  >
                    <Calendar size={16} className="text-[#f59e0b]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Measurement History</h2>
                    <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>
                      {data.entries.length} entries logged
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--t-glow-2)' }}
                >
                  <X size={16} style={{ color: 'var(--muted-foreground)' }} />
                </button>
              </div>

              {/* Scrollable history list */}
              <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3 scrollbar-hide">
                {data.entries.map(entry => {
                  const filledFields = MEASUREMENT_FIELDS.filter(f => (entry as any)[f.key] !== undefined);
                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl border p-4"
                      style={{
                        backgroundColor: 'var(--t-glow-1)',
                        borderColor: 'var(--t-border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold">
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </span>
                        {deleteConfirmId === entry.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'var(--secondary)' }}
                            >
                              <X size={12} />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center"
                            >
                              <Trash2 size={12} className="text-red-400" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(entry.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ color: 'var(--t-text-dim)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {filledFields.map(f => (
                          <div key={f.key} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                            <span className="text-xs flex-1" style={{ color: 'var(--t-text-muted)' }}>{f.shortLabel}</span>
                            <span className="text-xs font-bold">{(entry as any)[f.key]} <span className="text-[9px] font-normal opacity-50">{data.unit}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Measurement Modal ── */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            onClick={() => setShowAddForm(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col"
              style={{
                backgroundColor: 'var(--card)',
                borderTop: '1px solid var(--t-border-subtle)',
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--t-text-faint)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: '#06b6d415' }}
                  >
                    <Ruler size={16} className="text-[#06b6d4]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Log Measurements</h2>
                    <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>
                      Fill in what you measured ({data.unit})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--t-glow-2)' }}
                >
                  <X size={16} style={{ color: 'var(--muted-foreground)' }} />
                </button>
              </div>

              {/* Scrollable form */}
              <div className="flex-1 overflow-y-auto px-5 pb-6 scrollbar-hide">
                {/* Date */}
                <div className="mb-4">
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--t-text-muted)' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none border"
                    style={{
                      backgroundColor: 'var(--t-glow-1)',
                      borderColor: 'var(--t-border-subtle)',
                      color: 'var(--foreground)',
                      colorScheme: 'dark',
                    }}
                  />
                </div>

                {/* Grouped fields */}
                {GROUPS.map(group => (
                  <div key={group} className="mb-4">
                    <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t-text-dim)' }}>
                      {group}
                    </p>
                    <div className="space-y-2">
                      {MEASUREMENT_FIELDS.filter(f => f.group === group).map(f => (
                        <div key={f.key} className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: f.color }}
                          />
                          <span className="text-xs font-medium w-24 flex-shrink-0">{f.label}</span>
                          <div className="flex-1 relative">
                            <input
                              type="number"
                              value={formValues[f.key] || ""}
                              onChange={e => setFormValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                              placeholder="—"
                              step="0.1"
                              min="0"
                              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border text-right pr-10"
                              style={{
                                backgroundColor: 'var(--t-glow-1)',
                                borderColor: formValues[f.key] ? `${f.color}40` : 'var(--t-border-subtle)',
                                color: 'var(--foreground)',
                              }}
                            />
                            <span
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
                              style={{ color: 'var(--t-text-dim)' }}
                            >
                              {data.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save button */}
              <div className="px-5 pb-8 pt-3 flex-shrink-0 border-t" style={{ borderColor: 'var(--t-border-subtle)' }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveEntry}
                  disabled={!Object.values(formValues).some(v => v && Number(v) > 0)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--t-cta-bg)',
                    color: 'var(--t-cta-fg)',
                  }}
                >
                  <Save size={14} />
                  Save Measurements
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}