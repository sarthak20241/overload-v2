import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { WorkoutSession } from "../types";
import {
  calculateWorkoutXP,
  calculateRoutineXP,
  getLevelFromXP,
  type XPData,
  type XPGain,
} from "../services/xpEngine";

// ── Storage ──────────────────────────────────────────────────────────────────

const LS_KEY = "overload_xp_data";

function loadXP(): XPData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { totalXP: 0, milestones: [] };
}

function saveXP(data: XPData) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// ── Context ──────────────────────────────────────────────────────────────────

interface XPContextType {
  totalXP: number;
  level: number;
  title: string;
  titleColor: string;
  titleIcon: string;
  progress: number; // 0-1 within current level
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  milestones: string[];
  pendingXPGain: XPGain | null;
  awardWorkoutXP: (session: WorkoutSession, allSessions: WorkoutSession[]) => XPGain;
  awardRoutineXP: (isFirstRoutine: boolean, isAIGenerated: boolean) => XPGain | null;
  clearPendingXP: () => void;
  recalculateFromSessions: (sessions: WorkoutSession[]) => void;
}

const XPContext = createContext<XPContextType>({
  totalXP: 0,
  level: 1,
  title: "Beginner",
  titleColor: "#6b7280",
  titleIcon: "🌱",
  progress: 0,
  xpInCurrentLevel: 0,
  xpNeededForNext: 283,
  milestones: [],
  pendingXPGain: null,
  awardWorkoutXP: () => ({ total: 0, breakdown: [], newMilestones: [], leveledUp: false, oldLevel: 1, newLevel: 1 }),
  awardRoutineXP: () => null,
  clearPendingXP: () => {},
  recalculateFromSessions: () => {},
});

export const useXP = () => useContext(XPContext);

export function XPProvider({ children }: { children: React.ReactNode }) {
  const [xpData, setXPData] = useState<XPData>(loadXP);
  const [pendingXPGain, setPendingXPGain] = useState<XPGain | null>(null);

  const levelInfo = getLevelFromXP(xpData.totalXP);

  const awardWorkoutXP = useCallback(
    (session: WorkoutSession, allSessions: WorkoutSession[]): XPGain => {
      const currentData = loadXP(); // fresh read
      const oldLevelInfo = getLevelFromXP(currentData.totalXP);

      const gain = calculateWorkoutXP(session, allSessions, currentData.milestones);

      const newTotalXP = currentData.totalXP + gain.total;
      const newLevelInfo = getLevelFromXP(newTotalXP);

      gain.oldLevel = oldLevelInfo.level;
      gain.newLevel = newLevelInfo.level;
      gain.leveledUp = newLevelInfo.level > oldLevelInfo.level;

      const updated: XPData = {
        totalXP: newTotalXP,
        milestones: [...currentData.milestones, ...gain.newMilestones],
      };

      saveXP(updated);
      setXPData(updated);
      setPendingXPGain(gain);

      return gain;
    },
    []
  );

  const awardRoutineXP = useCallback(
    (isFirstRoutine: boolean, isAIGenerated: boolean): XPGain | null => {
      const currentData = loadXP();
      const gain = calculateRoutineXP(isFirstRoutine, isAIGenerated, currentData.milestones);
      if (!gain) return null;

      const oldLevelInfo = getLevelFromXP(currentData.totalXP);
      const newTotalXP = currentData.totalXP + gain.total;
      const newLevelInfo = getLevelFromXP(newTotalXP);

      gain.oldLevel = oldLevelInfo.level;
      gain.newLevel = newLevelInfo.level;
      gain.leveledUp = newLevelInfo.level > oldLevelInfo.level;

      const updated: XPData = {
        totalXP: newTotalXP,
        milestones: [...currentData.milestones, ...gain.newMilestones],
      };

      saveXP(updated);
      setXPData(updated);
      setPendingXPGain(gain);

      return gain;
    },
    []
  );

  const clearPendingXP = useCallback(() => {
    setPendingXPGain(null);
  }, []);

  // Allows re-syncing XP if sessions data changes externally
  const recalculateFromSessions = useCallback((_sessions: WorkoutSession[]) => {
    // Just refresh from storage — don't recalculate all history
    setXPData(loadXP());
  }, []);

  return (
    <XPContext.Provider
      value={{
        totalXP: xpData.totalXP,
        level: levelInfo.level,
        title: levelInfo.title,
        titleColor: levelInfo.titleColor,
        titleIcon: levelInfo.titleIcon,
        progress: levelInfo.progress,
        xpInCurrentLevel: levelInfo.xpInCurrentLevel,
        xpNeededForNext: levelInfo.xpNeededForNext,
        milestones: xpData.milestones,
        pendingXPGain,
        awardWorkoutXP,
        awardRoutineXP,
        clearPendingXP,
        recalculateFromSessions,
      }}
    >
      {children}
    </XPContext.Provider>
  );
}
