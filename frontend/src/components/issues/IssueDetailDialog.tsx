import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Issue, Status, Priority, STATUS_LABELS, PRIORITY_LABELS, LINK_TYPE_LABELS, LinkType } from '@/types/jira';
import { IssueTypeIcon, PriorityIcon } from './IssueCard';
import { Clock, MessageSquare, Send, Link2, Eye, Calendar, Timer, Plus, Layers, Trash2, Paperclip, Download } from 'lucide-react';
import { CreateIssueDialog } from './CreateIssueDialog';
import { apiRequest, API_BASE, getToken } from '@/lib/api';

interface IssueDetailDialogProps {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type IssueDraft = {
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
};

const NONE = '__none__';

export function IssueDetailDialog({ issue, open, onOpenChange }: IssueDetailDialogProps) {
  const { updateIssue, issues, epics, deleteIssue, setIssues, users } = useProject();
  const { currentUser, canEditIssue, hasRole } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [logHours, setLogHours] = useState('');
  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>('relates_to');
  const [linkTargetKey, setLinkTargetKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [pendingComments, setPendingComments] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(issue?.id || null);
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number; query: string } | null>(null);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) setCurrentIssueId(issue?.id || null);
  }, [open, issue?.id]);

  const liveIssue = useMemo(() => {
    if (!issue && !currentIssueId) return null;
    if (currentIssueId) return issues.find(i => i.id === currentIssueId) || null;
    return issue;
  }, [issue, issues, currentIssueId]);

  const [draft, setDraft] = useState<IssueDraft | null>(null);

  useEffect(() => {
    if (!liveIssue || !open) return;
    setDraft({
      status: liveIssue.status,
      priority: liveIssue.priority,
      assigneeId: liveIssue.assigneeId,
      dueDate: liveIssue.dueDate,
      estimatedHours: liveIssue.timeTracking.estimatedHours,
    });
    setPendingComments([]);
    setPendingFiles([]);
    setNewComment('');
    setMentionRange(null);
    setMentionActiveIndex(0);
  }, [liveIssue?.id, liveIssue?.updatedAt, open]);

  if (!liveIssue || !draft) return null;

  const canEdit = canEditIssue(liveIssue.assigneeId, liveIssue.reporterId);
  const canModerateComments = hasRole(['admin', 'project_manager']);
  const reporter = users.find(u => u.id === liveIssue.reporterId);
  const epic = liveIssue.epicId ? epics.find(e => e.id === liveIssue.epicId) : null;
  const subtasks = issues.filter(i => i.parentId === liveIssue.id);
  const linkedIssues = liveIssue.links.map(l => ({ ...l, issue: issues.find(i => i.id === l.targetIssueId) })).filter(l => l.issue);

  const statusColors: Record<Status, string> = {
    todo: 'bg-status-todo text-foreground',
    in_progress: 'bg-status-progress text-primary-foreground',
    in_review: 'bg-status-review text-primary-foreground',
    done: 'bg-status-done text-primary-foreground',
  };

  const syncUpdatedIssue = (updatedIssue: Issue) => {
    setIssues(prev => prev.map(i => i.id === updatedIssue.id ? updatedIssue : i));
  };

  const hasFieldChanges =
    draft.status !== liveIssue.status ||
    draft.priority !== liveIssue.priority ||
    draft.assigneeId !== liveIssue.assigneeId ||
    draft.dueDate !== liveIssue.dueDate ||
    draft.estimatedHours !== liveIssue.timeTracking.estimatedHours;

  const hasDraftChanges = hasFieldChanges || pendingComments.length > 0 || pendingFiles.length > 0;

  const saveDraft = async () => {
    if (!canEdit || !hasDraftChanges) return;
    setSavingDraft(true);
    try {
      if (hasFieldChanges) {
        await updateIssue(liveIssue.id, {
          status: draft.status,
          priority: draft.priority,
          assigneeId: draft.assigneeId,
          dueDate: draft.dueDate,
          timeTracking: {
            ...liveIssue.timeTracking,
            estimatedHours: draft.estimatedHours,
          },
        });
      }

      for (const comment of pendingComments) {
        const updatedIssue = await apiRequest<Issue>(`/issues/${liveIssue.id}/comments/`, {
          method: 'POST',
          body: { content: comment },
        });
        syncUpdatedIssue(updatedIssue);
      }

      if (pendingFiles.length > 0) {
        const token = getToken();
        for (const file of pendingFiles) {
          const formData = new FormData();
          formData.append('file', file);
          const resp = await fetch(`${API_BASE}/issues/${liveIssue.id}/attachments/`, {
            method: 'POST',
            headers: token ? { Authorization: `Token ${token}` } : undefined,
            body: formData,
          });
          if (!resp.ok) throw new Error('Attachment upload failed');
          const updatedIssue = await resp.json();
          syncUpdatedIssue(updatedIssue);
        }
      }

      setPendingComments([]);
      setPendingFiles([]);
      setNewComment('');
    } finally {
      setSavingDraft(false);
    }
  };

  const resetDraft = () => {
    setDraft({
      status: liveIssue.status,
      priority: liveIssue.priority,
      assigneeId: liveIssue.assigneeId,
      dueDate: liveIssue.dueDate,
      estimatedHours: liveIssue.timeTracking.estimatedHours,
    });
    setPendingComments([]);
    setPendingFiles([]);
    setNewComment('');
  };

  const addCommentToDraft = () => {
    if (!newComment.trim()) return;
    setPendingComments(prev => [...prev, newComment.trim()]);
    setNewComment('');
    setMentionRange(null);
    setMentionActiveIndex(0);
  };

  const mentionSuggestions = (() => {
    if (!mentionRange) return [];
    const query = mentionRange.query.trim().toLowerCase();
    const scored = users.map(u => {
      const handle = u.email.split('@')[0].toLowerCase();
      const name = u.name.toLowerCase();
      const starts = (name.startsWith(query) || handle.startsWith(query)) ? 0 : 1;
      const contains = (name.includes(query) || handle.includes(query)) ? 0 : 1;
      return { user: u, handle, rank: `${starts}${contains}${name}` };
    });
    return scored
      .filter(item => !query || item.user.name.toLowerCase().includes(query) || item.handle.includes(query))
      .sort((a, b) => a.rank.localeCompare(b.rank))
      .slice(0, 6);
  })();
  const activeMentionIndex = mentionSuggestions.length
    ? Math.min(mentionActiveIndex, mentionSuggestions.length - 1)
    : 0;

  const updateMentionState = (value: string, caret: number | null) => {
    if (caret === null || caret < 0) {
      setMentionRange(null);
      return;
    }
    const before = value.slice(0, caret);
    const match = before.match(/(^|\s)@([A-Za-z0-9._-]{0,64})$/);
    if (!match) {
      setMentionRange(null);
      return;
    }
    const token = match[2] || '';
    const start = caret - token.length - 1;
    setMentionRange({ start, end: caret, query: token });
    setMentionActiveIndex(0);
  };

  const applyMentionSuggestion = (handle: string) => {
    if (!mentionRange) return;
    const nextValue = `${newComment.slice(0, mentionRange.start)}@${handle} ${newComment.slice(mentionRange.end)}`;
    setNewComment(nextValue);
    setMentionRange(null);
    setMentionActiveIndex(0);
    requestAnimationFrame(() => {
      const input = commentInputRef.current;
      if (!input) return;
      const pos = mentionRange.start + handle.length + 2;
      input.focus();
      input.setSelectionRange(pos, pos);
    });
  };

  const startEditingComment = (commentId: string, text: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const saveEditedComment = async () => {
    if (!editingCommentId || !editingCommentText.trim()) return;
    const updatedIssue = await apiRequest<Issue>(`/issues/${liveIssue.id}/comments/${editingCommentId}/`, {
      method: 'PATCH',
      body: { content: editingCommentText.trim() },
    });
    syncUpdatedIssue(updatedIssue);
    cancelEditingComment();
  };

  const deleteComment = async (commentId: string) => {
    const updatedIssue = await apiRequest<Issue>(`/issues/${liveIssue.id}/comments/${commentId}/`, {
      method: 'DELETE',
    });
    syncUpdatedIssue(updatedIssue);
    if (editingCommentId === commentId) cancelEditingComment();
  };

  const handleLogTime = async () => {
    if (!logHours) return;
    const hours = parseFloat(logHours);
    if (isNaN(hours) || hours <= 0) return;
    const updatedIssue = await apiRequest<Issue>(`/issues/${liveIssue.id}/log-time/`, {
      method: 'POST',
      body: { hours },
    });
    syncUpdatedIssue(updatedIssue);
    setLogHours('');
  };

  const toggleWatcher = async () => {
    const updatedIssue = await apiRequest<Issue>(`/issues/${liveIssue.id}/watch-toggle/`, {
      method: 'POST',
    });
    syncUpdatedIssue(updatedIssue);
  };

  const addLink = async () => {
    const updatedIssue = await apiRequest<Issue>(`/issues/${liveIssue.id}/links/`, {
      method: 'POST',
      body: { type: linkType, targetKey: linkTargetKey.toUpperCase() },
    });
    syncUpdatedIssue(updatedIssue);
    setLinkTargetKey('');
    setAddLinkOpen(false);
  };

  const removeLink = async (linkId: string) => {
    const updatedIssue = await apiRequest<Issue>(`/issues/${liveIssue.id}/links/${linkId}/`, {
      method: 'DELETE',
    });
    syncUpdatedIssue(updatedIssue);
  };

  const queueAttachment = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setPendingFiles(prev => [...prev, file]);
    setUploading(false);
  };

  const removeAttachment = async (attachmentId: string) => {
    const updatedIssue = await apiRequest<Issue>(`/issues/${liveIssue.id}/attachments/${attachmentId}/`, {
      method: 'DELETE',
    });
    syncUpdatedIssue(updatedIssue);
  };

  const downloadAttachment = async (fileUrl: string, fileName: string) => {
    const token = getToken();
    const resp = await fetch(fileUrl, {
      headers: token ? { Authorization: `Token ${token}` } : undefined,
    });
    if (!resp.ok) throw new Error('Failed to download file');
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const isWatching = currentUser ? liveIssue.watchers.includes(currentUser.id) : false;

  const renderDescription = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-semibold mt-3 mb-1">{line.slice(3)}</h3>;
      if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-medium mt-2 mb-1">{line.slice(4)}</h4>;
      if (line.startsWith('- [ ] ')) return <div key={i} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled className="rounded" /><span>{line.slice(6)}</span></div>;
      if (line.startsWith('- [x] ')) return <div key={i} className="flex items-center gap-2 text-sm"><input type="checkbox" checked disabled className="rounded" /><span className="line-through text-muted-foreground">{line.slice(6)}</span></div>;
      if (line.startsWith('- ')) return <li key={i} className="text-sm ml-4 list-disc">{line.slice(2)}</li>;
      if (line === '') return <br key={i} />;
      return <p key={i} className="text-sm leading-relaxed">{line}</p>;
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[88vh] overflow-y-auto jira-scrollbar">
          <DialogHeader>
            <div className="flex items-center gap-2 text-sm">
              <IssueTypeIcon type={liveIssue.type} />
              <span className="text-muted-foreground font-medium">{liveIssue.key}</span>
              {epic && (
                <Badge variant="outline" className="text-2xs" style={{ borderColor: epic.color, color: epic.color }}>
                  {epic.name}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl font-semibold mt-1">{liveIssue.title}</DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Button variant={isWatching ? 'secondary' : 'outline'} size="sm" className="h-7 text-xs gap-1" onClick={toggleWatcher}>
                <Eye className="h-3 w-3" /> {isWatching ? 'Watching' : 'Watch'} ({liveIssue.watchers.length})
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_260px] gap-6 mt-4">
            <div className="space-y-5">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block font-semibold uppercase tracking-wider">Description</Label>
                <div className="text-foreground">
                  {liveIssue.description ? renderDescription(liveIssue.description) : <p className="text-sm text-muted-foreground italic">No description provided.</p>}
                </div>
              </div>

              {(subtasks.length > 0 || canEdit) && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        <Layers className="h-3.5 w-3.5 inline mr-1" /> Sub-tasks ({subtasks.length})
                      </Label>
                      {canEdit && <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setCreateSubtaskOpen(true)}><Plus className="h-3 w-3" /> Add</Button>}
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

              {(linkedIssues.length > 0 || canEdit) && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        <Link2 className="h-3.5 w-3.5 inline mr-1" /> Issue Links ({linkedIssues.length})
                      </Label>
                      {canEdit && <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setAddLinkOpen(!addLinkOpen)}><Plus className="h-3 w-3" /> Link</Button>}
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
                          <button
                            type="button"
                            onClick={() => setCurrentIssueId(l.issue!.id)}
                            className="text-2xs text-primary hover:underline"
                          >
                            {l.issue!.key}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentIssueId(l.issue!.id)}
                            className="flex-1 truncate text-left hover:underline"
                          >
                            {l.issue!.title}
                          </button>
                          <Badge variant="outline" className="text-2xs">{STATUS_LABELS[l.issue!.status]}</Badge>
                          {canEdit && <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeLink(l.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    <Paperclip className="h-3.5 w-3.5 inline mr-1" /> Attachments ({(liveIssue.attachments?.length || 0) + pendingFiles.length})
                  </Label>
                  {canEdit && (
                    <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-primary hover:underline">
                      <Plus className="h-3 w-3" /> Upload
                      <input type="file" className="hidden" disabled={uploading} onChange={e => queueAttachment(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
                <div className="space-y-1">
                  {(liveIssue.attachments || []).length === 0 && pendingFiles.length === 0 && <p className="text-sm text-muted-foreground">No attachments uploaded.</p>}
                  {pendingFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20 text-sm">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate">Pending upload: {file.name}</span>
                      <span className="text-2xs text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(liveIssue.attachments || []).map(att => (
                    <div key={att.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 text-sm group">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate">{att.name}</span>
                      <span className="text-2xs text-muted-foreground">{Math.max(1, Math.round(att.size / 1024))} KB</span>
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-2xs text-primary hover:underline"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => downloadAttachment(att.fileUrl, att.name)}
                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                        title="Download"
                        aria-label="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {canEdit && <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeAttachment(att.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-muted-foreground mb-3 block font-semibold uppercase tracking-wider">
                  <MessageSquare className="h-3.5 w-3.5 inline mr-1" /> Activity ({liveIssue.comments.length + pendingComments.length})
                </Label>
                <div className="space-y-3">
                  {pendingComments.map((c, idx) => (
                    <div key={`${c}-${idx}`} className="text-xs p-2 rounded-md bg-primary/5 border border-primary/20 flex items-center justify-between">
                      <span className="truncate pr-2">Pending comment: {c}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPendingComments(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {liveIssue.comments.map(c => {
                    const author = users.find(u => u.id === c.authorId);
                    const canEditThisComment = !!currentUser && (currentUser.id === c.authorId || canModerateComments);
                    const isEditing = editingCommentId === c.id;
                    return (
                      <div key={c.id} className="flex gap-2.5">
                        <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-[10px] bg-muted">{author?.initials}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{author?.name}</span>
                            <span className="text-2xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                            {c.isEdited && (
                              <span className="text-2xs text-muted-foreground">
                                (edited {new Date(c.updatedAt).toLocaleDateString()})
                              </span>
                            )}
                            {canEditThisComment && !isEditing && (
                              <div className="ml-auto flex gap-1">
                                <Button variant="ghost" size="sm" className="h-6 text-2xs" onClick={() => startEditingComment(c.id, c.content)}>
                                  Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 text-2xs text-destructive" onClick={() => deleteComment(c.id)}>
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                          {isEditing ? (
                            <div className="mt-1 space-y-1">
                              <Input
                                value={editingCommentText}
                                onChange={e => setEditingCommentText(e.target.value)}
                                className="h-8 text-sm"
                              />
                              <div className="flex gap-1">
                                <Button size="sm" className="h-6 text-2xs" onClick={saveEditedComment}>
                                  Save
                                </Button>
                                <Button variant="outline" size="sm" className="h-6 text-2xs" onClick={cancelEditingComment}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground mt-0.5">{c.content}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex gap-2 mt-3">
                    <div className="relative flex-1">
                      <Input
                        ref={commentInputRef}
                        value={newComment}
                        onChange={e => {
                          const value = e.target.value;
                          setNewComment(value);
                          updateMentionState(value, e.target.selectionStart);
                        }}
                        onClick={e => updateMentionState(e.currentTarget.value, e.currentTarget.selectionStart)}
                        onKeyUp={e => updateMentionState(e.currentTarget.value, e.currentTarget.selectionStart)}
                        placeholder="Add a comment... Use @Name to mention"
                        className="h-8 text-sm"
                        onKeyDown={e => {
                          if (mentionRange && mentionSuggestions.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setMentionActiveIndex(i => (i + 1) % mentionSuggestions.length);
                              return;
                            }
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setMentionActiveIndex(i => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
                              return;
                            }
                            if (e.key === 'Tab' || e.key === 'Enter') {
                              e.preventDefault();
                              const active = mentionSuggestions[activeMentionIndex];
                              if (!active) return;
                              applyMentionSuggestion(active.handle);
                              return;
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setMentionRange(null);
                              return;
                            }
                          }
                          if (e.key === 'Enter') addCommentToDraft();
                        }}
                      />
                      {mentionRange && mentionSuggestions.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                          {mentionSuggestions.map((item, idx) => (
                            <button
                              key={item.user.id}
                              type="button"
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${
                                idx === activeMentionIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                              }`}
                              onMouseDown={e => {
                                e.preventDefault();
                                applyMentionSuggestion(item.handle);
                              }}
                            >
                              <span className="truncate">{item.user.name}</span>
                              <span className="text-muted-foreground">@{item.handle}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={addCommentToDraft}><Send className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <Label className="text-2xs text-muted-foreground mb-1 block">Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft(prev => prev ? { ...prev, status: v as Status } : prev)} disabled={!canEdit}>
                  <SelectTrigger className="h-8"><div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${statusColors[draft.status]}`} /><SelectValue /></div></SelectTrigger>
                  <SelectContent>{(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-2xs text-muted-foreground mb-1 block">Priority</Label>
                <Select value={draft.priority} onValueChange={(v) => setDraft(prev => prev ? { ...prev, priority: v as Priority } : prev)} disabled={!canEdit}>
                  <SelectTrigger className="h-8"><div className="flex items-center gap-1.5"><PriorityIcon priority={draft.priority} /><SelectValue /></div></SelectTrigger>
                  <SelectContent>{(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-2xs text-muted-foreground mb-1 block">Assignee</Label>
                <Select value={draft.assigneeId || NONE} onValueChange={(v) => setDraft(prev => prev ? { ...prev, assigneeId: v === NONE ? null : v } : prev)} disabled={!canEdit}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-2xs text-muted-foreground mb-1 block"><Calendar className="h-3 w-3 inline mr-1" />Due Date</Label>
                <Input type="date" className="h-8" value={draft.dueDate || ''} onChange={e => setDraft(prev => prev ? { ...prev, dueDate: e.target.value || null } : prev)} disabled={!canEdit} />
              </div>

              <div>
                <Label className="text-2xs text-muted-foreground mb-1 block">Reporter</Label>
                <div className="flex items-center gap-2 py-1"><Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-muted">{reporter?.initials}</AvatarFallback></Avatar><span className="text-sm">{reporter?.name}</span></div>
              </div>

              <div>
                <Label className="text-2xs text-muted-foreground mb-1 block"><Timer className="h-3 w-3 inline mr-1" />Time Tracking</Label>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs"><span>Logged: {liveIssue.timeTracking.loggedHours}h</span><span>Est: {draft.estimatedHours || '-'}h</span></div>
                  {canEdit && <Input type="number" className="h-7 text-xs" placeholder="Estimated Hours" value={draft.estimatedHours ?? ''} onChange={e => setDraft(prev => prev ? { ...prev, estimatedHours: e.target.value ? Number(e.target.value) : null } : prev)} />}
                  {canEdit && (
                    <div className="flex gap-1 mt-1">
                      <Input value={logHours} onChange={e => setLogHours(e.target.value)} placeholder="Hours" type="number" className="h-7 text-xs" />
                      <Button size="sm" className="h-7 text-xs" onClick={handleLogTime}>Log</Button>
                    </div>
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 text-xs" onClick={saveDraft} disabled={!hasDraftChanges || savingDraft}>
                    {savingDraft ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={resetDraft} disabled={!hasDraftChanges}>Reset</Button>
                </div>
              )}

              <Separator />
              <div className="space-y-1.5 text-2xs text-muted-foreground">
                <div className="flex items-center gap-1"><Clock className="h-3 w-3" />Created {new Date(liveIssue.createdAt).toLocaleDateString()}</div>
                <div className="flex items-center gap-1"><Clock className="h-3 w-3" />Updated {new Date(liveIssue.updatedAt).toLocaleDateString()}</div>
              </div>

              {canEdit && (
                <>
                  <Separator />
                  <Button variant="destructive" size="sm" className="w-full text-xs" onClick={() => { deleteIssue(liveIssue.id); onOpenChange(false); }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete Issue
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <CreateIssueDialog open={createSubtaskOpen} onOpenChange={setCreateSubtaskOpen} parentId={liveIssue.id} defaultSprintId={liveIssue.sprintId} defaultEpicId={liveIssue.epicId} />
    </>
  );
}
