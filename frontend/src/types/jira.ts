export type IssueType = 'story' | 'bug' | 'task' | 'epic' | 'subtask' | 'spike';
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';
export type Status = 'todo' | 'in_progress' | 'in_review' | 'done';
export type SprintStatus = 'active' | 'planned' | 'completed';
export type UserRole = 'admin' | 'project_manager' | 'developer' | 'viewer';
export type LinkType = 'blocks' | 'is_blocked_by' | 'relates_to' | 'duplicates' | 'is_duplicated_by';
export type NotificationType = 'info' | 'assignment' | 'comment' | 'status_change' | 'sprint' | 'system';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  initials: string;
  role: UserRole;
  isActive?: boolean;
  password?: string;
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

export interface IssueLink {
  id: string;
  type: LinkType;
  targetIssueId: string;
}

export interface TimeTracking {
  estimatedHours: number | null;
  loggedHours: number;
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
  dueDate: string | null;
  timeTracking: TimeTracking;
  links: IssueLink[];
  watchers: string[];
}

export interface Epic {
  id: string;
  key: string;
  name: string;
  summary: string;
  color: string;
  status: 'todo' | 'in_progress' | 'done';
  projectId: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  leadId: string;
  avatar: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  actionUrl: string;
  metadata: Record<string, unknown>;
  createdAt: string;
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
  spike: 'Spike',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  highest: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  lowest: 'Lowest',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  project_manager: 'Project Manager',
  developer: 'Developer',
  viewer: 'Viewer',
};

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  blocks: 'blocks',
  is_blocked_by: 'is blocked by',
  relates_to: 'relates to',
  duplicates: 'duplicates',
  is_duplicated_by: 'is duplicated by',
};
