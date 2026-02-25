import { useEffect, useMemo, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TriangleAlert,
  Users,
  Target,
  Timer,
  Gauge,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';


type BurndownPoint = { date: string; remaining: number; ideal: number };
type VelocityPoint = { sprint: string; committed: number; completed: number };

type ThroughputPoint = { week: string; done: number };
type TeamLoadPoint = { name: string; active: number; doneLast14: number };
type TimeByEmployeePoint = { name: string; estimated: number; actual: number };

const DAY_MS = 24 * 60 * 60 * 1000;

const weekKey = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

export default function Reports() {
  const { issues, sprints, epics, users, currentProject, refreshReportsToken } = useProject();

  const [sprintBurndownData, setSprintBurndownData] = useState<BurndownPoint[]>([]);
  const [velocityData, setVelocityData] = useState<VelocityPoint[]>([]);

  const activeSprint = sprints.find((s) => s.status === 'active');
  const nonSubtaskIssues = useMemo(() => issues.filter((i) => !i.parentId), [issues]);
  const activeSprintIssues = useMemo(
    () => (activeSprint ? nonSubtaskIssues.filter((i) => i.sprintId === activeSprint.id) : []),
    [activeSprint, nonSubtaskIssues],
  );

  useEffect(() => {
    if (!currentProject?.id) return;

    const load = async () => {
      try {
        const velocity = await apiRequest<VelocityPoint[]>(`/reports/velocity/?project_id=${currentProject.id}`);
        setVelocityData(velocity);

        if (activeSprint?.id) {
          const burndown = await apiRequest<BurndownPoint[]>(`/reports/burndown/?sprint_id=${activeSprint.id}`);
          setSprintBurndownData(burndown);
        } else {
          setSprintBurndownData([]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, [currentProject.id, activeSprint?.id, refreshReportsToken]);

  const metrics = useMemo(() => {
    const today = new Date();

    const completionScopeIssues = activeSprint ? activeSprintIssues : nonSubtaskIssues;
    const doneInScope = completionScopeIssues.filter((i) => i.status === 'done').length;
    const sprintCompletionPct = completionScopeIssues.length > 0
      ? Math.round((doneInScope / completionScopeIssues.length) * 100)
      : 0;

    const sprintTimeProgressPct = (() => {
      if (!activeSprint) return 0;
      const start = new Date(activeSprint.startDate).getTime();
      const end = new Date(activeSprint.endDate).getTime();
      const now = Date.now();
      if (end <= start) return 100;
      if (now <= start) return 0;
      if (now >= end) return 100;
      return Math.round(((now - start) / (end - start)) * 100);
    })();

    const sprintDaysLeft = (() => {
      if (!activeSprint) return 0;
      const end = new Date(activeSprint.endDate).getTime();
      return Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
    })();

    const reviewWip = activeSprintIssues.filter((i) => i.status === 'in_review').length;

    const overdueOpen = nonSubtaskIssues.filter((i) => {
      if (!i.dueDate) return false;
      if (i.status === 'done') return false;
      return new Date(i.dueDate) < today;
    });

    const unassignedOpen = nonSubtaskIssues.filter((i) => i.status !== 'done' && !i.assigneeId);

    const doneByWeekMap: Record<string, number> = {};
    nonSubtaskIssues
      .filter((i) => i.status === 'done')
      .forEach((i) => {
        const key = weekKey(new Date(i.updatedAt));
        doneByWeekMap[key] = (doneByWeekMap[key] || 0) + 1;
      });

    const throughputTrend: ThroughputPoint[] = Object.entries(doneByWeekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, done]) => ({ week, done }));

    const last14Cutoff = new Date(today.getTime() - 14 * DAY_MS);
    const teamLoad: TeamLoadPoint[] = users
      .map((u) => {
        const activeCount = nonSubtaskIssues.filter((i) => i.assigneeId === u.id && i.status !== 'done').length;
        const doneLast14 = nonSubtaskIssues.filter((i) => {
          if (i.assigneeId !== u.id || i.status !== 'done') return false;
          return new Date(i.updatedAt) >= last14Cutoff;
        }).length;
        return { name: u.name, active: activeCount, doneLast14 };
      })
      .sort((a, b) => b.active - a.active || b.doneLast14 - a.doneLast14)
      .slice(0, 8);

    const timeByEmployee: TimeByEmployeePoint[] = users
      .map((u) => {
        const assigned = nonSubtaskIssues.filter((i) => i.assigneeId === u.id);
        const estimated = assigned.reduce((sum, i) => sum + (i.timeTracking.estimatedHours || 0), 0);
        const actual = assigned.reduce((sum, i) => sum + (i.timeTracking.loggedHours || 0), 0);
        return {
          name: u.name,
          estimated: Number(estimated.toFixed(1)),
          actual: Number(actual.toFixed(1)),
        };
      })
      .filter((row) => row.estimated > 0 || row.actual > 0)
      .sort((a, b) => Math.max(b.estimated, b.actual) - Math.max(a.estimated, a.actual))
      .slice(0, 10);

    const epicProgress = epics
      .map((epic) => {
        const epicIssues = nonSubtaskIssues.filter((i) => i.epicId === epic.id);
        const total = epicIssues.length;
        const done = epicIssues.filter((i) => i.status === 'done').length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;
        return { id: epic.id, name: epic.name, total, done, progress, status: epic.status };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const avgCycleDays = (() => {
      const doneIssues = nonSubtaskIssues.filter((i) => i.status === 'done');
      if (doneIssues.length === 0) return 0;
      const totalDays = doneIssues.reduce((sum, i) => {
        const created = new Date(i.createdAt).getTime();
        const completed = new Date(i.updatedAt).getTime();
        const days = Math.max(1, Math.round((completed - created) / DAY_MS));
        return sum + days;
      }, 0);
      return Math.round(totalDays / doneIssues.length);
    })();

    const deliveryPredictability = (() => {
      const completedSprints = velocityData.filter((v) => v.committed > 0);
      if (completedSprints.length === 0) return 0;
      const avgRatio = completedSprints.reduce((sum, v) => sum + (v.completed / v.committed), 0) / completedSprints.length;
      return Math.round(avgRatio * 100);
    })();

    const recommendations: string[] = [];
    if (overdueOpen.length > 0) {
      recommendations.push(`Resolve overdue work first: ${overdueOpen.length} open issues are past due date.`);
    }
    if (reviewWip >= 4) {
      recommendations.push(`Review queue is growing (${reviewWip} issues in review). Assign a review owner daily.`);
    }
    if (unassignedOpen.length > 0) {
      recommendations.push(`${unassignedOpen.length} open issues are unassigned. Assign ownership to avoid idle work.`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Delivery is stable. Focus on reducing cycle time and closing remaining in-progress items.');
    }

    const oldestOpen = nonSubtaskIssues
      .filter((i) => i.status !== 'done')
      .map((i) => ({
        id: i.id,
        key: i.key,
        title: i.title,
        ageDays: Math.max(1, Math.round((today.getTime() - new Date(i.createdAt).getTime()) / DAY_MS)),
      }))
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, 5);

    return {
      sprintCompletionPct,
      doneInScope,
      sprintIssueCount: completionScopeIssues.length,
      sprintTimeProgressPct,
      sprintDaysLeft,
      reviewWip,
      overdueOpen,
      unassignedOpen,
      throughputTrend,
      teamLoad,
      timeByEmployee,
      epicProgress,
      avgCycleDays,
      deliveryPredictability,
      recommendations,
      oldestOpen,
    };
  }, [activeSprint, activeSprintIssues, epics, nonSubtaskIssues, users, velocityData]);

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Meaningful project analysis for delivery, risk, and team execution.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-2xs text-muted-foreground font-medium">Open Issues</p>
            <p className="text-2xl font-bold text-foreground mt-2">
              {nonSubtaskIssues.filter((i) => i.status !== 'done').length}
            </p>
            <p className="text-2xs text-muted-foreground mt-1">Total pending items in this project</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-2xs text-muted-foreground font-medium">Sprint Completion</p>
            <p className="text-2xl font-bold text-foreground mt-2">{metrics.sprintCompletionPct}%</p>
            <Progress value={metrics.sprintCompletionPct} className="mt-2 h-1.5" />
            <p className="text-2xs text-muted-foreground mt-1">
              {metrics.doneInScope}/{metrics.sprintIssueCount} issues done
            </p>
            <p className="text-2xs text-muted-foreground">
              {activeSprint
                ? `${activeSprint.name} • ${metrics.sprintDaysLeft} days left • ${metrics.sprintTimeProgressPct}% time elapsed`
                : 'No active sprint • showing overall project completion'}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-2xs text-muted-foreground font-medium">Delivery Predictability</p>
            <p className="text-2xl font-bold text-foreground mt-2">{metrics.deliveryPredictability}%</p>
            <p className="text-2xs text-muted-foreground mt-1">Completed vs committed work across sprints</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-2xs text-muted-foreground font-medium">Average Cycle Time</p>
            <p className="text-2xl font-bold text-foreground mt-2">{metrics.avgCycleDays} days</p>
            <p className="text-2xs text-muted-foreground mt-1">From issue creation to done</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="delivery">
        <TabsList>
          <TabsTrigger value="delivery" className="gap-1 text-xs">
            <Gauge className="h-3.5 w-3.5" /> Delivery
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1 text-xs">
            <Users className="h-3.5 w-3.5" /> Team
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-1 text-xs">
            <TriangleAlert className="h-3.5 w-3.5" /> Risks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="delivery" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Velocity Trend
                </CardTitle>
                <p className="text-2xs text-muted-foreground">Committed vs completed issues per sprint</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="sprint" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="committed" fill="hsl(var(--muted-foreground))" name="Committed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Target className="h-4 w-4" /> Sprint Burndown
                </CardTitle>
                <p className="text-2xs text-muted-foreground">Ideal vs actual remaining issues</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={sprintBurndownData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1.5} dot={false} name="Ideal" />
                    <Line type="monotone" dataKey="remaining" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Remaining" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Done Throughput (Weekly)</CardTitle>
              <p className="text-2xs text-muted-foreground">How many issues were completed each week</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={metrics.throughputTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="done" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Team Load Snapshot</CardTitle>
                <p className="text-2xs text-muted-foreground">Open assigned issues vs completed in last 14 days</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.teamLoad} layout="vertical" margin={{ left: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="active" fill="hsl(var(--jira-orange))" name="Active" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="doneLast14" fill="hsl(var(--primary))" name="Done (14d)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Epic Progress</CardTitle>
                <p className="text-2xs text-muted-foreground">Completion status of top epics by issue count</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.epicProgress.length === 0 && (
                  <p className="text-sm text-muted-foreground">No epic-linked issues found.</p>
                )}
                {metrics.epicProgress.map((epic) => (
                  <div key={epic.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate pr-2">{epic.name}</span>
                      <span className="text-2xs text-muted-foreground">{epic.done}/{epic.total} done</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${epic.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Estimated vs Actual Time by Employee</CardTitle>
                <p className="text-2xs text-muted-foreground">Compares assigned estimate and logged effort (hours)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.timeByEmployee}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="estimated" fill="hsl(var(--jira-blue))" name="Estimated (h)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="hsl(var(--jira-orange))" name="Actual Logged (h)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Actionable Recommendations</CardTitle>
              <p className="text-2xs text-muted-foreground">What to do next to speed up delivery</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics.recommendations.map((item, idx) => (
                <div key={`${item}-${idx}`} className="text-sm rounded-md border border-border p-2.5 bg-card">
                  {idx + 1}. {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <TriangleAlert className="h-4 w-4 text-jira-red" /> Risk Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>Overdue open issues</span>
                  <Badge variant="destructive">{metrics.overdueOpen.length}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>Unassigned open issues</span>
                  <Badge variant="secondary">{metrics.unassignedOpen.length}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>In review (active sprint)</span>
                  <Badge variant="outline">{metrics.reviewWip}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Timer className="h-4 w-4" /> Oldest Open Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics.oldestOpen.length === 0 && (
                  <p className="text-sm text-muted-foreground">No open issues.</p>
                )}
                {metrics.oldestOpen.map((item) => (
                  <div key={item.id} className="rounded-md border border-border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-2xs text-muted-foreground">{item.key}</span>
                      <span className="text-2xs text-muted-foreground">{item.ageDays} days old</span>
                    </div>
                    <p className="text-sm truncate">{item.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
