/**
 * XP Engine — Pure calculation logic for the Overload gamification system.
 *
 * XP Sources:
 *   Workout completed           50 XP
 *   Streak bonus (daily)        +5 per consecutive day (cap +50)
 *   Volume milestone            25 XP per 1,000 kg in a session
 *   Personal Record (PR)        75 XP
 *   Exercise variety (4+)       15 XP
 *   Long session (≥ 45 min)     20 XP
 *   Weekly consistency (3+/wk)  100 XP
 *   First workout of the week   10 XP
 *
 * Milestones (one-time):
 *   First ever workout          100 XP
 *   10/25/50/100th workout      150/250/500/1000 XP
 *   7-day streak                200 XP
 *   30-day streak               500 XP
 *   First routine created       50 XP
 *   Used AI-generated routine   30 XP
 *
 * Leveling: XP = 100 × N^1.5 (cumulative)
 */

import { isSameDay, subDays, startOfWeek, startOfDay } from "date-fns";
import type { WorkoutSession } from "../types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface XPBreakdown {
  source: string;
  amount: number;
  icon: string; // emoji for display
}

export interface XPGain {
  total: number;
  breakdown: XPBreakdown[];
  newMilestones: string[];
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
}

export interface XPData {
  totalXP: number;
  milestones: string[];
}

// ── Title Tiers ──────────────────────────────────────────────────────────────

export const TITLE_TIERS = [
  { minLevel: 1, maxLevel: 4, title: "Beginner", color: "#6b7280", icon: "🌱" },
  { minLevel: 5, maxLevel: 9, title: "Rookie", color: "#06b6d4", icon: "⚡" },
  { minLevel: 10, maxLevel: 14, title: "Regular", color: "#10b981", icon: "💪" },
  { minLevel: 15, maxLevel: 19, title: "Dedicated", color: "#f59e0b", icon: "🔥" },
  { minLevel: 20, maxLevel: 29, title: "Athlete", color: "#a855f7", icon: "🏆" },
  { minLevel: 30, maxLevel: 39, title: "Warrior", color: "#ef4444", icon: "⚔️" },
  { minLevel: 40, maxLevel: 49, title: "Elite", color: "#ec4899", icon: "👑" },
  { minLevel: 50, maxLevel: 999, title: "Legend", color: "#c8ff00", icon: "🌟" },
] as const;

// ── Level Calculations ───────────────────────────────────────────────────────

/** XP required to reach level N (cumulative from level 1). */
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  let total = 0;
  for (let i = 2; i <= n; i++) {
    total += Math.round(100 * Math.pow(i, 1.5));
  }
  return total;
}

/** XP needed to go from level N to N+1. */
export function xpBetweenLevels(n: number): number {
  return Math.round(100 * Math.pow(n + 1, 1.5));
}

/** Derive level from total XP. */
export function getLevelFromXP(totalXP: number): {
  level: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  progress: number; // 0-1
  title: string;
  titleColor: string;
  titleIcon: string;
} {
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = xpBetweenLevels(level);
    if (accumulated + needed > totalXP) {
      const xpInCurrentLevel = totalXP - accumulated;
      const progress = needed > 0 ? xpInCurrentLevel / needed : 0;
      const tier = TITLE_TIERS.find(t => level >= t.minLevel && level <= t.maxLevel) || TITLE_TIERS[0];
      return {
        level,
        xpInCurrentLevel,
        xpNeededForNext: needed,
        progress: Math.min(progress, 1),
        title: tier.title,
        titleColor: tier.color,
        titleIcon: tier.icon,
      };
    }
    accumulated += needed;
    level++;
  }
}

// ── Streak Calculation ───────────────────────────────────────────────────────

function calculateStreak(sessions: WorkoutSession[]): number {
  let streak = 0;
  let checkDate = startOfDay(new Date());
  const dates = sessions.map(s => startOfDay(new Date(s.startTime)));
  while (dates.some(d => isSameDay(d, checkDate))) {
    streak++;
    checkDate = subDays(checkDate, 1);
  }
  return streak;
}

// ── PR Detection ─────────────────────────────────────────────────────────────

function detectPRs(
  session: WorkoutSession,
  previousSessions: WorkoutSession[]
): number {
  // Build map of best weights from all PREVIOUS sessions
  const prevBests: Record<string, number> = {};
  previousSessions.forEach(s => {
    s.exercises?.forEach(ex => {
      ex.sets?.forEach(set => {
        if (set.completed && set.weight > 0) {
          const key = ex.name;
          prevBests[key] = Math.max(prevBests[key] || 0, set.weight);
        }
      });
    });
  });

  let prCount = 0;
  session.exercises?.forEach(ex => {
    const best = ex.sets
      ?.filter(s => s.completed && s.weight > 0)
      .reduce((max, s) => Math.max(max, s.weight), 0) || 0;
    if (best > 0 && best > (prevBests[ex.name] || 0)) {
      prCount++;
    }
  });

  return prCount;
}

// ── Core XP Calculation ──────────────────────────────────────────────────────

export function calculateWorkoutXP(
  session: WorkoutSession,
  allSessionsIncludingThis: WorkoutSession[],
  existingMilestones: string[]
): XPGain {
  const breakdown: XPBreakdown[] = [];
  const newMilestones: string[] = [];

  // Previous sessions = everything except this one
  const prevSessions = allSessionsIncludingThis.filter(s => s.id !== session.id);
  const totalWorkoutCount = allSessionsIncludingThis.length;

  // 1. Base workout XP
  breakdown.push({ source: "Workout Completed", amount: 50, icon: "💪" });

  // 2. Streak bonus
  const streak = calculateStreak(allSessionsIncludingThis);
  if (streak > 0) {
    const streakBonus = Math.min(streak * 5, 50);
    if (streakBonus > 0) {
      breakdown.push({ source: `${streak}-Day Streak`, amount: streakBonus, icon: "🔥" });
    }
  }

  // 3. Volume milestone (25 XP per 1,000 kg)
  const volume = session.totalVolume || 0;
  if (volume >= 1000) {
    const volumeXP = Math.floor(volume / 1000) * 25;
    breakdown.push({ source: "Volume Milestone", amount: volumeXP, icon: "🏋️" });
  }

  // 4. Personal Records
  const prCount = detectPRs(session, prevSessions);
  if (prCount > 0) {
    breakdown.push({ source: `${prCount} PR${prCount > 1 ? "s" : ""}`, amount: prCount * 75, icon: "🏆" });
  }

  // 5. Exercise variety (4+ unique exercises)
  const uniqueExercises = new Set(session.exercises?.map(e => e.name) || []);
  if (uniqueExercises.size >= 4) {
    breakdown.push({ source: "Exercise Variety", amount: 15, icon: "🎯" });
  }

  // 6. Long session (≥ 45 min)
  if (session.durationSeconds >= 45 * 60) {
    breakdown.push({ source: "Long Session", amount: 20, icon: "⏱️" });
  }

  // 7. Weekly consistency (3+ workouts this week)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekCount = allSessionsIncludingThis.filter(
    s => new Date(s.startTime) >= weekStart
  ).length;
  if (thisWeekCount === 3) {
    // Only award when hitting exactly 3 (not every subsequent one)
    breakdown.push({ source: "Weekly Consistency", amount: 100, icon: "📅" });
  }

  // 8. First workout of the week
  if (thisWeekCount === 1) {
    breakdown.push({ source: "First This Week", amount: 10, icon: "🌅" });
  }

  // ── One-time milestones ────────────────────────────────────────────────

  // First ever workout
  if (totalWorkoutCount === 1 && !existingMilestones.includes("first_workout")) {
    breakdown.push({ source: "First Workout!", amount: 100, icon: "🎉" });
    newMilestones.push("first_workout");
  }

  // Workout count milestones
  const countMilestones: Record<number, number> = { 10: 150, 25: 250, 50: 500, 100: 1000 };
  Object.entries(countMilestones).forEach(([count, xp]) => {
    const key = `workout_${count}`;
    if (totalWorkoutCount === Number(count) && !existingMilestones.includes(key)) {
      breakdown.push({ source: `${count}th Workout!`, amount: xp, icon: "🎊" });
      newMilestones.push(key);
    }
  });

  // Streak milestones
  if (streak >= 7 && !existingMilestones.includes("streak_7")) {
    breakdown.push({ source: "7-Day Streak!", amount: 200, icon: "🔥" });
    newMilestones.push("streak_7");
  }
  if (streak >= 30 && !existingMilestones.includes("streak_30")) {
    breakdown.push({ source: "30-Day Streak!", amount: 500, icon: "🔥" });
    newMilestones.push("streak_30");
  }

  const total = breakdown.reduce((sum, b) => sum + b.amount, 0);

  return {
    total,
    breakdown,
    newMilestones,
    leveledUp: false, // filled in by context
    oldLevel: 0,
    newLevel: 0,
  };
}

// ── Routine-based XP (called separately) ─────────────────────────────────────

export function calculateRoutineXP(
  isFirstRoutine: boolean,
  isAIGenerated: boolean,
  existingMilestones: string[]
): XPGain | null {
  const breakdown: XPBreakdown[] = [];
  const newMilestones: string[] = [];

  if (isFirstRoutine && !existingMilestones.includes("first_routine")) {
    breakdown.push({ source: "First Routine!", amount: 50, icon: "📋" });
    newMilestones.push("first_routine");
  }

  if (isAIGenerated && !existingMilestones.includes("ai_routine")) {
    breakdown.push({ source: "AI Routine Used", amount: 30, icon: "🤖" });
    newMilestones.push("ai_routine");
  }

  if (breakdown.length === 0) return null;

  return {
    total: breakdown.reduce((s, b) => s + b.amount, 0),
    breakdown,
    newMilestones,
    leveledUp: false,
    oldLevel: 0,
    newLevel: 0,
  };
}
