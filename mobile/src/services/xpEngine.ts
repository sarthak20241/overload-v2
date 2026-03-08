/**
 * XP Engine — Pure calculation logic for the Overload gamification system.
 * Ported from web. Session type is minimal (startTime, durationSeconds, totalVolume, exercises).
 */

import { isSameDay, subDays, startOfWeek, startOfDay } from 'date-fns';

export interface WorkoutSessionForXP {
  id: string;
  startTime: string;
  durationSeconds: number;
  totalVolume: number;
  exercises: {
    name: string;
    sets?: { weight: number; reps: number; completed: boolean }[];
  }[];
}

export interface XPBreakdown {
  source: string;
  amount: number;
  icon: string;
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

export const TITLE_TIERS = [
  { minLevel: 1, maxLevel: 4, title: 'Beginner', color: '#6b7280', icon: '🌱' },
  { minLevel: 5, maxLevel: 9, title: 'Rookie', color: '#06b6d4', icon: '⚡' },
  { minLevel: 10, maxLevel: 14, title: 'Regular', color: '#10b981', icon: '💪' },
  { minLevel: 15, maxLevel: 19, title: 'Dedicated', color: '#f59e0b', icon: '🔥' },
  { minLevel: 20, maxLevel: 29, title: 'Athlete', color: '#a855f7', icon: '🏆' },
  { minLevel: 30, maxLevel: 39, title: 'Warrior', color: '#ef4444', icon: '⚔️' },
  { minLevel: 40, maxLevel: 49, title: 'Elite', color: '#ec4899', icon: '👑' },
  { minLevel: 50, maxLevel: 999, title: 'Legend', color: '#c8ff00', icon: '🌟' },
] as const;

export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  let total = 0;
  for (let i = 2; i <= n; i++) {
    total += Math.round(100 * Math.pow(i, 1.5));
  }
  return total;
}

export function xpBetweenLevels(n: number): number {
  return Math.round(100 * Math.pow(n + 1, 1.5));
}

export function getLevelFromXP(totalXP: number): {
  level: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  progress: number;
  title: string;
  titleColor: string;
  titleIcon: string;
} {
  let level = 1;
  let accumulated = 0;
  for (;;) {
    const needed = xpBetweenLevels(level);
    if (accumulated + needed > totalXP) {
      const xpInCurrentLevel = totalXP - accumulated;
      const progress = needed > 0 ? xpInCurrentLevel / needed : 0;
      const tier = TITLE_TIERS.find((t) => level >= t.minLevel && level <= t.maxLevel) ?? TITLE_TIERS[0];
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

function calculateStreak(sessions: WorkoutSessionForXP[]): number {
  let streak = 0;
  let checkDate = startOfDay(new Date());
  const dates = sessions.map((s) => startOfDay(new Date(s.startTime)));
  while (dates.some((d) => isSameDay(d, checkDate))) {
    streak++;
    checkDate = subDays(checkDate, 1);
  }
  return streak;
}

function detectPRs(
  session: WorkoutSessionForXP,
  previousSessions: WorkoutSessionForXP[]
): number {
  const prevBests: Record<string, number> = {};
  previousSessions.forEach((s) => {
    s.exercises?.forEach((ex) => {
      ex.sets?.forEach((set) => {
        if (set.completed && set.weight > 0) {
          prevBests[ex.name] = Math.max(prevBests[ex.name] ?? 0, set.weight);
        }
      });
    });
  });
  let prCount = 0;
  session.exercises?.forEach((ex) => {
    const best =
      ex.sets
        ?.filter((s) => s.completed && s.weight > 0)
        .reduce((max, s) => Math.max(max, s.weight), 0) ?? 0;
    if (best > 0 && best > (prevBests[ex.name] ?? 0)) prCount++;
  });
  return prCount;
}

export function calculateWorkoutXP(
  session: WorkoutSessionForXP,
  allSessionsIncludingThis: WorkoutSessionForXP[],
  existingMilestones: string[]
): XPGain {
  const breakdown: XPBreakdown[] = [];
  const newMilestones: string[] = [];
  const prevSessions = allSessionsIncludingThis.filter((s) => s.id !== session.id);
  const totalWorkoutCount = allSessionsIncludingThis.length;

  breakdown.push({ source: 'Workout Completed', amount: 50, icon: '💪' });

  const streak = calculateStreak(allSessionsIncludingThis);
  if (streak > 0) {
    const streakBonus = Math.min(streak * 5, 50);
    if (streakBonus > 0) {
      breakdown.push({ source: `${streak}-Day Streak`, amount: streakBonus, icon: '🔥' });
    }
  }

  const volume = session.totalVolume ?? 0;
  if (volume >= 1000) {
    const volumeXP = Math.floor(volume / 1000) * 25;
    breakdown.push({ source: 'Volume Milestone', amount: volumeXP, icon: '🏋️' });
  }

  const prCount = detectPRs(session, prevSessions);
  if (prCount > 0) {
    breakdown.push({
      source: `${prCount} PR${prCount > 1 ? 's' : ''}`,
      amount: prCount * 75,
      icon: '🏆',
    });
  }

  const uniqueExercises = new Set(session.exercises?.map((e) => e.name) ?? []);
  if (uniqueExercises.size >= 4) {
    breakdown.push({ source: 'Exercise Variety', amount: 15, icon: '🎯' });
  }

  if (session.durationSeconds >= 45 * 60) {
    breakdown.push({ source: 'Long Session', amount: 20, icon: '⏱️' });
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekCount = allSessionsIncludingThis.filter(
    (s) => new Date(s.startTime) >= weekStart
  ).length;
  if (thisWeekCount === 3) {
    breakdown.push({ source: 'Weekly Consistency', amount: 100, icon: '📅' });
  }
  if (thisWeekCount === 1) {
    breakdown.push({ source: 'First This Week', amount: 10, icon: '🌅' });
  }

  if (totalWorkoutCount === 1 && !existingMilestones.includes('first_workout')) {
    breakdown.push({ source: 'First Workout!', amount: 100, icon: '🎉' });
    newMilestones.push('first_workout');
  }

  const countMilestones: Record<number, number> = { 10: 150, 25: 250, 50: 500, 100: 1000 };
  Object.entries(countMilestones).forEach(([count, xp]) => {
    const key = `workout_${count}`;
    if (totalWorkoutCount === Number(count) && !existingMilestones.includes(key)) {
      breakdown.push({ source: `${count}th Workout!`, amount: xp, icon: '🎊' });
      newMilestones.push(key);
    }
  });

  if (streak >= 7 && !existingMilestones.includes('streak_7')) {
    breakdown.push({ source: '7-Day Streak!', amount: 200, icon: '🔥' });
    newMilestones.push('streak_7');
  }
  if (streak >= 30 && !existingMilestones.includes('streak_30')) {
    breakdown.push({ source: '30-Day Streak!', amount: 500, icon: '🔥' });
    newMilestones.push('streak_30');
  }

  return {
    total: breakdown.reduce((sum, b) => sum + b.amount, 0),
    breakdown,
    newMilestones,
    leveledUp: false,
    oldLevel: 0,
    newLevel: 0,
  };
}
