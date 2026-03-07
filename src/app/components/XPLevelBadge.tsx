/**
 * Compact XP level badge — used in dashboard header and profile avatar.
 * Shows current level number with the tier's accent color.
 */
import { motion } from "motion/react";
import { useXP } from "../context/XPContext";

/** Small pill shown next to avatar in dashboard header */
export function XPLevelPill() {
  const { level, titleColor, titleIcon, title, progress, xpInCurrentLevel, xpNeededForNext, totalXP } = useXP();

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-2"
    >
      {/* Level badge */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
        style={{
          backgroundColor: `${titleColor}12`,
          borderColor: `${titleColor}30`,
        }}
      >
        <span className="text-xs">{titleIcon}</span>
        <span className="text-[11px] font-black" style={{ color: titleColor }}>
          Lv.{level}
        </span>
      </div>
    </motion.div>
  );
}

/** Progress bar widget for dashboard — sits under the greeting */
export function XPProgressBar() {
  const { level, title, titleColor, titleIcon, progress, xpInCurrentLevel, xpNeededForNext, totalXP } = useXP();

  return (
    <div className="mt-0.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: `${titleColor}15` }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              backgroundColor: titleColor,
              boxShadow: `0 0 6px ${titleColor}50`,
            }}
          />
        </div>
        <span className="text-[8px] flex-shrink-0" style={{ color: 'var(--t-text-dim)' }}>
          {xpInCurrentLevel}/{xpNeededForNext}
        </span>
      </div>
      <span className="text-[9px] font-semibold" style={{ color: titleColor }}>
        {titleIcon} {title}
      </span>
    </div>
  );
}

/** Detailed XP card for the profile page */
export function XPProfileCard() {
  const { level, title, titleColor, titleIcon, progress, xpInCurrentLevel, xpNeededForNext, totalXP } = useXP();

  return (
    <div
      className="rounded-2xl border p-5 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--t-border-subtle)',
        boxShadow: 'var(--t-shadow-card)',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 20% 0%, ${titleColor}, transparent)`,
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black"
              style={{
                background: `linear-gradient(135deg, ${titleColor}25, ${titleColor}10)`,
                color: titleColor,
                boxShadow: `0 0 16px ${titleColor}20`,
              }}
            >
              {level}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">{titleIcon}</span>
                <span className="text-sm font-bold" style={{ color: titleColor }}>
                  {title}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
                {totalXP.toLocaleString()} total XP
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--t-text-muted)' }}>
              Level {level} → {level + 1}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--t-text-dim)' }}>
              {xpInCurrentLevel} / {xpNeededForNext} XP
            </span>
          </div>
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ backgroundColor: `${titleColor}12` }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                backgroundColor: titleColor,
                boxShadow: `0 0 10px ${titleColor}50`,
              }}
            />
          </div>
          <p className="text-[9px] mt-1.5 text-right" style={{ color: 'var(--t-text-dim)' }}>
            {Math.round(progress * 100)}% to next level
          </p>
        </div>
      </div>
    </div>
  );
}