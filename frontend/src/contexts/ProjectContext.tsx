import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Issue, Status, Project, Sprint, Epic } from '@/types/jira';
import { issues as initialIssues, projects, sprints as initialSprints, epics as initialEpics } from '@/data/mockData';

interface ProjectContextType {
  currentProject: Project;
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  addIssue: (issue: Issue) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;
  moveIssue: (issueId: string, newStatus: Status) => void;
  sprints: Sprint[];
  setSprints: React.Dispatch<React.SetStateAction<Sprint[]>>;
  addSprint: (sprint: Sprint) => void;
  updateSprint: (id: string, updates: Partial<Sprint>) => void;
  deleteSprint: (id: string) => void;
  startSprint: (id: string) => void;
  completeSprint: (id: string) => void;
  epics: Epic[];
  setEpics: React.Dispatch<React.SetStateAction<Epic[]>>;
  addEpic: (epic: Epic) => void;
  updateEpic: (id: string, updates: Partial<Epic>) => void;
  deleteEpic: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
};

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [selectedProjectId, setSelectedProjectId] = useState('p1');
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints);
  const [epics, setEpics] = useState<Epic[]>(initialEpics);
  const [searchQuery, setSearchQuery] = useState('');

  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const addIssue = useCallback((issue: Issue) => {
    setIssues(prev => [issue, ...prev]);
  }, []);

  const updateIssue = useCallback((id: string, updates: Partial<Issue>) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i));
  }, []);

  const deleteIssue = useCallback((id: string) => {
    setIssues(prev => prev.filter(i => i.id !== id && i.parentId !== id));
  }, []);

  const moveIssue = useCallback((issueId: string, newStatus: Status) => {
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: newStatus, updatedAt: new Date().toISOString() } : i));
  }, []);

  const addSprint = useCallback((sprint: Sprint) => {
    setSprints(prev => [...prev, sprint]);
  }, []);

  const updateSprint = useCallback((id: string, updates: Partial<Sprint>) => {
    setSprints(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSprint = useCallback((id: string) => {
    setSprints(prev => prev.filter(s => s.id !== id));
    setIssues(prev => prev.map(i => i.sprintId === id ? { ...i, sprintId: null } : i));
  }, []);

  const startSprint = useCallback((id: string) => {
    setSprints(prev => prev.map(s => {
      if (s.id === id) return { ...s, status: 'active' as const };
      if (s.status === 'active') return { ...s, status: 'completed' as const };
      return s;
    }));
  }, []);

  const completeSprint = useCallback((id: string) => {
    setSprints(prev => prev.map(s => s.id === id ? { ...s, status: 'completed' as const } : s));
    // Move incomplete issues back to backlog
    setIssues(prev => prev.map(i => {
      if (i.sprintId === id && i.status !== 'done') {
        return { ...i, sprintId: null, updatedAt: new Date().toISOString() };
      }
      return i;
    }));
  }, []);

  const addEpic = useCallback((epic: Epic) => {
    setEpics(prev => [...prev, epic]);
  }, []);

  const updateEpic = useCallback((id: string, updates: Partial<Epic>) => {
    setEpics(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteEpic = useCallback((id: string) => {
    setEpics(prev => prev.filter(e => e.id !== id));
    setIssues(prev => prev.map(i => i.epicId === id ? { ...i, epicId: null } : i));
  }, []);

  return (
    <ProjectContext.Provider value={{
      currentProject, issues, setIssues, addIssue, updateIssue, deleteIssue, moveIssue,
      sprints, setSprints, addSprint, updateSprint, deleteSprint, startSprint, completeSprint,
      epics, setEpics, addEpic, updateEpic, deleteEpic,
      searchQuery, setSearchQuery, selectedProjectId, setSelectedProjectId,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
