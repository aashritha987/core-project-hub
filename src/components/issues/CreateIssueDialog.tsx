import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Issue, IssueType, Priority, Status } from '@/types/jira';
import { users } from '@/data/mockData';

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
  defaultSprintId?: string | null;
  defaultEpicId?: string | null;
}

export function CreateIssueDialog({ open, onOpenChange, parentId, defaultSprintId, defaultEpicId }: CreateIssueDialogProps) {
  const { currentProject, addIssue, issues, sprints, epics } = useProject();
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>(parentId ? 'subtask' : 'task');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [storyPoints, setStoryPoints] = useState('');
  const [sprintId, setSprintId] = useState(defaultSprintId || '');
  const [epicId, setEpicId] = useState(defaultEpicId || '');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    const num = issues.filter(i => i.key.startsWith(currentProject.key)).length + 1;
    const newIssue: Issue = {
      id: `i-${Date.now()}`,
      key: `${currentProject.key}-${100 + num + 1}`,
      title: title.trim(),
      description,
      type,
      status: 'todo' as Status,
      priority,
      assigneeId: assigneeId || null,
      reporterId: currentUser?.id || 'u1',
      labels: [],
      storyPoints: storyPoints ? parseInt(storyPoints) : null,
      sprintId: sprintId || null,
      epicId: epicId || null,
      parentId: parentId || null,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: dueDate || null,
      timeTracking: { estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null, loggedHours: 0 },
      links: [],
      watchers: currentUser ? [currentUser.id] : [],
    };
    addIssue(newIssue);
    onOpenChange(false);
    setTitle(''); setDescription(''); setType(parentId ? 'subtask' : 'task'); setPriority('medium');
    setAssigneeId(''); setStoryPoints(''); setSprintId(''); setEpicId(''); setDueDate(''); setEstimatedHours('');
  };

  const activeSprints = sprints.filter(s => s.status !== 'completed');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto jira-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-lg">{parentId ? 'Create Sub-task' : 'Create Issue'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Issue Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as IssueType)} disabled={!!parentId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="spike">Spike</SelectItem>
                  <SelectItem value="subtask">Sub-task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="highest">Highest</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="lowest">Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Summary *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" className="h-9" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description (Markdown supported)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a description..." rows={4} className="font-mono text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Story Points</Label>
              <Input value={storyPoints} onChange={e => setStoryPoints(e.target.value)} placeholder="0" type="number" className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Backlog" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Backlog</SelectItem>
                  {activeSprints.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Epic</Label>
              <Select value={epicId} onValueChange={setEpicId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {epics.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                        {e.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Estimated Hours</Label>
              <Input value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} placeholder="0" type="number" className="h-9" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>Create Issue</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
