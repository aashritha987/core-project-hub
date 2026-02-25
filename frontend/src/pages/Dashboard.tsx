import { useMemo, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { IssueTypeIcon, PriorityIcon } from '@/components/issues/IssueCard';
import { STATUS_LABELS, Status, ROLE_LABELS } from '@/types/jira';
import { BarChart3, CheckCircle2, Clock, AlertTriangle, Users, Zap, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { issues, currentProject, sprints, epics, users } = useProject();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [myIssuesFilter, setMyIssuesFilter] = useState<'assigned' | 'reported' | 'both'>('assigned');

  const activeSprint = sprints.find(s => s.status === 'active');
  const sprintIssues = activeSprint ? issues.filter(i => i.sprintId === activeSprint.id) : [];
  const statusScopeIssues = activeSprint
    ? sprintIssues
    : issues;
  const workloadIssues = activeSprint
    ? sprintIssues
    : issues.filter(i => !i.parentId);

  const stats = useMemo(() => {
    const byStatus = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
    statusScopeIssues.forEach(i => byStatus[i.status]++);
    const total = statusScopeIssues.length;
    const donePercent = total > 0 ? Math.round((byStatus.done / total) * 100) : 0;

    const byAssignee: Record<string, number> = {};
    workloadIssues.forEach(i => { if (i.assigneeId) byAssignee[i.assigneeId] = (byAssignee[i.assigneeId] || 0) + 1; });

    return { byStatus, total, donePercent, byAssignee };
  }, [statusScopeIssues, workloadIssues]);

  const recentActivity = [...issues]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const myOpenIssues = useMemo(() => {
    if (!currentUser) return [];
    return issues
      .filter((i) => {
        if (i.status === 'done') return false;
        if (myIssuesFilter === 'assigned') return i.assigneeId === currentUser.id;
        if (myIssuesFilter === 'reported') return i.reporterId === currentUser.id;
        return i.assigneeId === currentUser.id || i.reporterId === currentUser.id;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 8);
  }, [issues, currentUser, myIssuesFilter]);

  const statusColors: Record<Status, string> = {
    todo: 'bg-status-todo',
    in_progress: 'bg-status-progress',
    in_review: 'bg-status-review',
    done: 'bg-status-done',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{currentProject.name}</h1>
          <p className="text-sm text-muted-foreground">{currentProject.description}</p>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Shield className="h-3 w-3" />
              {ROLE_LABELS[currentUser.role]}
            </Badge>
          </div>
        )}
      </div>

      {/* Sprint Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xs text-muted-foreground font-medium">Sprint Progress</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.donePercent}%</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-jira-blue-light flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Progress value={stats.donePercent} className="mt-3 h-1.5" />
            <p className="text-2xs text-muted-foreground mt-2">
              {activeSprint ? activeSprint.name : 'No active sprint · showing overall project'}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xs text-muted-foreground font-medium">Completed</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.byStatus.done}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-jira-green-light flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-jira-green" />
              </div>
            </div>
            <p className="text-2xs text-muted-foreground mt-3">{stats.byStatus.done} of {stats.total} issues</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xs text-muted-foreground font-medium">In Progress</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.byStatus.in_progress}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-jira-blue-light flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-2xs text-muted-foreground mt-3">{stats.byStatus.in_review} in review</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xs text-muted-foreground font-medium">Epics</p>
                <p className="text-2xl font-bold text-foreground mt-1">{epics.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-jira-purple-light flex items-center justify-center">
                <Zap className="h-5 w-5 text-jira-purple" />
              </div>
            </div>
            <p className="text-2xs text-muted-foreground mt-3">{epics.filter(e => e.status === 'done').length} completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* Recent Activity */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.map(issue => {
              const assignee = issue.assigneeId ? users.find(u => u.id === issue.assigneeId) : null;
              return (
                <div key={issue.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate('/board')}>
                  <IssueTypeIcon type={issue.type} className="shrink-0" />
                  <span className="text-2xs font-medium text-muted-foreground shrink-0">{issue.key}</span>
                  <span className="text-sm truncate flex-1">{issue.title}</span>
                  <Badge variant="outline" className="text-2xs shrink-0">{STATUS_LABELS[issue.status]}</Badge>
                  {assignee && (
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarFallback className="text-[9px] bg-muted">{assignee.initials}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Team Workload */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Team Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.slice(0, 5).map(user => {
              const count = stats.byAssignee[user.id] || 0;
              const maxCount = Math.max(...Object.values(stats.byAssignee), 1);
              return (
                <div key={user.id} className="flex items-center gap-2.5">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px] bg-muted">{user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">{user.name}</span>
                      <span className="text-2xs text-muted-foreground">{count} issues</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">My Open Issues</CardTitle>
            <div className="flex gap-1">
              <button
                type="button"
                className={`text-2xs px-2 py-1 rounded border ${myIssuesFilter === 'assigned' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground'}`}
                onClick={() => setMyIssuesFilter('assigned')}
              >
                Assigned
              </button>
              <button
                type="button"
                className={`text-2xs px-2 py-1 rounded border ${myIssuesFilter === 'reported' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground'}`}
                onClick={() => setMyIssuesFilter('reported')}
              >
                Reported
              </button>
              <button
                type="button"
                className={`text-2xs px-2 py-1 rounded border ${myIssuesFilter === 'both' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground'}`}
                onClick={() => setMyIssuesFilter('both')}
              >
                Both
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {myOpenIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {myIssuesFilter === 'assigned' && 'No open issues assigned to you.'}
              {myIssuesFilter === 'reported' && 'No open issues reported by you.'}
              {myIssuesFilter === 'both' && 'No open issues assigned/reported by you.'}
            </p>
          ) : (
            myOpenIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => navigate('/board')}
              >
                <IssueTypeIcon type={issue.type} className="shrink-0" />
                <span className="text-2xs font-medium text-muted-foreground shrink-0">{issue.key}</span>
                <span className="text-sm truncate flex-1">{issue.title}</span>
                <Badge variant="outline" className="text-2xs shrink-0">
                  {STATUS_LABELS[issue.status]}
                </Badge>
                <PriorityIcon priority={issue.priority} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Sprint Status Distribution */}
      {activeSprint && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" /> {activeSprint.name} — Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 h-8 rounded-md overflow-hidden">
              {(Object.entries(stats.byStatus) as [Status, number][]).map(([status, count]) => {
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div key={status} className={`${statusColors[status]} h-full flex items-center justify-center text-primary-foreground text-2xs font-medium transition-all`}
                    style={{ width: `${pct}%`, minWidth: pct > 0 ? '32px' : '0' }}
                    title={`${STATUS_LABELS[status]}: ${count}`}>
                    {count}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <span className={`w-2.5 h-2.5 rounded-sm ${statusColors[k]}`} />
                  {v}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
