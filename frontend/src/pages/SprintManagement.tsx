import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sprint, SprintStatus, STATUS_LABELS } from '@/types/jira';
import { Plus, Play, CheckCircle2, Edit2, Trash2, Calendar, Target } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function SprintManagement() {
  const { sprints, addSprint, updateSprint, deleteSprint, startSprint, completeSprint, issues, currentProject } = useProject();
  const { canManageSprints } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editSprint, setEditSprint] = useState<Sprint | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const canManage = canManageSprints();

  const handleCreate = () => {
    if (!name.trim() || !startDate || !endDate) return;
    addSprint({
      id: `s-${Date.now()}`,
      name: name.trim(),
      goal,
      status: 'planned',
      startDate,
      endDate,
      projectId: currentProject.id,
    });
    setCreateOpen(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editSprint || !name.trim()) return;
    updateSprint(editSprint.id, { name: name.trim(), goal, startDate, endDate });
    setEditSprint(null);
    resetForm();
  };

  const resetForm = () => { setName(''); setGoal(''); setStartDate(''); setEndDate(''); };

  const openEdit = (s: Sprint) => {
    setEditSprint(s);
    setName(s.name); setGoal(s.goal); setStartDate(s.startDate); setEndDate(s.endDate);
  };

  const statusBadge = (status: SprintStatus) => {
    const colors: Record<SprintStatus, string> = {
      active: 'bg-status-progress text-primary-foreground',
      planned: 'bg-muted text-muted-foreground',
      completed: 'bg-status-done text-primary-foreground',
    };
    return <Badge className={`text-2xs ${colors[status]}`}>{status}</Badge>;
  };

  const sortedSprints = [...sprints].sort((a, b) => {
    const order: Record<SprintStatus, number> = { active: 0, planned: 1, completed: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Sprints</h1>
            <p className="text-2xs text-muted-foreground">Manage sprint cycles</p>
          </div>
          {canManage && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create Sprint
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 jira-scrollbar">
        {sortedSprints.map(sprint => {
          const sprintIssues = issues.filter(i => i.sprintId === sprint.id);
          const doneCount = sprintIssues.filter(i => i.status === 'done').length;
          const totalPoints = sprintIssues.reduce((s, i) => s + (i.storyPoints || 0), 0);
          const donePoints = sprintIssues.filter(i => i.status === 'done').reduce((s, i) => s + (i.storyPoints || 0), 0);
          const daysLeft = Math.ceil((new Date(sprint.endDate).getTime() - Date.now()) / 86400000);

          return (
            <Card key={sprint.id} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{sprint.name}</span>
                      {statusBadge(sprint.status)}
                      {sprint.status === 'active' && daysLeft > 0 && (
                        <span className="text-2xs text-muted-foreground">{daysLeft} days remaining</span>
                      )}
                    </div>
                    {sprint.goal && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <Target className="h-3 w-3" /> {sprint.goal}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-2xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{sprint.startDate} → {sprint.endDate}</span>
                      <span>{sprintIssues.length} issues</span>
                      <span>{doneCount}/{sprintIssues.length} done</span>
                      <span>{donePoints}/{totalPoints} story points</span>
                    </div>
                    {sprint.status !== 'completed' && sprintIssues.length > 0 && (
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden w-64">
                        <div className="h-full bg-status-done rounded-full transition-all" style={{ width: `${sprintIssues.length > 0 ? (doneCount / sprintIssues.length) * 100 : 0}%` }} />
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      {sprint.status === 'planned' && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => startSprint(sprint.id)}>
                          <Play className="h-3 w-3" /> Start
                        </Button>
                      )}
                      {sprint.status === 'active' && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setCompleteConfirm(sprint.id)}>
                          <CheckCircle2 className="h-3 w-3" /> Complete
                        </Button>
                      )}
                      {sprint.status !== 'active' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(sprint)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSprint(sprint.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen || !!editSprint} onOpenChange={o => { if (!o) { setCreateOpen(false); setEditSprint(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editSprint ? 'Edit Sprint' : 'Create Sprint'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Sprint Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Sprint 14" className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Goal</Label>
              <Textarea value={goal} onChange={e => setGoal(e.target.value)} placeholder="Sprint goal..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Start Date *</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">End Date *</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setCreateOpen(false); setEditSprint(null); resetForm(); }}>Cancel</Button>
              <Button size="sm" onClick={editSprint ? handleUpdate : handleCreate} disabled={!name.trim()}>
                {editSprint ? 'Save' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Sprint Confirmation */}
      <AlertDialog open={!!completeConfirm} onOpenChange={o => !o && setCompleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              {completeConfirm && (() => {
                const incomplete = issues.filter(i => i.sprintId === completeConfirm && i.status !== 'done');
                return `${incomplete.length} incomplete issue(s) will be moved back to the backlog. Completed issues will remain unchanged.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (completeConfirm) { completeSprint(completeConfirm); setCompleteConfirm(null); } }}>
              Complete Sprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
