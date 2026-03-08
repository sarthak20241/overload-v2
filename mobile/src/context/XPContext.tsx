import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  calculateWorkoutXP,
  getLevelFromXP,
  type WorkoutSessionForXP,
  type XPData,
  type XPGain,
} from '../services/xpEngine';

interface XPContextType {
  totalXP: number;
  level: number;
  title: string;
  titleColor: string;
  titleIcon: string;
  progress: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  refreshXP: () => Promise<void>;
  awardWorkoutXP: (
    session: WorkoutSessionForXP,
    allSessions: WorkoutSessionForXP[]
  ) => Promise<XPGain>;
}

const XPContext = createContext<XPContextType | null>(null);

export function XPProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [xpData, setXPData] = useState<XPData>({ totalXP: 0, milestones: [] });

  const refreshXP = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('xp_data')
      .select('total_xp, milestones')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      const milestones = (data.milestones as string[] | null) ?? [];
      setXPData({ totalXP: (data as { total_xp: number }).total_xp ?? 0, milestones });
    } else {
      setXPData({ totalXP: 0, milestones: [] });
    }
  }, [userId]);

  useEffect(() => {
    refreshXP();
  }, [refreshXP]);

  const levelInfo = getLevelFromXP(xpData.totalXP);

  const awardWorkoutXP = useCallback(
    async (
      session: WorkoutSessionForXP,
      allSessions: WorkoutSessionForXP[]
    ): Promise<XPGain> => {
      if (!userId) return { total: 0, breakdown: [], newMilestones: [], leveledUp: false, oldLevel: 1, newLevel: 1 };
      const currentTotal = xpData.totalXP;
      const currentMilestones = xpData.milestones;
      const gain = calculateWorkoutXP(session, allSessions, currentMilestones);
      const oldLevelInfo = getLevelFromXP(currentTotal);
      const newTotal = currentTotal + gain.total;
      const newLevelInfo = getLevelFromXP(newTotal);
      gain.oldLevel = oldLevelInfo.level;
      gain.newLevel = newLevelInfo.level;
      gain.leveledUp = newLevelInfo.level > oldLevelInfo.level;

      const updatedMilestones = [...currentMilestones, ...gain.newMilestones];
      setXPData({ totalXP: newTotal, milestones: updatedMilestones });

      await supabase.from('xp_data').upsert(
        {
          user_id: userId,
          total_xp: newTotal,
          milestones: updatedMilestones,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      return gain;
    },
    [userId, xpData.totalXP, xpData.milestones]
  );

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
        refreshXP,
        awardWorkoutXP,
      }}
    >
      {children}
    </XPContext.Provider>
  );
}

export function useXP(): XPContextType {
  const ctx = useContext(XPContext);
  if (!ctx) throw new Error('useXP must be used within XPProvider');
  return ctx;
}
