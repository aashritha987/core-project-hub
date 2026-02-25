import { Issue, Sprint, Project, User, Label, Epic } from '@/types/jira';

export const users: User[] = [
  { id: 'u1', name: 'Alex Morgan', email: 'alex@company.com', avatar: '', initials: 'AM', role: 'admin', password: 'admin123' },
  { id: 'u2', name: 'Sarah Chen', email: 'sarah@company.com', avatar: '', initials: 'SC', role: 'project_manager', password: 'pm123' },
  { id: 'u3', name: 'James Wilson', email: 'james@company.com', avatar: '', initials: 'JW', role: 'developer', password: 'dev123' },
  { id: 'u4', name: 'Maria Garcia', email: 'maria@company.com', avatar: '', initials: 'MG', role: 'developer', password: 'dev123' },
  { id: 'u5', name: 'David Kim', email: 'david@company.com', avatar: '', initials: 'DK', role: 'viewer', password: 'view123' },
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
    avatar: 'ðŸš€',
  },
  {
    id: 'p2',
    name: 'Design System',
    key: 'DS',
    description: 'Component library and design tokens',
    leadId: 'u2',
    avatar: 'ðŸŽ¨',
  },
];

export const epics: Epic[] = [
  { id: 'e1', key: 'ATL-E1', name: 'User Authentication', summary: 'Complete auth system with OAuth, MFA, and session management', color: '#6554C0', status: 'in_progress', projectId: 'p1' },
  { id: 'e2', key: 'ATL-E2', name: 'Dashboard Redesign', summary: 'New dashboard with analytics, widgets, and real-time data', color: '#00875A', status: 'in_progress', projectId: 'p1' },
  { id: 'e3', key: 'ATL-E3', name: 'API Performance', summary: 'Optimize all API endpoints for sub-200ms responses', color: '#FF5630', status: 'todo', projectId: 'p1' },
  { id: 'e4', key: 'ATL-E4', name: 'Mobile Responsiveness', summary: 'Make all views fully responsive for mobile devices', color: '#0065FF', status: 'todo', projectId: 'p1' },
];

export const sprints: Sprint[] = [
  {
    id: 's1',
    name: 'Sprint 12',
    goal: 'Complete user authentication and dashboard redesign',
    status: 'active',
    startDate: '2026-02-09',
    endDate: '2026-02-23',
    projectId: 'p1',
  },
  {
    id: 's2',
    name: 'Sprint 13',
    goal: 'API optimization and mobile responsiveness',
    status: 'planned',
    startDate: '2026-02-23',
    endDate: '2026-03-09',
    projectId: 'p1',
  },
  {
    id: 's3',
    name: 'Sprint 11',
    goal: 'Foundation setup and initial components',
    status: 'completed',
    startDate: '2026-01-26',
    endDate: '2026-02-09',
    projectId: 'p1',
  },
];

export const issues: Issue[] = [
  {
    id: 'i1', key: 'ATL-101', title: 'Implement user authentication flow',
    description: '## Requirements\n\nBuild the complete authentication flow including:\n\n- Login with email/password\n- OAuth 2.0 integration\n- Password reset flow\n- Session management\n\n### Acceptance Criteria\n- [ ] Users can log in with email/password\n- [ ] OAuth works with Google and GitHub\n- [ ] Sessions persist across browser refreshes',
    type: 'story', status: 'in_progress', priority: 'high',
    assigneeId: 'u1', reporterId: 'u2', labels: ['l1', 'l5'], sprintId: 's1', epicId: 'e1', parentId: null,
    comments: [{ id: 'c1', authorId: 'u2', content: 'Make sure to use OAuth 2.0 for third-party integrations', createdAt: '2026-02-10T10:00:00Z' }],
    createdAt: '2026-02-08T09:00:00Z', updatedAt: '2026-02-12T14:00:00Z',
    dueDate: '2026-02-20', timeTracking: { estimatedHours: 16, loggedHours: 8 },
    links: [{ id: 'lk1', type: 'blocks', targetIssueId: 'i6' }],
    watchers: ['u1', 'u2', 'u3'],
  },
  {
    id: 'i2', key: 'ATL-102', title: 'Fix navigation menu dropdown not closing on outside click',
    description: 'The dropdown menu stays open when clicking outside of it. Need to add proper event listener for outside clicks.',
    type: 'bug', status: 'todo', priority: 'medium',
    assigneeId: 'u3', reporterId: 'u1', labels: ['l1'], sprintId: 's1', epicId: 'e2', parentId: null,
    comments: [], createdAt: '2026-02-09T11:00:00Z', updatedAt: '2026-02-09T11:00:00Z',
    dueDate: '2026-02-18', timeTracking: { estimatedHours: 4, loggedHours: 0 },
    links: [], watchers: ['u3'],
  },
  {
    id: 'i3', key: 'ATL-103', title: 'Design new dashboard layout',
    description: 'Create wireframes and high-fidelity mockups for the new dashboard including analytics widgets and activity feed.',
    type: 'task', status: 'in_review', priority: 'high',
    assigneeId: 'u2', reporterId: 'u1', labels: ['l3'], sprintId: 's1', epicId: 'e2', parentId: null,
    comments: [], createdAt: '2026-02-07T08:00:00Z', updatedAt: '2026-02-11T16:00:00Z',
    dueDate: null, timeTracking: { estimatedHours: 10, loggedHours: 9 },
    links: [{ id: 'lk2', type: 'relates_to', targetIssueId: 'i2' }],
    watchers: ['u1', 'u2'],
  },
  {
    id: 'i4', key: 'ATL-104', title: 'Optimize API response times',
    description: 'Profile and optimize slow API endpoints. Target: all endpoints under 200ms response time.',
    type: 'spike', status: 'todo', priority: 'highest',
    assigneeId: 'u4', reporterId: 'u1', labels: ['l2', 'l4'], sprintId: 's1', epicId: 'e3', parentId: null,
    comments: [], createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-02-10T09:00:00Z',
    dueDate: '2026-02-22', timeTracking: { estimatedHours: 24, loggedHours: 0 },
    links: [], watchers: ['u1', 'u4'],
  },
  {
    id: 'i5', key: 'ATL-105', title: 'Add unit tests for payment module',
    description: 'Write comprehensive unit tests for the payment processing module covering all edge cases.',
    type: 'task', status: 'done', priority: 'medium',
    assigneeId: 'u5', reporterId: 'u3', labels: ['l2'], sprintId: 's1', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-06T14:00:00Z', updatedAt: '2026-02-11T10:00:00Z',
    dueDate: null, timeTracking: { estimatedHours: 8, loggedHours: 7 },
    links: [], watchers: [],
  },
  {
    id: 'i6', key: 'ATL-106', title: 'Implement real-time notifications',
    description: 'Build WebSocket-based real-time notification system for in-app alerts.',
    type: 'story', status: 'todo', priority: 'medium',
    assigneeId: 'u1', reporterId: 'u4', labels: ['l1', 'l2'], sprintId: 's1', epicId: 'e1', parentId: null,
    comments: [], createdAt: '2026-02-11T09:00:00Z', updatedAt: '2026-02-11T09:00:00Z',
    dueDate: null, timeTracking: { estimatedHours: 16, loggedHours: 0 },
    links: [{ id: 'lk3', type: 'is_blocked_by', targetIssueId: 'i1' }],
    watchers: ['u1'],
  },
  {
    id: 'i7', key: 'ATL-107', title: 'Database migration for user preferences',
    description: 'Create and run database migration to add user preferences table with default values.',
    type: 'task', status: 'in_progress', priority: 'low',
    assigneeId: 'u4', reporterId: 'u2', labels: ['l2'], sprintId: 's1', epicId: 'e1', parentId: null,
    comments: [], createdAt: '2026-02-10T15:00:00Z', updatedAt: '2026-02-12T09:00:00Z',
    dueDate: null, timeTracking: { estimatedHours: 6, loggedHours: 3 },
    links: [], watchers: [],
  },
  {
    id: 'i8', key: 'ATL-108', title: 'Update color tokens for accessibility',
    description: 'Review and update color contrast ratios to meet WCAG 2.1 AA standards.',
    type: 'task', status: 'done', priority: 'high',
    assigneeId: 'u2', reporterId: 'u3', labels: ['l3', 'l1'], sprintId: 's1', epicId: 'e2', parentId: null,
    comments: [], createdAt: '2026-02-05T10:00:00Z', updatedAt: '2026-02-10T17:00:00Z',
    dueDate: null, timeTracking: { estimatedHours: 4, loggedHours: 4 },
    links: [], watchers: [],
  },
  {
    id: 'i9', key: 'ATL-109', title: 'Implement file upload with drag and drop',
    description: 'Add file upload functionality supporting drag-and-drop, multiple files, and progress indicators.',
    type: 'story', status: 'todo', priority: 'low',
    assigneeId: null, reporterId: 'u1', labels: ['l1'], sprintId: 's2', epicId: 'e4', parentId: null,
    comments: [], createdAt: '2026-02-12T08:00:00Z', updatedAt: '2026-02-12T08:00:00Z',
    dueDate: null, timeTracking: { estimatedHours: 10, loggedHours: 0 },
    links: [], watchers: [],
  },
  {
    id: 'i10', key: 'ATL-110', title: 'Set up CI/CD pipeline',
    description: 'Configure automated testing and deployment pipeline with staging and production environments.',
    type: 'task', status: 'todo', priority: 'high',
    assigneeId: 'u5', reporterId: 'u1', labels: ['l2'], sprintId: 's2', epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-12T11:00:00Z', updatedAt: '2026-02-12T11:00:00Z',
    dueDate: null, timeTracking: { estimatedHours: 16, loggedHours: 0 },
    links: [], watchers: [],
  },
  {
    id: 'i11', key: 'ATL-111', title: 'Memory leak in WebSocket connection handler',
    description: 'WebSocket connections are not properly cleaned up on component unmount causing memory leaks.',
    type: 'bug', status: 'todo', priority: 'highest',
    assigneeId: 'u3', reporterId: 'u5', labels: ['l1', 'l4'], sprintId: null, epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-13T09:00:00Z', updatedAt: '2026-02-13T09:00:00Z',
    dueDate: '2026-02-19', timeTracking: { estimatedHours: 6, loggedHours: 0 },
    links: [], watchers: ['u3', 'u5'],
  },
  {
    id: 'i12', key: 'ATL-112', title: 'Add search functionality to data tables',
    description: 'Implement full-text search with filtering and sorting capabilities across all data tables.',
    type: 'story', status: 'todo', priority: 'medium',
    assigneeId: null, reporterId: 'u2', labels: ['l1'], sprintId: null, epicId: null, parentId: null,
    comments: [], createdAt: '2026-02-13T14:00:00Z', updatedAt: '2026-02-13T14:00:00Z',
    dueDate: null, timeTracking: { estimatedHours: 10, loggedHours: 0 },
    links: [], watchers: [],
  },
  // Subtasks for i1
  {
    id: 'i13', key: 'ATL-113', title: 'Create login form component',
    description: 'Build the login form UI with email/password fields and validation.',
    type: 'subtask', status: 'done', priority: 'high',
    assigneeId: 'u1', reporterId: 'u1', labels: ['l1'], sprintId: 's1', epicId: 'e1', parentId: 'i1',
    comments: [], createdAt: '2026-02-09T09:00:00Z', updatedAt: '2026-02-10T14:00:00Z',
    dueDate: null, timeTracking: { estimatedHours: 3, loggedHours: 3 },
    links: [], watchers: [],
  },
  {
    id: 'i14', key: 'ATL-114', title: 'Implement JWT token refresh logic',
    description: 'Add automatic token refresh mechanism before expiry.',
    type: 'subtask', status: 'in_progress', priority: 'high',
    assigneeId: 'u1', reporterId: 'u1', labels: ['l1', 'l5'], sprintId: 's1', epicId: 'e1', parentId: 'i1',
    comments: [], createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-02-12T11:00:00Z',
    dueDate: null, timeTracking: { estimatedHours: 5, loggedHours: 3 },
    links: [], watchers: [],
  },
  {
    id: 'i15', key: 'ATL-115', title: 'Add OAuth provider integration',
    description: 'Integrate Google and GitHub OAuth providers.',
    type: 'subtask', status: 'todo', priority: 'medium',
    assigneeId: 'u1', reporterId: 'u1', labels: ['l1'], sprintId: 's1', epicId: 'e1', parentId: 'i1',
    comments: [], createdAt: '2026-02-10T09:30:00Z', updatedAt: '2026-02-10T09:30:00Z',
    dueDate: null, timeTracking: { estimatedHours: 5, loggedHours: 0 },
    links: [], watchers: [],
  },
];

// Burndown data for Sprint 12 (simulated daily snapshots)
export const sprintBurndownData = [
  { date: '2026-02-09', remaining: 50, ideal: 50 },
  { date: '2026-02-10', remaining: 48, ideal: 46.4 },
  { date: '2026-02-11', remaining: 42, ideal: 42.9 },
  { date: '2026-02-12', remaining: 39, ideal: 39.3 },
  { date: '2026-02-13', remaining: 37, ideal: 35.7 },
  { date: '2026-02-14', remaining: 34, ideal: 32.1 },
  { date: '2026-02-15', remaining: 30, ideal: 28.6 },
  { date: '2026-02-16', remaining: 28, ideal: 25.0 },
];

export const velocityData = [
  { sprint: 'Sprint 8', committed: 34, completed: 30 },
  { sprint: 'Sprint 9', committed: 38, completed: 35 },
  { sprint: 'Sprint 10', committed: 42, completed: 38 },
  { sprint: 'Sprint 11', committed: 45, completed: 40 },
  { sprint: 'Sprint 12', committed: 50, completed: 8 },
];

