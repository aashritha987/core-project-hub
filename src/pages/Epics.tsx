import { useState, useMemo } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { IssueCard } from '@/components/issues/IssueCard';
import { IssueDetailDialog } from '@/components/issues/IssueDetailDialog';
import { Plus, Zap, ChevronDown, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { Epic, Issue, STATUS_LABELS } from '@/types/jira';

const EPIC_COLORS = ['#6554C0', '#00875A', '#FF5630', '#0065FF', '#FF991F', '#00B8D9', '#36B37E', '#6B778C'];

export default function Epics() {
  const { epics, addEpic, updateEpic, deleteEpic, issues, currentProject } = useProject();
  const { canManageSprints } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editEpic, setEditEpic] = useState<Epic | null>(null);
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set(epics.map(e => e.id)));
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [color, setColor] = useState(EPIC_COLORS[0]);
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');

  const toggle = (id: string) => {
    setExpandedEpics(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const epicStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number; totalPoints: number; donePoints: number }> = {};
    epics.forEach(e => {
      const epicIssues = issues.filter(i => i.epicId === e.id);
      stats[e.id] = {
        total: epicIssues.length,
        done: epicIssues.filter(i => i.status === 'done').length,
        totalPoints: epicIssues.reduce((s, i) => s + (i.storyPoints || 0), 0),
        donePoints: epicIssues.filter(i => i.status === 'done').reduce((s, i) => s + (i.storyPoints || 0), 0),
      };
    });
    return stats;
  }, [epics, issues]);

  const handleCreate = () => {
    if (!name.trim()) return;
    const num = epics.length + 1;
    addEpic({
      id: `e-${Date.now()}`,
      key: `${currentProject.key}-E${num}`,
      name: name.trim(),
      summary,
      color,
      status,
      projectId: currentProject.id,
    });
    setCreateOpen(false);
    setName(''); setSummary(''); setColor(EPIC_COLORS[0]); setStatus('todo');
  };

  const handleUpdate = () => {
    if (!editEpic || !name.trim()) return;
    updateEpic(editEpic.id, { name: name.trim(), summary, color, status });
    setEditEpic(null);
    setName(''); setSummary('');
  };

  const openEdit = (epic: Epic) => {
    setEditEpic(epic);
    setName(epic.name);
    setSummary(epic.summary);
    setColor(epic.color);
    setStatus(epic.status);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Epics</h1>
            <p className="text-2xs text-muted-foreground">{epics.length} epics</p>
          </div>
          {canManageSprints() && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create Epic
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 jira-scrollbar">
        {epics.map(epic => {
          const stat = epicStats[epic.id] || { total: 0, done: 0, totalPoints: 0, donePoints: 0 };
          const pct = stat.totalPoints > 0 ? Math.round((stat.donePoints / stat.totalPoints) * 100) : 0;
          const epicIssues = issues.filter(i => i.epicId === epic.id);

          return (
            <Card key={epic.id} className="border shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => toggle(epic.id)}>
                {expandedEpics.has(epic.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: epic.color }} />
                <Zap className="h-4 w-4" style={{ color: epic.color }} />
                <span className="text-sm font-semibold flex-1">{epic.name}</span>
                <Badge variant="outline" className="text-2xs">{stat.done}/{stat.total} done</Badge>
                <Badge variant="secondary" className="text-2xs">{stat.donePoints}/{stat.totalPoints} pts</Badge>
                <div className="w-24">
                  <Progress value={pct} className="h-1.5" />
                </div>
                <span className="text-2xs text-muted-foreground w-10 text-right">{pct}%</span>
                {canManageSprints() && (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(epic)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteEpic(epic.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
              {expandedEpics.has(epic.id) && (
                <CardContent className="pt-0 pb-3">
                  <p className="text-sm text-muted-foreground mb-3">{epic.summary}</p>
                  <div className="space-y-1">
                    {epicIssues.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">No issues in this epic</p>
                    ) : (
                      epicIssues.map(issue => (
                        <IssueCard key={issue.id} issue={issue} compact onClick={() => setSelectedIssue(issue)} />
                      ))
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen || !!editEpic} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditEpic(null); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editEpic ? 'Edit Epic' : 'Create Epic'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Epic Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Epic name" className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Summary</Label>
              <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Epic description..." rows={3} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Color</Label>
              <div className="flex gap-2">
                {EPIC_COLORS.map(c => (
                  <button key={c} className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} onClick={() => setColor(c)} />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setCreateOpen(false); setEditEpic(null); }}>Cancel</Button>
              <Button size="sm" onClick={editEpic ? handleUpdate : handleCreate} disabled={!name.trim()}>
                {editEpic ? 'Save' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <IssueDetailDialog issue={selectedIssue} open={!!selectedIssue} onOpenChange={o => !o && setSelectedIssue(null)} />
    </div>
  );
}
