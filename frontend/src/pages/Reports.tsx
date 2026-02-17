import { useEffect, useMemo, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrendingDown, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/api';

type BurndownPoint = { date: string; remaining: number; ideal: number };
type VelocityPoint = { sprint: string; committed: number; completed: number };

export default function Reports() {
  const { issues, sprints, currentProject, refreshReportsToken } = useProject();
  const [sprintBurndownData, setSprintBurndownData] = useState<BurndownPoint[]>([]);
  const [velocityData, setVelocityData] = useState<VelocityPoint[]>([]);

  const activeSprint = sprints.find(s => s.status === 'active');
  const sprintIssues = activeSprint ? issues.filter(i => i.sprintId === activeSprint.id) : [];
  const totalPoints = sprintIssues.reduce((s, i) => s + (i.storyPoints || 0), 0);
  const donePoints = sprintIssues.filter(i => i.status === 'done').reduce((s, i) => s + (i.storyPoints || 0), 0);

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

  const avgVelocity = useMemo(() => {
    const completed = velocityData.slice(0, -1);
    if (completed.length === 0) return 0;
    return Math.round(completed.reduce((s, d) => s + d.completed, 0) / completed.length);
  }, [velocityData]);

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Sprint and team performance analytics</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-2xs text-muted-foreground font-medium">Current Sprint Points</p>
            <p className="text-2xl font-bold mt-1">{donePoints} / {totalPoints}</p>
            <p className="text-2xs text-muted-foreground mt-1">{activeSprint?.name || 'No active sprint'}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-2xs text-muted-foreground font-medium">Avg Velocity</p>
            <p className="text-2xl font-bold mt-1">{avgVelocity} pts</p>
            <p className="text-2xs text-muted-foreground mt-1">Last {Math.max(velocityData.length - 1, 0)} sprints</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-2xs text-muted-foreground font-medium">Sprint Completion</p>
            <p className="text-2xl font-bold mt-1">{totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0}%</p>
            <p className="text-2xs text-muted-foreground mt-1">{sprintIssues.filter(i => i.status === 'done').length}/{sprintIssues.length} issues done</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="burndown">
        <TabsList>
          <TabsTrigger value="burndown" className="gap-1 text-xs">
            <TrendingDown className="h-3.5 w-3.5" /> Burndown
          </TabsTrigger>
          <TabsTrigger value="velocity" className="gap-1 text-xs">
            <Zap className="h-3.5 w-3.5" /> Velocity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="burndown">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Sprint Burndown Chart</CardTitle>
              <p className="text-2xs text-muted-foreground">{activeSprint?.name} — Story points remaining over time</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={sprintBurndownData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1.5} dot={false} name="Ideal" />
                  <Line type="monotone" dataKey="remaining" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Remaining" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Velocity Chart</CardTitle>
              <p className="text-2xs text-muted-foreground">Story points committed vs completed per sprint</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
