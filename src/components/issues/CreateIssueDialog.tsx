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
import { Issue, IssueType, Priority, Status } from '@/types/jira';
import { users } from '@/data/mockData';

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateIssueDialog({ open, onOpenChange }: CreateIssueDialogProps) {
  const { currentProject, addIssue, issues } = useProject();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('task');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [storyPoints, setStoryPoints] = useState('');

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
      reporterId: 'u1',
      labels: [],
      storyPoints: storyPoints ? parseInt(storyPoints) : null,
      sprintId: 's1',
      epicId: null,
      parentId: null,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addIssue(newIssue);
    onOpenChange(false);
    setTitle(''); setDescription(''); setType('task'); setPriority('medium'); setAssigneeId(''); setStoryPoints('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Create Issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Issue Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as IssueType)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
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
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a description..." rows={3} />
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>Create Issue</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
