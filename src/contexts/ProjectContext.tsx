import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Issue, Status, Project } from '@/types/jira';
import { issues as initialIssues, projects, sprints as initialSprints } from '@/data/mockData';

interface ProjectContextType {
  currentProject: Project;
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  addIssue: (issue: Issue) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  moveIssue: (issueId: string, newStatus: Status) => void;
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
  const [searchQuery, setSearchQuery] = useState('');

  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const addIssue = useCallback((issue: Issue) => {
    setIssues(prev => [issue, ...prev]);
  }, []);

  const updateIssue = useCallback((id: string, updates: Partial<Issue>) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i));
  }, []);

  const moveIssue = useCallback((issueId: string, newStatus: Status) => {
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: newStatus, updatedAt: new Date().toISOString() } : i));
  }, []);

  return (
    <ProjectContext.Provider value={{
      currentProject, issues, setIssues, addIssue, updateIssue, moveIssue,
      searchQuery, setSearchQuery, selectedProjectId, setSelectedProjectId,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
