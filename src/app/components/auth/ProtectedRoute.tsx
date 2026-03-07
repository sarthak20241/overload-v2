import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { motion } from "motion/react";

export function ProtectedRoute() {
  const { user, isLoading, isGuest } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-2xl font-black tracking-tighter text-foreground"
        >
          OVERLOAD
        </motion.div>
        <div className="mt-6 w-8 h-0.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--t-neon)' }} />
      </div>
    );
  }

  if (!user && !isGuest) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}