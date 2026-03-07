import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

type Mode = "login" | "register" | "forgot";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, signInAsGuest, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const clearError = () => setError("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        navigate("/", { replace: true });
      } else if (mode === "register") {
        if (!name.trim()) throw new Error("Please enter your name");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        await signUp(email, password, name);
        navigate("/", { replace: true });
      } else if (mode === "forgot") {
        await resetPassword(email);
        toast.success("Reset email sent! Check your inbox.");
        setMode("login");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await signInAsGuest();
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Guest sign-in failed. Anonymous auth may need to be enabled in Supabase.");
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-10">
      {/* Background glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: 'var(--t-accent-text)', opacity: 0.04 }}
      />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-black tracking-tighter text-foreground">
            OVER<span style={{ color: 'var(--t-accent-text)' }}>LOAD</span>
          </h1>
          <p className="text-sm mt-1 tracking-wide" style={{ color: 'var(--t-text-muted)' }}>Progressive Overload Tracker</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border p-6"
          style={{
            backgroundColor: 'var(--t-elevated)',
            borderColor: 'var(--t-border-light)',
            boxShadow: 'var(--t-shadow-elevated)',
          }}
        >
          {/* Mode tabs */}
          {mode !== "forgot" && (
            <div className="flex rounded-2xl p-1 mb-6" style={{ backgroundColor: 'var(--muted)' }}>
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); clearError(); }}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200",
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : ""
                  )}
                  style={mode !== m ? { color: 'var(--t-text-secondary)' } : undefined}
                >
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>
          )}

          {/* Forgot password header */}
          {mode === "forgot" && (
            <div className="mb-6">
              <h2 className="text-lg font-bold">Reset Password</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>We'll send a reset link to your email</p>
            </div>
          )}

          {/* Google sign-in */}
          {mode !== "forgot" && (
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl border transition-colors mb-4 text-sm font-medium disabled:opacity-50"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--t-glow-1)',
              }}
            >
              {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </button>
          )}

          {mode !== "forgot" && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--t-border-light)' }} />
              <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--t-text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--t-border-light)' }} />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <AnimatePresence mode="wait">
              {mode === "register" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl border text-sm text-foreground focus:outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--muted)',
                        borderColor: 'var(--border)',
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-muted)' }} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border text-sm text-foreground focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--muted)',
                  borderColor: 'var(--border)',
                }}
              />
            </div>

            {mode !== "forgot" && (
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-muted)' }} />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-11 py-3.5 rounded-2xl border text-sm text-foreground focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--muted)',
                    borderColor: 'var(--border)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--t-text-muted)' }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Forgot password link */}
            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); clearError(); }}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60 mt-1"
              style={{
                backgroundColor: 'var(--t-cta-bg)',
                color: 'var(--t-cta-fg)',
              }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Email"}
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => { setMode("login"); clearError(); }}
                className="w-full py-2.5 text-sm transition-colors"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Back to Sign In
              </button>
            )}
          </form>
        </motion.div>

        {/* Guest mode */}
        {mode !== "forgot" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-center"
          >
            <button
              onClick={handleGuest}
              disabled={guestLoading}
              className="text-sm transition-colors flex items-center gap-1 mx-auto disabled:opacity-50"
              style={{ color: 'var(--t-text-muted)' }}
            >
              {guestLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              Continue as guest
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}