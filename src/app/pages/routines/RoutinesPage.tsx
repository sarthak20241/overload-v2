import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Sparkles, MoreVertical, Pencil, Trash2, Play,
  ChevronDown, ChevronUp, X, Loader2, Search, Check, GripVertical
} from "lucide-react";
import { api } from "../../../utils/api";
import type { Routine, RoutineExercise } from "../../types";
import { toast } from "sonner";
import { format } from "date-fns";

const ROUTINE_COLORS = ["#84cc16", "#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#f97316"];
const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Glutes", "Cardio"];

const EXERCISE_LIBRARY = [
  { name: "Bench Press", muscleGroup: "Chest" },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest" },
  { name: "Cable Fly", muscleGroup: "Chest" },
  { name: "Push-up", muscleGroup: "Chest" },
  { name: "Deadlift", muscleGroup: "Back" },
  { name: "Barbell Row", muscleGroup: "Back" },
  { name: "Pull-up", muscleGroup: "Back" },
  { name: "Lat Pulldown", muscleGroup: "Back" },
  { name: "Dumbbell Row", muscleGroup: "Back" },
  { name: "Cable Row", muscleGroup: "Back" },
  { name: "Overhead Press", muscleGroup: "Shoulders" },
  { name: "Lateral Raise", muscleGroup: "Shoulders" },
  { name: "Face Pull", muscleGroup: "Shoulders" },
  { name: "Arnold Press", muscleGroup: "Shoulders" },
  { name: "Barbell Curl", muscleGroup: "Arms" },
  { name: "Dumbbell Curl", muscleGroup: "Arms" },
  { name: "Tricep Pushdown", muscleGroup: "Arms" },
  { name: "Skull Crusher", muscleGroup: "Arms" },
  { name: "Hammer Curl", muscleGroup: "Arms" },
  { name: "Squat", muscleGroup: "Legs" },
  { name: "Romanian Deadlift", muscleGroup: "Legs" },
  { name: "Leg Press", muscleGroup: "Legs" },
  { name: "Leg Curl", muscleGroup: "Legs" },
  { name: "Leg Extension", muscleGroup: "Legs" },
  { name: "Calf Raise", muscleGroup: "Legs" },
  { name: "Bulgarian Split Squat", muscleGroup: "Legs" },
  { name: "Hip Thrust", muscleGroup: "Glutes" },
  { name: "Glute Bridge", muscleGroup: "Glutes" },
  { name: "Plank", muscleGroup: "Core" },
  { name: "Ab Crunch", muscleGroup: "Core" },
  { name: "Russian Twist", muscleGroup: "Core" },
];

function newExercise(): RoutineExercise {
  return {
    id: crypto.randomUUID(),
    name: "",
    muscleGroup: "",
    targetSets: 3,
    targetReps: "8-12",
    restSeconds: 90,
    notes: "",
  };
}

function ExerciseEditor({
  exercise,
  onChange,
  onRemove,
  index,
}: {
  exercise: RoutineExercise;
  onChange: (ex: RoutineExercise) => void;
  onRemove: () => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  const filteredExercises = EXERCISE_LIBRARY.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscleGroup.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--t-border-light)' }}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical size={14} style={{ color: 'var(--t-text-dim)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {exercise.name || <span style={{ color: 'var(--t-text-muted)' }}>Unnamed exercise</span>}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
            {exercise.targetSets} sets · {exercise.targetReps} reps
            {exercise.muscleGroup && ` · ${exercise.muscleGroup}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:text-red-400"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <X size={13} />
          </button>
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--t-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--t-text-muted)' }} />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t pt-3" style={{ borderColor: 'var(--t-border-subtle)' }}>
              {/* Exercise name picker */}
              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Exercise</label>
                {showPicker ? (
                  <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: 'var(--t-border-light)' }}>
                      <Search size={13} style={{ color: 'var(--t-text-muted)' }} />
                      <input
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search exercises..."
                        className="bg-transparent text-sm text-foreground outline-none flex-1"
                      />
                      <button onClick={() => setShowPicker(false)} style={{ color: 'var(--t-text-muted)' }}>
                        <X size={13} />
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto scrollbar-hide">
                      {filteredExercises.map(ex => (
                        <button
                          key={ex.name}
                          onClick={() => {
                            onChange({ ...exercise, name: ex.name, muscleGroup: ex.muscleGroup });
                            setShowPicker(false);
                            setSearch("");
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left"
                        >
                          <span className="text-sm">{ex.name}</span>
                          <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>{ex.muscleGroup}</span>
                        </button>
                      ))}
                      {/* Custom option */}
                      {search && !filteredExercises.find(e => e.name.toLowerCase() === search.toLowerCase()) && (
                        <button
                          onClick={() => {
                            onChange({ ...exercise, name: search });
                            setShowPicker(false);
                            setSearch("");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 transition-colors text-left"
                        >
                          <Plus size={13} style={{ color: 'var(--t-neon)' }} />
                          <span className="text-sm">Add "{search}"</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPicker(true)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border text-sm"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                  >
                    {exercise.name || <span style={{ color: 'var(--t-text-muted)' }}>Select exercise...</span>}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Sets</label>
                  <input
                    type="number"
                    min={1} max={10}
                    value={exercise.targetSets}
                    onChange={e => onChange({ ...exercise, targetSets: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm text-center text-foreground focus:outline-none"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Reps</label>
                  <input
                    type="text"
                    value={exercise.targetReps}
                    onChange={e => onChange({ ...exercise, targetReps: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm text-center text-foreground focus:outline-none"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                    placeholder="8-12"
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Rest (s)</label>
                  <input
                    type="number"
                    step={15}
                    min={0}
                    value={exercise.restSeconds}
                    onChange={e => onChange({ ...exercise, restSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm text-center text-foreground focus:outline-none"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Notes (optional)</label>
                <input
                  type="text"
                  value={exercise.notes || ""}
                  onChange={e => onChange({ ...exercise, notes: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none"
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                  placeholder="Form tip or reminder..."
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RoutinesPage() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Partial<Routine> | null>(null);
  const [exercises, setExercises] = useState<RoutineExercise[]>([newExercise()]);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // AI generation state
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<Partial<Routine> | null>(null);

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    try {
      const data = await api.routines.list();
      setRoutines(data);
    } catch (err: any) {
      toast.error("Failed to load routines");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingRoutine({ name: "", description: "" });
    setExercises([newExercise()]);
    setSheetOpen(true);
  };

  const openEdit = (routine: Routine) => {
    setEditingRoutine({ ...routine });
    setExercises(routine.exercises?.length > 0 ? [...routine.exercises] : [newExercise()]);
    setSheetOpen(true);
    setMenuOpen(null);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingRoutine(null);
    setExercises([newExercise()]);
  };

  const handleSave = async () => {
    if (!editingRoutine?.name?.trim()) {
      toast.error("Please enter a routine name");
      return;
    }
    const validExercises = exercises.filter(e => e.name.trim());
    if (validExercises.length === 0) {
      toast.error("Add at least one exercise");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editingRoutine.name!,
        description: editingRoutine.description || "",
        exercises: validExercises,
        color: editingRoutine.color,
      };
      if (editingRoutine.id) {
        const updated = await api.routines.update(editingRoutine.id, payload);
        setRoutines(prev => prev.map(r => r.id === updated.id ? updated : r));
        toast.success("Routine updated");
      } else {
        const created = await api.routines.create(payload);
        setRoutines(prev => [created, ...prev]);
        toast.success("Routine created");
      }
      closeSheet();
    } catch (err: any) {
      toast.error(err.message || "Failed to save routine");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.routines.delete(id);
      setRoutines(prev => prev.filter(r => r.id !== id));
      setMenuOpen(null);
      toast.success("Routine deleted");
    } catch {
      toast.error("Failed to delete routine");
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Describe your workout");
      return;
    }
    setAiLoading(true);
    try {
      const routine = await api.ai.generateRoutine(aiPrompt);
      setAiPreview(routine);
    } catch (err: any) {
      toast.error(err.message || "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiRoutine = async () => {
    if (!aiPreview) return;
    setSaving(true);
    try {
      const created = await api.routines.create({
        name: aiPreview.name || "AI Routine",
        description: aiPreview.description || "",
        exercises: (aiPreview.exercises || []).map(e => ({
          ...e,
          id: e.id || crypto.randomUUID(),
        })),
      });
      setRoutines(prev => [created, ...prev]);
      setAiSheetOpen(false);
      setAiPreview(null);
      setAiPrompt("");
      toast.success("AI routine saved!");
    } catch {
      toast.error("Failed to save routine");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight">Routines</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setAiSheetOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold"
              style={{
                backgroundColor: 'var(--t-primary-muted)',
                borderColor: 'var(--t-primary-border)',
                color: 'var(--t-accent-text)',
              }}
            >
              <Sparkles size={13} />
              AI
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold"
              style={{
                backgroundColor: 'var(--muted)',
                borderColor: 'var(--border)',
              }}
            >
              <Plus size={14} />
              New
            </button>
          </div>
        </div>
      </div>

      {/* Routines list */}
      <div className="px-5 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--card)' }} />
            ))}
          </div>
        ) : routines.length === 0 ? (
          <div className="py-16 text-center">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--card)' }}
            >
              <Plus size={24} style={{ color: 'var(--t-text-dim)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>No routines yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: 'var(--t-text-dim)' }}>Create one manually or generate with AI</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={openCreate}
                className="px-4 py-2 rounded-xl border text-sm font-semibold"
                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
              >
                Create Routine
              </button>
              <button
                onClick={() => setAiSheetOpen(true)}
                className="px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-1.5"
                style={{
                  backgroundColor: 'var(--t-primary-muted)',
                  borderColor: 'var(--t-primary-border)',
                  color: 'var(--t-accent-text)',
                }}
              >
                <Sparkles size={13} /> AI Generate
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((routine, idx) => (
              <motion.div
                key={routine.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="p-4 rounded-2xl border"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--t-border-subtle)',
                  boxShadow: 'var(--t-shadow-card)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${ROUTINE_COLORS[idx % ROUTINE_COLORS.length]}18` }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ROUTINE_COLORS[idx % ROUTINE_COLORS.length] }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{routine.name}</p>
                    {routine.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--t-text-secondary)' }}>{routine.description}</p>
                    )}
                    <p className="text-xs mt-1.5" style={{ color: 'var(--t-text-muted)' }}>
                      {routine.exercises?.length || 0} exercises
                    </p>
                    {routine.exercises?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {routine.exercises.slice(0, 3).map((ex, ei) => (
                          <span key={ei} className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--t-text-secondary)', backgroundColor: 'var(--secondary)' }}>
                            {ex.name}
                          </span>
                        ))}
                        {routine.exercises.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--t-text-dim)', backgroundColor: 'var(--secondary)' }}>
                            +{routine.exercises.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/workout/${routine.id}`)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'var(--t-primary-muted)' }}
                    >
                      <Play size={14} fill="var(--t-accent-text)" style={{ color: 'var(--t-accent-text)' }} className="ml-0.5" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === routine.id ? null : routine.id)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: 'var(--secondary)' }}
                      >
                        <MoreVertical size={14} style={{ color: 'var(--t-text-secondary)' }} />
                      </button>
                      <AnimatePresence>
                        {menuOpen === routine.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -8 }}
                            className="absolute right-0 top-10 z-10 border rounded-2xl overflow-hidden min-w-[140px]"
                            style={{
                              backgroundColor: 'var(--secondary)',
                              borderColor: 'var(--border)',
                              boxShadow: 'var(--t-shadow-elevated)',
                            }}
                          >
                            <button
                              onClick={() => openEdit(routine)}
                              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm transition-colors"
                              style={{ color: 'var(--foreground)' }}
                            >
                              <Pencil size={13} style={{ color: 'var(--muted-foreground)' }} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(routine.id)}
                              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Click-outside for menus */}
      {menuOpen && (
        <div className="fixed inset-0 z-[5]" onClick={() => setMenuOpen(null)} />
      )}

      {/* Routine Editor Sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] backdrop-blur-sm"
              style={{ backgroundColor: 'var(--t-overlay)' }}
              onClick={closeSheet}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed inset-0 z-[70] flex flex-col"
              style={{ backgroundColor: 'var(--t-elevated)' }}
            >
              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--t-border-light)' }}>
                <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--t-glow-3)' }}>
                  <X size={15} />
                </button>
                <h2 className="text-base font-bold">
                  {editingRoutine?.id ? "Edit Routine" : "New Routine"}
                </h2>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Save
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-5 space-y-4 pb-10">
                {/* Routine name */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Routine Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Push Day A"
                    value={editingRoutine?.name || ""}
                    onChange={e => setEditingRoutine(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl border text-sm text-foreground font-semibold focus:outline-none"
                    style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Description (optional)</label>
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={editingRoutine?.description || ""}
                    onChange={e => setEditingRoutine(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border text-sm text-foreground focus:outline-none"
                    style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
                  />
                </div>

                {/* Exercises */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--t-text-muted)' }}>
                      Exercises ({exercises.length})
                    </label>
                  </div>
                  <div className="space-y-2">
                    {exercises.map((ex, i) => (
                      <ExerciseEditor
                        key={ex.id}
                        exercise={ex}
                        index={i}
                        onChange={updated => setExercises(prev => prev.map((e, idx) => idx === i ? updated : e))}
                        onRemove={() => setExercises(prev => prev.filter((_, idx) => idx !== i))}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setExercises(prev => [...prev, newExercise()])}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed transition-colors text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--t-text-muted)' }}
                  >
                    <Plus size={14} />
                    Add Exercise
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Generate Sheet */}
      <AnimatePresence>
        {aiSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] backdrop-blur-sm"
              style={{ backgroundColor: 'var(--t-overlay)' }}
              onClick={() => { setAiSheetOpen(false); setAiPreview(null); }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-[24px] border-t max-h-[85vh] flex flex-col"
              style={{
                backgroundColor: 'var(--t-elevated)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--t-handle)' }} />
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Sparkles size={16} style={{ color: 'var(--t-neon)' }} />
                    AI Routine Generator
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>Powered by Gemini</p>
                </div>
                <button
                  onClick={() => { setAiSheetOpen(false); setAiPreview(null); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--t-glow-3)' }}
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">
                {!aiPreview ? (
                  <div className="space-y-4">
                    <textarea
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="e.g. Upper body push workout for intermediate lifter, 45 minutes, focusing on chest and shoulders with 4 exercises"
                      rows={4}
                      className="w-full px-4 py-3.5 rounded-2xl border text-sm text-foreground focus:outline-none resize-none"
                      style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {["Push day", "Pull day", "Leg day", "Full body", "Upper body", "Core workout"].map(s => (
                        <button
                          key={s}
                          onClick={() => setAiPrompt(s)}
                          className="px-3 py-1.5 rounded-full border text-xs transition-colors"
                          style={{
                            backgroundColor: 'var(--muted)',
                            borderColor: 'var(--border)',
                            color: 'var(--muted-foreground)',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleAiGenerate}
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm disabled:opacity-60"
                      style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Generate Routine
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      className="p-4 rounded-2xl border"
                      style={{
                        backgroundColor: 'var(--muted)',
                        borderColor: 'var(--t-primary-border)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={13} style={{ color: 'var(--t-neon)' }} />
                        <h3 className="font-bold text-sm">{aiPreview.name}</h3>
                      </div>
                      {aiPreview.description && (
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{aiPreview.description}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      {aiPreview.exercises?.map((ex, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-2xl border"
                          style={{
                            backgroundColor: 'var(--muted)',
                            borderColor: 'var(--t-border-light)',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">{ex.name}</p>
                            <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>{ex.muscleGroup}</span>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--t-text-secondary)' }}>
                            {ex.targetSets} sets · {ex.targetReps} reps · {ex.restSeconds}s rest
                          </p>
                          {ex.notes && <p className="text-xs mt-0.5 italic" style={{ color: 'var(--t-text-muted)' }}>{ex.notes}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setAiPreview(null)}
                        className="flex-1 py-3.5 rounded-2xl border text-sm font-semibold"
                        style={{
                          backgroundColor: 'var(--muted)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        Regenerate
                      </button>
                      <button
                        onClick={saveAiRoutine}
                        disabled={saving}
                        className="flex-1 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                        style={{ backgroundColor: 'var(--t-cta-bg)', color: 'var(--t-cta-fg)' }}
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Save Routine
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}