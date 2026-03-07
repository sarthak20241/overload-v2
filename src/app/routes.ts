import { createBrowserRouter } from "react-router";
import { AuthPage } from "./pages/auth/AuthPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { RoutinesPage } from "./pages/routines/RoutinesPage";
import { ActiveWorkoutPage } from "./pages/workout/ActiveWorkoutPage";
import { HistoryPage } from "./pages/history/HistoryPage";
import { AnalyticsPage } from "./pages/analytics/AnalyticsPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/auth",
    Component: AuthPage,
  },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        Component: AppLayout,
        children: [
          { index: true, Component: DashboardPage },
          { path: "routines", Component: RoutinesPage },
          { path: "history", Component: HistoryPage },
          { path: "analytics", Component: AnalyticsPage },
          { path: "profile", Component: ProfilePage },
          { path: "workout/:routineId", Component: ActiveWorkoutPage },
        ],
      },
    ],
  },
]);