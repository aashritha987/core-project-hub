import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useProject } from '@/contexts/ProjectContext';
import { Issue, Status, Priority, STATUS_LABELS, PRIORITY_LABELS, ISSUE_TYPE_LABELS } from '@/types/jira';
import { IssueTypeIcon, PriorityIcon } from './IssueCard';
import { users } from '@/data/mockData';
import { Clock, MessageSquare, Send } from 'lucide-react';

interface IssueDetailDialogProps {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueDetailDialog({ issue, open, onOpenChange }: IssueDetailDialogProps) {
  const { updateIssue } = useProject();
  const [newComment, setNewComment] = useState('');

  if (!issue) return null;

  const assignee = issue.assigneeId ? users.find(u => u.id === issue.assigneeId) : null;
  const reporter = users.find(u => u.id === issue.reporterId);

  const statusColors: Record<Status, string> = {
    todo: 'bg-status-todo text-foreground',
    in_progress: 'bg-status-progress text-primary-foreground',
    in_review: 'bg-status-review text-primary-foreground',
    done: 'bg-status-done text-primary-foreground',
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: `c-${Date.now()}`,
      authorId: 'u1',
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
    };
    updateIssue(issue.id, { comments: [...issue.comments, comment] });
    setNewComment('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[85vh] overflow-y-auto jira-scrollbar">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sm">
            <IssueTypeIcon type={issue.type} />
            <span className="text-muted-foreground font-medium">{issue.key}</span>
          </div>
          <DialogTitle className="text-xl font-semibold mt-1">{issue.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_240px] gap-6 mt-4">
          {/* Main Content */}
          <div className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block font-semibold uppercase tracking-wider">Description</Label>
              <p className="text-sm text-foreground leading-relaxed">
                {issue.description || 'No description provided.'}
              </p>
            </div>

            <Separator />

            {/* Comments */}
            <div>
              <Label className="text-xs text-muted-foreground mb-3 block font-semibold uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
                Activity ({issue.comments.length})
              </Label>
              <div className="space-y-3">
                {issue.comments.map(c => {
                  const author = users.find(u => u.id === c.authorId);
                  return (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px] bg-muted">{author?.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{author?.name}</span>
                          <span className="text-2xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2 mt-3">
                  <Input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="h-8 text-sm"
                    onKeyDown={e => e.key === 'Enter' && addComment()}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={addComment}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Details */}
          <div className="space-y-4 text-sm">
            <div>
              <Label className="text-2xs text-muted-foreground mb-1 block">Status</Label>
              <Select value={issue.status} onValueChange={(v) => updateIssue(issue.id, { status: v as Status })}>
                <SelectTrigger className="h-8">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statusColors[issue.status]}`} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-2xs text-muted-foreground mb-1 block">Priority</Label>
              <Select value={issue.priority} onValueChange={(v) => updateIssue(issue.id, { priority: v as Priority })}>
                <SelectTrigger className="h-8">
                  <div className="flex items-center gap-1.5">
                    <PriorityIcon priority={issue.priority} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-2xs text-muted-foreground mb-1 block">Assignee</Label>
              <Select value={issue.assigneeId || ''} onValueChange={(v) => updateIssue(issue.id, { assigneeId: v || null })}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-2xs text-muted-foreground mb-1 block">Reporter</Label>
              <div className="flex items-center gap-2 py-1">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-muted">{reporter?.initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{reporter?.name}</span>
              </div>
            </div>

            {issue.storyPoints !== null && (
              <div>
                <Label className="text-2xs text-muted-foreground mb-1 block">Story Points</Label>
                <Badge variant="secondary" className="text-xs">{issue.storyPoints}</Badge>
              </div>
            )}

            <Separator />

            <div className="space-y-1.5 text-2xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Created {new Date(issue.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {new Date(issue.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
