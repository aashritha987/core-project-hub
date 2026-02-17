import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { lazy, Suspense } from "react";
import { DashboardSkeleton, BoardSkeleton, BacklogSkeleton, TableSkeleton } from "@/components/Skeletons";

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Board = lazy(() => import("./pages/Board"));
const Backlog = lazy(() => import("./pages/Backlog"));
const Timeline = lazy(() => import("./pages/Timeline"));
const Reports = lazy(() => import("./pages/Reports"));
const Epics = lazy(() => import("./pages/Epics"));
const SprintManagement = lazy(() => import("./pages/SprintManagement"));
const ProjectSettings = lazy(() => import("./pages/ProjectSettings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const HelpGuide = lazy(() => import("./pages/HelpGuide"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
    <Route path="/login" element={<AuthRoute><Suspense fallback={null}><Login /></Suspense></AuthRoute>} />
    <Route path="/register" element={<AuthRoute><Suspense fallback={null}><Register /></Suspense></AuthRoute>} />
    <Route path="/forgot-password" element={<AuthRoute><Suspense fallback={null}><ForgotPassword /></Suspense></AuthRoute>} />
    <Route path="/" element={<ProtectedRoute><AppLayout><Suspense fallback={<DashboardSkeleton />}><Dashboard /></Suspense></AppLayout></ProtectedRoute>} />
    <Route path="/board" element={<ProtectedRoute><AppLayout><Suspense fallback={<BoardSkeleton />}><Board /></Suspense></AppLayout></ProtectedRoute>} />
    <Route path="/backlog" element={<ProtectedRoute><AppLayout><Suspense fallback={<BacklogSkeleton />}><Backlog /></Suspense></AppLayout></ProtectedRoute>} />
    <Route path="/timeline" element={<ProtectedRoute><AppLayout><Suspense fallback={<TableSkeleton />}><Timeline /></Suspense></AppLayout></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><AppLayout><Suspense fallback={<DashboardSkeleton />}><Reports /></Suspense></AppLayout></ProtectedRoute>} />
    <Route path="/epics" element={<ProtectedRoute><AppLayout><Suspense fallback={<TableSkeleton />}><Epics /></Suspense></AppLayout></ProtectedRoute>} />
    <Route path="/sprints" element={<ProtectedRoute><AppLayout><Suspense fallback={<TableSkeleton />}><SprintManagement /></Suspense></AppLayout></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><AppLayout><Suspense fallback={<TableSkeleton />}><ProjectSettings /></Suspense></AppLayout></ProtectedRoute>} />
    <Route path="/users" element={<ProtectedRoute><AppLayout><Suspense fallback={<TableSkeleton />}><UserManagement /></Suspense></AppLayout></ProtectedRoute>} />
    <Route path="/help" element={<ProtectedRoute><AppLayout><Suspense fallback={<TableSkeleton />}><HelpGuide /></Suspense></AppLayout></ProtectedRoute>} />
    <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
  </Routes>
);

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ProjectProvider>
                <NotificationProvider>
                  <AppRoutes />
                </NotificationProvider>
              </ProjectProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
