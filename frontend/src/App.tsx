import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LiveTimerProvider } from "@/contexts/LiveTimerContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Board from "./pages/Board";
import Backlog from "./pages/Backlog";
import Timeline from "./pages/Timeline";
import Reports from "./pages/Reports";
import Epics from "./pages/Epics";
import SprintManagement from "./pages/SprintManagement";
import ProjectSettings from "./pages/ProjectSettings";
import ProjectOnboarding from "./pages/ProjectOnboarding";
import UserManagement from "./pages/UserManagement";
import HelpGuide from "./pages/HelpGuide";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
    <Route path="/register" element={<Navigate to="/login" replace />} />
    <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
    <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
    <Route path="/board" element={<ProtectedRoute><AppLayout><Board /></AppLayout></ProtectedRoute>} />
    <Route path="/backlog" element={<ProtectedRoute><AppLayout><Backlog /></AppLayout></ProtectedRoute>} />
    <Route path="/timeline" element={<ProtectedRoute><AppLayout><Timeline /></AppLayout></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
    <Route path="/epics" element={<ProtectedRoute><AppLayout><Epics /></AppLayout></ProtectedRoute>} />
    <Route path="/sprints" element={<ProtectedRoute><AppLayout><SprintManagement /></AppLayout></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><AppLayout><ProjectSettings /></AppLayout></ProtectedRoute>} />
    <Route path="/onboarding" element={<ProtectedRoute><AppLayout><ProjectOnboarding /></AppLayout></ProtectedRoute>} />
    <Route path="/users" element={<ProtectedRoute><AppLayout><UserManagement /></AppLayout></ProtectedRoute>} />
    <Route path="/help" element={<ProtectedRoute><AppLayout><HelpGuide /></AppLayout></ProtectedRoute>} />
    <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ProjectProvider>
              <LiveTimerProvider>
                <NotificationProvider>
                  <AppRoutes />
                </NotificationProvider>
              </LiveTimerProvider>
            </ProjectProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
