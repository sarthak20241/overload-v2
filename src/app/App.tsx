import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { XPProvider } from './context/XPContext';
import { WorkoutProvider } from './context/WorkoutContext';
import { XPAnimationOverlay } from './components/XPAnimation';
import { Toaster } from 'sonner';

function ThemedToaster() {
  const { isDark } = useTheme();
  return (
    <Toaster
      theme={isDark ? "dark" : "light"}
      position="top-center"
      toastOptions={{
        style: {
          background: isDark ? '#1a1a1a' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          color: isDark ? '#fff' : '#1a1a1a',
          boxShadow: isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
        },
      }}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <XPProvider>
          <WorkoutProvider>
            <RouterProvider router={router} />
            <ThemedToaster />
            <XPAnimationOverlay />
          </WorkoutProvider>
        </XPProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}