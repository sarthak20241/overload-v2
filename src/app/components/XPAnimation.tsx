/**
 * Post-workout XP animation overlay.
 * Shows a full-screen popup with:
 *  - Total XP gained (big counter animation)
 *  - Breakdown list with icons
 *  - Level-up celebration if applicable
 *  - Floating particles / confetti
 */
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, ChevronUp, Star, X } from "lucide-react";
import { useXP } from "../context/XPContext";
import { getLevelFromXP, TITLE_TIERS } from "../services/xpEngine";

// ── Confetti Particle ────────────────────────────────────────────────────────

function Particle({ delay, color }: { delay: number; color: string }) {
  const x = Math.random() * 100;
  const size = 4 + Math.random() * 6;
  const duration = 1.5 + Math.random() * 1.5;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: `${x}vw`, scale: 0 }}
      animate={{
        opacity: [1, 1, 0],
        y: [0, -120 - Math.random() * 200],
        x: `${x + (Math.random() - 0.5) * 30}vw`,
        scale: [0, 1, 0.5],
        rotate: Math.random() * 720,
      }}
      transition={{ duration, delay, ease: "easeOut" }}
      className="absolute bottom-0 rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 ${size}px ${color}80`,
      }}
    />
  );
}

// ── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ target, duration = 1.2 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (startTime.current === null) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <>{count}</>;
}

// ── Main XP Animation ────────────────────────────────────────────────────────

const PARTICLE_COLORS = ["#c8ff00", "#f59e0b", "#06b6d4", "#a855f7", "#ec4899", "#10b981", "#ef4444"];

export function XPAnimationOverlay() {
  const { pendingXPGain, clearPendingXP } = useXP();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; delay: number; color: string }>>([]);

  useEffect(() => {
    if (pendingXPGain) {
      setShowBreakdown(false);
      // Generate particles
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.8,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      }));
      setParticles(newParticles);

      // Show breakdown after counter animation
      const timer = setTimeout(() => setShowBreakdown(true), 1400);
      return () => clearTimeout(timer);
    }
  }, [pendingXPGain]);

  if (!pendingXPGain) return null;

  const { total, breakdown, leveledUp, oldLevel, newLevel } = pendingXPGain;
  const newLevelInfo = getLevelFromXP(
    // Get the fresh level info
    (JSON.parse(localStorage.getItem("overload_xp_data") || '{"totalXP":0}')).totalXP
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center"
        onClick={clearPendingXP}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map(p => (
            <Particle key={p.id} delay={p.delay} color={p.color} />
          ))}
        </div>

        {/* Content */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 200, delay: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-[85vw] max-w-sm z-10"
        >
          {/* Close button */}
          <button
            onClick={clearPendingXP}
            className="absolute -top-2 -right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm"
          >
            <X size={14} className="text-white/60" />
          </button>

          {/* Main card */}
          <div
            className="rounded-3xl border overflow-hidden"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--t-border-subtle)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            }}
          >
            {/* Top glow */}
            <div
              className="relative pt-10 pb-6 px-6 text-center overflow-hidden"
              style={{
                background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${newLevelInfo.titleColor}30, transparent)`,
              }}
            >
              {/* XP Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, delay: 0.3 }}
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${newLevelInfo.titleColor}30, ${newLevelInfo.titleColor}10)`,
                  boxShadow: `0 0 30px ${newLevelInfo.titleColor}40`,
                }}
              >
                <Zap size={32} fill={newLevelInfo.titleColor} style={{ color: newLevelInfo.titleColor }} />
              </motion.div>

              {/* +XP counter */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: newLevelInfo.titleColor }}>
                  XP Earned
                </p>
                <p
                  className="text-5xl font-black tracking-tight"
                  style={{
                    background: `linear-gradient(135deg, ${newLevelInfo.titleColor}, #fff)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  +<AnimatedCounter target={total} />
                </p>
              </motion.div>

              {/* Level up banner */}
              {leveledUp && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 1.6, type: "spring" }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${newLevelInfo.titleColor}25, ${newLevelInfo.titleColor}10)`,
                    border: `1px solid ${newLevelInfo.titleColor}40`,
                  }}
                >
                  <ChevronUp size={14} style={{ color: newLevelInfo.titleColor }} />
                  <span className="text-sm font-bold" style={{ color: newLevelInfo.titleColor }}>
                    Level {newLevel}!
                  </span>
                  <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                    {newLevelInfo.titleIcon} {newLevelInfo.title}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Breakdown list */}
            <AnimatePresence>
              {showBreakdown && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.4 }}
                  className="px-5 pb-5"
                >
                  <div
                    className="h-px mb-3"
                    style={{ backgroundColor: 'var(--t-border-subtle)' }}
                  />
                  <div className="space-y-2">
                    {breakdown.map((item, i) => (
                      <motion.div
                        key={item.source}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-base w-6 text-center">{item.icon}</span>
                        <span className="flex-1 text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                          {item.source}
                        </span>
                        <span className="text-xs font-bold" style={{ color: newLevelInfo.titleColor }}>
                          +{item.amount} XP
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Current level bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--t-text-muted)' }}>
                        Level {newLevelInfo.level} · {newLevelInfo.titleIcon} {newLevelInfo.title}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--t-text-dim)' }}>
                        {newLevelInfo.xpInCurrentLevel} / {newLevelInfo.xpNeededForNext} XP
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: `${newLevelInfo.titleColor}15` }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${newLevelInfo.progress * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: newLevelInfo.titleColor,
                          boxShadow: `0 0 8px ${newLevelInfo.titleColor}60`,
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tap to dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              className="px-5 pb-4"
            >
              <button
                onClick={clearPendingXP}
                className="w-full py-3 rounded-xl text-sm font-bold transition-opacity"
                style={{
                  backgroundColor: newLevelInfo.titleColor,
                  color: '#0a0a0a',
                }}
              >
                Continue
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
