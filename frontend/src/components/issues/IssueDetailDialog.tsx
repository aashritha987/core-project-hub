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
import { useAuth } from '@/contexts/AuthContext';
import { Issue, Status, Priority, STATUS_LABELS, PRIORITY_LABELS, ISSUE_TYPE_LABELS, LINK_TYPE_LABELS, LinkType } from '@/types/jira';
import { IssueTypeIcon, PriorityIcon } from './IssueCard';
import { Clock, MessageSquare, Send, Link2, Eye, Calendar, Timer, Plus, Layers, Trash2 } from 'lucide-react';
import { CreateIssueDialog } from './CreateIssueDialog';
import { apiRequest } from '@/lib/api';

interface IssueDetailDialogProps {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueDetailDialog({ issue, open, onOpenChange }: IssueDetailDialogProps) {
  const { updateIssue, issues, epics, deleteIssue, setIssues, users } = useProject();
  const { currentUser, canEditIssue } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [logHours, setLogHours] = useState('');
  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>('relates_to');
  const [linkTargetKey, setLinkTargetKey] = useState('');

  if (!issue) return null;

  const canEdit = canEditIssue(issue.assigneeId, issue.reporterId);
  const assignee = issue.assigneeId ? users.find(u => u.id === issue.assigneeId) : null;
  const reporter = users.find(u => u.id === issue.reporterId);
  const epic = issue.epicId ? epics.find(e => e.id === issue.epicId) : null;
  const subtasks = issues.filter(i => i.parentId === issue.id);
  const linkedIssues = issue.links.map(l => ({ ...l, issue: issues.find(i => i.id === l.targetIssueId) })).filter(l => l.issue);

  const statusColors: Record<Status, string> = {
    todo: 'bg-status-todo text-foreground',
    in_progress: 'bg-status-progress text-primary-foreground',
    in_review: 'bg-status-review text-primary-foreground',
    done: 'bg-status-done text-primary-foreground',
  };

  const syncUpdatedIssue = (updatedIssue: Issue) => {
    setIssues(prev => prev.map(i => i.id === updatedIssue.id ? updatedIssue : i));
  };

  const addComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    const updatedIssue = await apiRequest<Issue>(`/issues/${issue.id}/comments/`, {
      method: 'POST',
      body: { content: newComment.trim() },
    });
    syncUpdatedIssue(updatedIssue);
    setNewComment('');
  };

  const handleLogTime = async () => {
    if (!logHours) return;
    const hours = parseFloat(logHours);
    if (isNaN(hours) || hours <= 0) return;
    const updatedIssue = await apiRequest<Issue>(`/issues/${issue.id}/log-time/`, {
      method: 'POST',
      body: { hours },
    });
    syncUpdatedIssue(updatedIssue);
    setLogHours('');
  };

  const toggleWatcher = async () => {
    const updatedIssue = await apiRequest<Issue>(`/issues/${issue.id}/watch-toggle/`, {
      method: 'POST',
    });
    syncUpdatedIssue(updatedIssue);
  };

  const addLink = async () => {
    const updatedIssue = await apiRequest<Issue>(`/issues/${issue.id}/links/`, {
      method: 'POST',
      body: { type: linkType, targetKey: linkTargetKey.toUpperCase() },
    });
    syncUpdatedIssue(updatedIssue);
    setLinkTargetKey('');
    setAddLinkOpen(false);
  };

  const removeLink = async (linkId: string) => {
    const updatedIssue = await apiRequest<Issue>(`/issues/${issue.id}/links/${linkId}/`, {
      method: 'DELETE',
    });
    syncUpdatedIssue(updatedIssue);
  };

  const isWatching = currentUser ? issue.watchers.includes(currentUser.id) : false;

  // Simple markdown: bold, headers, lists
  const renderDescription = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-semibold mt-3 mb-1">{line.slice(3)}</h3>;
      if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-medium mt-2 mb-1">{line.slice(4)}</h4>;
      if (line.startsWith('- [ ] ')) return <div key={i} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled className="rounded" /><span>{line.slice(6)}</span></div>;
      if (line.startsWith('- [x] ')) return <div key={i} className="flex items-center gap-2 text-sm"><input type="checkbox" checked disabled className="rounded" /><span className="line-through text-muted-foreground">{line.slice(6)}</span></div>;
      if (line.startsWith('- ')) return <li key={i} className="text-sm ml-4 list-disc">{line.slice(2)}</li>;
      if (line === '') return <br key={i} />;
      return <p key={i} className="text-sm leading-relaxed">{line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>;
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[860px] max-h-[85vh] overflow-y-auto jira-scrollbar">
          <DialogHeader>
            <div className="flex items-center gap-2 text-sm">
              <IssueTypeIcon type={issue.type} />
              <span className="text-muted-foreground font-medium">{issue.key}</span>
              {epic && (
                <Badge variant="outline" className="text-2xs" style={{ borderColor: epic.color, color: epic.color }}>
                  {epic.name}
                </Badge>
              )}
              {issue.parentId && (
                <span className="text-2xs text-muted-foreground">
                  ↳ Sub-task of {issues.find(i => i.id === issue.parentId)?.key}
                </span>
              )}
            </div>
            <DialogTitle className="text-xl font-semibold mt-1">{issue.title}</DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Button variant={isWatching ? 'secondary' : 'outline'} size="sm" className="h-7 text-xs gap-1" onClick={toggleWatcher}>
                <Eye className="h-3 w-3" /> {isWatching ? 'Watching' : 'Watch'} ({issue.watchers.length})
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_240px] gap-6 mt-4">
            {/* Main Content */}
            <div className="space-y-5">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block font-semibold uppercase tracking-wider">Description</Label>
                <div className="text-foreground">
                  {issue.description ? renderDescription(issue.description) : <p className="text-sm text-muted-foreground italic">No description provided.</p>}
                </div>
              </div>

              {/* Subtasks */}
              {(subtasks.length > 0 || canEdit) && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        <Layers className="h-3.5 w-3.5 inline mr-1" />
                        Sub-tasks ({subtasks.length})
                      </Label>
                      {canEdit && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setCreateSubtaskOpen(true)}>
                          <Plus className="h-3 w-3" /> Add
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {subtasks.map(st => (
                        <div key={st.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 text-sm">
                          <IssueTypeIcon type={st.type} className="h-3.5 w-3.5" />
                          <span className="text-2xs text-muted-foreground">{st.key}</span>
                          <span className="flex-1 truncate">{st.title}</span>
                          <Badge variant="outline" className="text-2xs">{STATUS_LABELS[st.status]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Links */}
              {(linkedIssues.length > 0 || canEdit) && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        <Link2 className="h-3.5 w-3.5 inline mr-1" />
                        Issue Links ({linkedIssues.length})
                      </Label>
                      {canEdit && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setAddLinkOpen(!addLinkOpen)}>
                          <Plus className="h-3 w-3" /> Link
                        </Button>
                      )}
                    </div>
                    {addLinkOpen && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-md">
                        <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
                          <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.entries(LINK_TYPE_LABELS) as [LinkType, string][]).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input value={linkTargetKey} onChange={e => setLinkTargetKey(e.target.value)} placeholder="ATL-101" className="h-7 text-xs w-[100px]" />
                        <Button size="sm" className="h-7 text-xs" onClick={addLink}>Add</Button>
                      </div>
                    )}
                    <div className="space-y-1">
                      {linkedIssues.map(l => (
                        <div key={l.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 text-sm group">
                          <span className="text-2xs text-muted-foreground italic">{LINK_TYPE_LABELS[l.type]}</span>
                          <IssueTypeIcon type={l.issue!.type} className="h-3.5 w-3.5" />
                          <span className="text-2xs text-muted-foreground">{l.issue!.key}</span>
                          <span className="flex-1 truncate">{l.issue!.title}</span>
                          <Badge variant="outline" className="text-2xs">{STATUS_LABELS[l.issue!.status]}</Badge>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeLink(l.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

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
                            <span className="text-2xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-foreground mt-0.5">{c.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex gap-2 mt-3">
                    <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="h-8 text-sm" onKeyDown={e => e.key === 'Enter' && addComment()} />
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
                <Select value={issue.status} onValueChange={(v) => canEdit && updateIssue(issue.id, { status: v as Status })} disabled={!canEdit}>
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
                <Select value={issue.priority} onValueChange={(v) => canEdit && updateIssue(issue.id, { priority: v as Priority })} disabled={!canEdit}>
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
                <Select value={issue.assigneeId || ''} onValueChange={(v) => canEdit && updateIssue(issue.id, { assigneeId: v || null })} disabled={!canEdit}>
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

              {/* Due Date */}
              {issue.dueDate && (
                <div>
                  <Label className="text-2xs text-muted-foreground mb-1 block">
                    <Calendar className="h-3 w-3 inline mr-1" />Due Date
                  </Label>
                  <span className={`text-xs ${new Date(issue.dueDate) < new Date() && issue.status !== 'done' ? 'text-destructive font-medium' : ''}`}>
                    {new Date(issue.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Time Tracking */}
              <div>
                <Label className="text-2xs text-muted-foreground mb-1 block">
                  <Timer className="h-3 w-3 inline mr-1" />Time Tracking
                </Label>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span>Logged: {issue.timeTracking.loggedHours}h</span>
                    <span>Est: {issue.timeTracking.estimatedHours || '-'}h</span>
                  </div>
                  {issue.timeTracking.estimatedHours && (
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          issue.timeTracking.loggedHours > issue.timeTracking.estimatedHours ? 'bg-destructive' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min((issue.timeTracking.loggedHours / issue.timeTracking.estimatedHours) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                  {canEdit && (
                    <div className="flex gap-1 mt-1">
                      <Input value={logHours} onChange={e => setLogHours(e.target.value)} placeholder="Hours" type="number" className="h-7 text-xs" />
                      <Button size="sm" className="h-7 text-xs" onClick={handleLogTime}>Log</Button>
                    </div>
                  )}
                </div>
              </div>

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

              {canEdit && (
                <>
                  <Separator />
                  <Button variant="destructive" size="sm" className="w-full text-xs" onClick={() => { deleteIssue(issue.id); onOpenChange(false); }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete Issue
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <CreateIssueDialog
        open={createSubtaskOpen}
        onOpenChange={setCreateSubtaskOpen}
        parentId={issue.id}
        defaultSprintId={issue.sprintId}
        defaultEpicId={issue.epicId}
      />
    </>
  );
}
