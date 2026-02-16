import { Issue, Sprint, Project, User, Label } from '@/types/jira';

export const users: User[] = [
  { id: 'u1', name: 'Alex Morgan', email: 'alex@company.com', avatar: '', initials: 'AM' },
  { id: 'u2', name: 'Sarah Chen', email: 'sarah@company.com', avatar: '', initials: 'SC' },
  { id: 'u3', name: 'James Wilson', email: 'james@company.com', avatar: '', initials: 'JW' },
  { id: 'u4', name: 'Maria Garcia', email: 'maria@company.com', avatar: '', initials: 'MG' },
  { id: 'u5', name: 'David Kim', email: 'david@company.com', avatar: '', initials: 'DK' },
];

export const labels: Label[] = [
  { id: 'l1', name: 'frontend', color: 'blue' },
  { id: 'l2', name: 'backend', color: 'green' },
  { id: 'l3', name: 'design', color: 'purple' },
  { id: 'l4', name: 'performance', color: 'orange' },
  { id: 'l5', name: 'security', color: 'red' },
];

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'Project Atlas',
    key: 'ATL',
    description: 'Main product development project',
    leadId: 'u1',
    avatar: '🚀',
  },
  {
    id: 'p2',
    name: 'Design System',
    key: 'DS',
    description: 'Component library and design tokens',
    leadId: 'u2',
    avatar: '🎨',
  },
];

export const sprints: Sprint[] = [
  {
    id: 's1',
    name: 'Sprint 12',
    goal: 'Complete user authentication and dashboard redesign',
    status: 'active',
    startDate: '2026-02-09',
    endDate: '2026-02-23',
  },
  {
    id: 's2',
    name: 'Sprint 13',
    goal: 'API optimization and mobile responsiveness',
    status: 'planned',
    startDate: '2026-02-23',
    endDate: '2026-03-09',
  },
];

export const issues: Issue[] = [
  {
    id: 'i1', key: 'ATL-101', title: 'Implement user authentication flow',
    description: 'Build the complete authentication flow including login, signup, password reset, and session management.',
    type: 'story', status: 'in_progress', priority: 'high',
    assigneeId: 'u1', reporterId: 'u2', labels: ['l1', 'l5'],
    storyPoints: 8, sprintId: 's1', epicId: null, parentId: null,
    comments: [{ id: 'c1', authorId: 'u2', content: 'Make sure to use OAuth 2.0 for third-party integrations', createdAt: '2026-02-10T10:00:00Z' }],
    createdAt: '2026-02-08T09:00:00Z', updatedAt: '2026-02-12T14:00:00Z',
  },
  {
    id: 'i2', key: 'ATL-102', title: 'Fix navigation menu dropdown not closing on outside click',
    description: 'The dropdown menu stays open when clicking outside of it. Need to add proper event listener for outside clicks.',
    type: 'bug', status: 'todo', priority: 'medium',
    assigneeId: 'u3', reporterId: 'u1', labels: ['l1'],
    storyPoints: 2, sprintId: 's1', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-09T11:00:00Z', updatedAt: '2026-02-09T11:00:00Z',
  },
  {
    id: 'i3', key: 'ATL-103', title: 'Design new dashboard layout',
    description: 'Create wireframes and high-fidelity mockups for the new dashboard including analytics widgets and activity feed.',
    type: 'task', status: 'in_review', priority: 'high',
    assigneeId: 'u2', reporterId: 'u1', labels: ['l3'],
    storyPoints: 5, sprintId: 's1', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-07T08:00:00Z', updatedAt: '2026-02-11T16:00:00Z',
  },
  {
    id: 'i4', key: 'ATL-104', title: 'Optimize API response times',
    description: 'Profile and optimize slow API endpoints. Target: all endpoints under 200ms response time.',
    type: 'story', status: 'todo', priority: 'highest',
    assigneeId: 'u4', reporterId: 'u1', labels: ['l2', 'l4'],
    storyPoints: 13, sprintId: 's1', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-02-10T09:00:00Z',
  },
  {
    id: 'i5', key: 'ATL-105', title: 'Add unit tests for payment module',
    description: 'Write comprehensive unit tests for the payment processing module covering all edge cases.',
    type: 'task', status: 'done', priority: 'medium',
    assigneeId: 'u5', reporterId: 'u3', labels: ['l2'],
    storyPoints: 5, sprintId: 's1', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-06T14:00:00Z', updatedAt: '2026-02-11T10:00:00Z',
  },
  {
    id: 'i6', key: 'ATL-106', title: 'Implement real-time notifications',
    description: 'Build WebSocket-based real-time notification system for in-app alerts.',
    type: 'story', status: 'todo', priority: 'medium',
    assigneeId: 'u1', reporterId: 'u4', labels: ['l1', 'l2'],
    storyPoints: 8, sprintId: 's1', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-11T09:00:00Z', updatedAt: '2026-02-11T09:00:00Z',
  },
  {
    id: 'i7', key: 'ATL-107', title: 'Database migration for user preferences',
    description: 'Create and run database migration to add user preferences table with default values.',
    type: 'task', status: 'in_progress', priority: 'low',
    assigneeId: 'u4', reporterId: 'u2', labels: ['l2'],
    storyPoints: 3, sprintId: 's1', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-10T15:00:00Z', updatedAt: '2026-02-12T09:00:00Z',
  },
  {
    id: 'i8', key: 'ATL-108', title: 'Update color tokens for accessibility',
    description: 'Review and update color contrast ratios to meet WCAG 2.1 AA standards.',
    type: 'task', status: 'done', priority: 'high',
    assigneeId: 'u2', reporterId: 'u3', labels: ['l3', 'l1'],
    storyPoints: 3, sprintId: 's1', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-05T10:00:00Z', updatedAt: '2026-02-10T17:00:00Z',
  },
  {
    id: 'i9', key: 'ATL-109', title: 'Implement file upload with drag and drop',
    description: 'Add file upload functionality supporting drag-and-drop, multiple files, and progress indicators.',
    type: 'story', status: 'todo', priority: 'low',
    assigneeId: null, reporterId: 'u1', labels: ['l1'],
    storyPoints: 5, sprintId: 's2', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-12T08:00:00Z', updatedAt: '2026-02-12T08:00:00Z',
  },
  {
    id: 'i10', key: 'ATL-110', title: 'Set up CI/CD pipeline',
    description: 'Configure automated testing and deployment pipeline with staging and production environments.',
    type: 'task', status: 'todo', priority: 'high',
    assigneeId: 'u5', reporterId: 'u1', labels: ['l2'],
    storyPoints: 8, sprintId: 's2', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-12T11:00:00Z', updatedAt: '2026-02-12T11:00:00Z',
  },
  {
    id: 'i11', key: 'ATL-111', title: 'Memory leak in WebSocket connection handler',
    description: 'WebSocket connections are not properly cleaned up on component unmount causing memory leaks.',
    type: 'bug', status: 'todo', priority: 'highest',
    assigneeId: 'u3', reporterId: 'u5', labels: ['l1', 'l4'],
    storyPoints: 3, sprintId: null, epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-13T09:00:00Z', updatedAt: '2026-02-13T09:00:00Z',
  },
  {
    id: 'i12', key: 'ATL-112', title: 'Add search functionality to data tables',
    description: 'Implement full-text search with filtering and sorting capabilities across all data tables.',
    type: 'story', status: 'todo', priority: 'medium',
    assigneeId: null, reporterId: 'u2', labels: ['l1'],
    storyPoints: 5, sprintId: null, epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-13T14:00:00Z', updatedAt: '2026-02-13T14:00:00Z',
  },
];
