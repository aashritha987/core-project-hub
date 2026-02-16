import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Board from "./pages/Board";
import Backlog from "./pages/Backlog";
import Timeline from "./pages/Timeline";
import Reports from "./pages/Reports";
import ProjectSettings from "./pages/ProjectSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ProjectProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/board" element={<Board />} />
              <Route path="/backlog" element={<Backlog />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<ProjectSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </ProjectProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
