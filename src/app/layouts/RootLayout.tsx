
import { Outlet, NavLink, useLocation } from "react-router";
import { BarChart2, List, Play, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

function NavItem({ to, icon: Icon, label }: { to: string, icon: any, label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      <Icon size={20} strokeWidth={2} />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}

export default function RootLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans antialiased overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-lg border-t border-border z-50 px-2 pb-safe">
        <div className="flex items-center justify-between h-full max-w-md mx-auto relative">
          
          <div className="flex items-center w-full justify-around pr-8">
            <NavItem to="/" icon={BarChart2} label="Analytics" />
            <NavItem to="/routines" icon={List} label="Routines" />
          </div>

          <div className="absolute left-1/2 -top-6 -translate-x-1/2">
            <NavLink to="/workout">
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
              >
                <Play size={24} fill="currentColor" className="ml-1" />
              </motion.div>
            </NavLink>
          </div>

          <div className="flex items-center w-full justify-around pl-8">
            <NavItem to="/history" icon={History} label="History" />
            <NavItem to="/profile" icon={User} label="Profile" />
          </div>

        </div>
      </nav>
    </div>
  );
}
