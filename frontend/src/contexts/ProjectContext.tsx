import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Epic, Issue, Project, Sprint, Status, User, Label } from '@/types/jira';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectContextType {
  projects: Project[];
  createProject: (payload: { name: string; key: string; description?: string; avatar?: string; leadId?: string }) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  users: User[];
  refreshUsers: () => Promise<void>;
  createUserAccount: (payload: { name: string; email: string; role: User['role']; password: string; isActive?: boolean }) => Promise<void>;
  updateUserAccount: (id: string, payload: { name: string; email: string; role: User['role']; password?: string; isActive?: boolean }) => Promise<void>;
  deleteUserAccount: (id: string) => Promise<void>;
  labels: Label[];
  currentProject: Project;
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  addIssue: (issue: Issue) => Promise<void>;
  updateIssue: (id: string, updates: Partial<Issue>) => Promise<void>;
  deleteIssue: (id: string) => Promise<void>;
  moveIssue: (issueId: string, newStatus: Status) => Promise<void>;
  sprints: Sprint[];
  setSprints: React.Dispatch<React.SetStateAction<Sprint[]>>;
  addSprint: (sprint: Sprint) => Promise<void>;
  updateSprint: (id: string, updates: Partial<Sprint>) => Promise<void>;
  deleteSprint: (id: string) => Promise<void>;
  startSprint: (id: string) => Promise<void>;
  completeSprint: (id: string) => Promise<void>;
  epics: Epic[];
  setEpics: React.Dispatch<React.SetStateAction<Epic[]>>;
  addEpic: (epic: Epic) => Promise<void>;
  updateEpic: (id: string, updates: Partial<Epic>) => Promise<void>;
  deleteEpic: (id: string) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  refreshReportsToken: number;
  bumpReportsRefresh: () => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
};

const PROJECT_KEY = 'jira_selected_project_id';

const emptyProject: Project = {
  id: 'none',
  name: 'No Project',
  key: 'N/A',
  description: '',
  leadId: '',
  avatar: '??',
};

const toIssuePayload = (updates: Partial<Issue>) => ({
  ...(updates.title !== undefined ? { title: updates.title } : {}),
  ...(updates.description !== undefined ? { description: updates.description } : {}),
  ...(updates.type !== undefined ? { type: updates.type } : {}),
  ...(updates.status !== undefined ? { status: updates.status } : {}),
  ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
  ...(updates.assigneeId !== undefined ? { assigneeId: updates.assigneeId } : {}),
  ...(updates.reporterId !== undefined ? { reporterId: updates.reporterId } : {}),
  ...(updates.labels !== undefined ? { labels: updates.labels } : {}),
  ...(updates.storyPoints !== undefined ? { storyPoints: updates.storyPoints } : {}),
  ...(updates.sprintId !== undefined ? { sprintId: updates.sprintId } : {}),
  ...(updates.epicId !== undefined ? { epicId: updates.epicId } : {}),
  ...(updates.parentId !== undefined ? { parentId: updates.parentId } : {}),
  ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate } : {}),
  ...(updates.timeTracking !== undefined ? { timeTracking: updates.timeTracking } : {}),
  ...(updates.comments !== undefined ? { comments: updates.comments } : {}),
  ...(updates.links !== undefined ? { links: updates.links } : {}),
  ...(updates.watchers !== undefined ? { watchers: updates.watchers } : {}),
});

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState(() => localStorage.getItem(PROJECT_KEY) || '');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshReportsToken, setRefreshReportsToken] = useState(0);

  const bumpReportsRefresh = useCallback(() => setRefreshReportsToken((n) => n + 1), []);

  const setSelectedProjectId = useCallback((id: string) => {
    setSelectedProjectIdState(id);
    localStorage.setItem(PROJECT_KEY, id);
  }, []);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || emptyProject;

  const loadIssues = useCallback(async (projectId: string, query: string) => {
    const q = query.trim();
    const searchSuffix = q ? `&search=${encodeURIComponent(q)}` : '';
    const loadedIssues = await apiRequest<Issue[]>(`/issues/?project_id=${projectId}${searchSuffix}`);
    setIssues(loadedIssues);
  }, []);

  const refreshUsers = useCallback(async () => {
    const loadedUsers = await apiRequest<User[]>('/users/');
    setUsers(loadedUsers);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setProjects([]);
      setUsers([]);
      setLabels([]);
      setIssues([]);
      setSprints([]);
      setEpics([]);
      return;
    }

    const loadBootstrap = async () => {
      try {
        const [loadedProjects, loadedUsers] = await Promise.all([
          apiRequest<Project[]>('/projects/'),
          apiRequest<User[]>('/users/'),
        ]);
        setProjects(loadedProjects);
        setUsers(loadedUsers);

        if (!selectedProjectId && loadedProjects.length > 0) {
          setSelectedProjectId(loadedProjects[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadBootstrap();
  }, [isAuthenticated, selectedProjectId, setSelectedProjectId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedProjectId) return;

    const loadProjectData = async () => {
      try {
        const [loadedSprints, loadedEpics, loadedLabels] = await Promise.all([
          apiRequest<Sprint[]>(`/sprints/?project_id=${selectedProjectId}`),
          apiRequest<Epic[]>(`/epics/?project_id=${selectedProjectId}`),
          apiRequest<Label[]>(`/labels/?project_id=${selectedProjectId}`),
        ]);
        setSprints(loadedSprints);
        setEpics(loadedEpics);
        setLabels(loadedLabels);
      } catch (err) {
        console.error(err);
      }
    };

    loadProjectData();
  }, [isAuthenticated, selectedProjectId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedProjectId) return;
    const timer = setTimeout(() => {
      loadIssues(selectedProjectId, searchQuery).catch(console.error);
    }, 200);
    return () => clearTimeout(timer);
  }, [isAuthenticated, selectedProjectId, searchQuery, loadIssues]);

  const addIssue = useCallback(async (issue: Issue) => {
    const created = await apiRequest<Issue>('/issues/', {
      method: 'POST',
      body: {
        ...toIssuePayload(issue),
        projectId: currentProject.id,
      },
    });
    setIssues((prev) => [created, ...prev]);
    bumpReportsRefresh();
  }, [currentProject.id, bumpReportsRefresh]);

  const updateIssue = useCallback(async (id: string, updates: Partial<Issue>) => {
    const updated = await apiRequest<Issue>(`/issues/${id}/`, {
      method: 'PATCH',
      body: toIssuePayload(updates),
    });
    setIssues((prev) => prev.map((i) => (i.id === id ? updated : i)));
    bumpReportsRefresh();
  }, [bumpReportsRefresh]);

  const deleteIssue = useCallback(async (id: string) => {
    await apiRequest(`/issues/${id}/`, { method: 'DELETE' });
    setIssues((prev) => prev.filter((i) => i.id !== id && i.parentId !== id));
    bumpReportsRefresh();
  }, [bumpReportsRefresh]);

  const moveIssue = useCallback(async (issueId: string, newStatus: Status) => {
    const updated = await apiRequest<Issue>(`/issues/${issueId}/move/`, {
      method: 'POST',
      body: { status: newStatus },
    });
    setIssues((prev) => prev.map((i) => (i.id === issueId ? updated : i)));
    bumpReportsRefresh();
  }, [bumpReportsRefresh]);

  const addSprint = useCallback(async (sprint: Sprint) => {
    const created = await apiRequest<Sprint>('/sprints/', {
      method: 'POST',
      body: {
        name: sprint.name,
        goal: sprint.goal,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        projectId: currentProject.id,
      },
    });
    setSprints((prev) => [...prev, created]);
    bumpReportsRefresh();
  }, [currentProject.id, bumpReportsRefresh]);

  const updateSprint = useCallback(async (id: string, updates: Partial<Sprint>) => {
    const existing = sprints.find((s) => s.id === id);
    if (!existing) return;
    const updated = await apiRequest<Sprint>(`/sprints/${id}/`, {
      method: 'PATCH',
      body: {
        name: updates.name ?? existing.name,
        goal: updates.goal ?? existing.goal,
        status: updates.status ?? existing.status,
        startDate: updates.startDate ?? existing.startDate,
        endDate: updates.endDate ?? existing.endDate,
      },
    });
    setSprints((prev) => prev.map((s) => (s.id === id ? updated : s)));
    bumpReportsRefresh();
  }, [sprints, bumpReportsRefresh]);

  const deleteSprint = useCallback(async (id: string) => {
    await apiRequest(`/sprints/${id}/`, { method: 'DELETE' });
    setSprints((prev) => prev.filter((s) => s.id !== id));
    setIssues((prev) => prev.map((i) => (i.sprintId === id ? { ...i, sprintId: null } : i)));
    bumpReportsRefresh();
  }, [bumpReportsRefresh]);

  const startSprint = useCallback(async (id: string) => {
    const updated = await apiRequest<Sprint>(`/sprints/${id}/start/`, { method: 'POST' });
    setSprints((prev) => prev.map((s) => {
      if (s.id === id) return updated;
      if (s.status === 'active') return { ...s, status: 'completed' };
      return s;
    }));
    bumpReportsRefresh();
  }, [bumpReportsRefresh]);

  const completeSprint = useCallback(async (id: string) => {
    const updated = await apiRequest<Sprint>(`/sprints/${id}/complete/`, { method: 'POST' });
    setSprints((prev) => prev.map((s) => (s.id === id ? updated : s)));
    setIssues((prev) => prev.map((i) => {
      if (i.sprintId === id && i.status !== 'done') return { ...i, sprintId: null };
      return i;
    }));
    bumpReportsRefresh();
  }, [bumpReportsRefresh]);

  const addEpic = useCallback(async (epic: Epic) => {
    const created = await apiRequest<Epic>('/epics/', {
      method: 'POST',
      body: {
        name: epic.name,
        summary: epic.summary,
        color: epic.color,
        status: epic.status,
        projectId: currentProject.id,
      },
    });
    setEpics((prev) => [...prev, created]);
  }, [currentProject.id]);

  const updateEpic = useCallback(async (id: string, updates: Partial<Epic>) => {
    const updated = await apiRequest<Epic>(`/epics/${id}/`, {
      method: 'PATCH',
      body: updates,
    });
    setEpics((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }, []);

  const deleteEpic = useCallback(async (id: string) => {
    await apiRequest(`/epics/${id}/`, { method: 'DELETE' });
    setEpics((prev) => prev.filter((e) => e.id !== id));
    setIssues((prev) => prev.map((i) => (i.epicId === id ? { ...i, epicId: null } : i)));
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const updated = await apiRequest<Project>(`/projects/${id}/`, {
      method: 'PATCH',
      body: updates,
    });
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, []);

  const createProject = useCallback(async (payload: { name: string; key: string; description?: string; avatar?: string; leadId?: string }) => {
    const created = await apiRequest<Project>('/projects/', {
      method: 'POST',
      body: payload,
    });
    setProjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await apiRequest(`/projects/${id}/`, { method: 'DELETE' });
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (selectedProjectId === id) {
        const fallback = next[0]?.id || '';
        setSelectedProjectIdState(fallback);
        if (fallback) localStorage.setItem(PROJECT_KEY, fallback);
        else localStorage.removeItem(PROJECT_KEY);
      }
      return next;
    });
    if (selectedProjectId === id) {
      setIssues([]);
      setSprints([]);
      setEpics([]);
      setLabels([]);
    }
  }, [selectedProjectId]);

  const createUserAccount = useCallback(async (payload: { name: string; email: string; role: User['role']; password: string; isActive?: boolean }) => {
    const created = await apiRequest<User>('/users/', {
      method: 'POST',
      body: payload,
    });
    setUsers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const updateUserAccount = useCallback(async (id: string, payload: { name: string; email: string; role: User['role']; password?: string; isActive?: boolean }) => {
    const updated = await apiRequest<User>(`/users/${id}/`, {
      method: 'PATCH',
      body: payload,
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
  }, []);

  const deleteUserAccount = useCallback(async (id: string) => {
    await apiRequest(`/users/${id}/`, { method: 'DELETE' });
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        createProject,
        deleteProject,
        users,
        refreshUsers,
        createUserAccount,
        updateUserAccount,
        deleteUserAccount,
        labels,
        currentProject,
        issues,
        setIssues,
        addIssue,
        updateIssue,
        deleteIssue,
        moveIssue,
        sprints,
        setSprints,
        addSprint,
        updateSprint,
        deleteSprint,
        startSprint,
        completeSprint,
        epics,
        setEpics,
        addEpic,
        updateEpic,
        deleteEpic,
        updateProject,
        searchQuery,
        setSearchQuery,
        selectedProjectId,
        setSelectedProjectId,
        refreshReportsToken,
        bumpReportsRefresh,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
