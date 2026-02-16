export type IssueType = 'story' | 'bug' | 'task' | 'epic' | 'subtask';
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';
export type Status = 'todo' | 'in_progress' | 'in_review' | 'done';
export type SprintStatus = 'active' | 'planned' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  initials: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  key: string;
  title: string;
  description: string;
  type: IssueType;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  reporterId: string;
  labels: string[];
  storyPoints: number | null;
  sprintId: string | null;
  epicId: string | null;
  parentId: string | null;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  leadId: string;
  avatar: string;
}

export const STATUS_LABELS: Record<Status, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  story: 'Story',
  bug: 'Bug',
  task: 'Task',
  epic: 'Epic',
  subtask: 'Sub-task',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  highest: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  lowest: 'Lowest',
};
