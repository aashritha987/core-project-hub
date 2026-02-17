import { useState, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useProject } from '@/contexts/ProjectContext';
import { IssueCard } from '@/components/issues/IssueCard';
import { IssueDetailDialog } from '@/components/issues/IssueDetailDialog';
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog';
import { Issue, Status, STATUS_LABELS } from '@/types/jira';
import { cn } from '@/lib/utils';
import { Filter, MoreHorizontal, User, Zap, Plus, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { matchesIssueSearch } from '@/lib/issueSearch';
import { NoIssuesEmpty } from '@/components/EmptyStates';

const columns: Status[] = ['todo', 'in_progress', 'in_review', 'done'];

const columnStyles: Record<Status, string> = {
  todo: 'border-t-status-todo',
  in_progress: 'border-t-status-progress',
  in_review: 'border-t-status-review',
  done: 'border-t-status-done',
};

type SwimlaneMode = 'none' | 'assignee' | 'epic';

export default function Board() {
  const { issues, moveIssue, addIssue, searchQuery, sprints, epics, users, currentProject } = useProject();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterEpic, setFilterEpic] = useState<string>('all');
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneMode>('none');
  const [createOpen, setCreateOpen] = useState(false);

  // Inline quick-create state
  const [quickCreateCol, setQuickCreateCol] = useState<Status | null>(null);
  const [quickCreateTitle, setQuickCreateTitle] = useState('');

  const activeSprint = sprints.find(s => s.status === 'active');
  const [boardScope, setBoardScope] = useState<string>(activeSprint ? 'active' : 'all');

  const boardIssues = useMemo(() => {
    let filtered = issues.filter(i => !i.parentId);

    if (boardScope === 'active') {
      filtered = activeSprint ? filtered.filter(i => i.sprintId === activeSprint.id) : filtered;
    } else if (boardScope === 'backlog') {
      filtered = filtered.filter(i => !i.sprintId);
    } else if (boardScope !== 'all') {
      filtered = filtered.filter(i => i.sprintId === boardScope);
    }
    filtered = filtered.filter((i) => matchesIssueSearch(i, searchQuery, users, epics));
    if (filterAssignee !== 'all') filtered = filtered.filter(i => i.assigneeId === filterAssignee);
    if (filterType !== 'all') filtered = filtered.filter(i => i.type === filterType);
    if (filterEpic !== 'all') filtered = filtered.filter(i => i.epicId === filterEpic);
    return filtered;
  }, [issues, searchQuery, filterAssignee, filterType, filterEpic, activeSprint, boardScope, users, epics]);

  const swimlanes = useMemo(() => {
    if (swimlaneMode === 'none') return [{ id: 'all', label: '', issues: boardIssues }];
    if (swimlaneMode === 'assignee') {
      const groups: { id: string; label: string; issues: Issue[] }[] = [];
      const assigneeIds = [...new Set(boardIssues.map(i => i.assigneeId))];
      assigneeIds.forEach(aId => {
        const user = aId ? users.find(u => u.id === aId) : null;
        groups.push({
          id: aId || 'unassigned',
          label: user ? user.name : 'Unassigned',
          issues: boardIssues.filter(i => i.assigneeId === aId),
        });
      });
      return groups.sort((a, b) => a.label.localeCompare(b.label));
    }
    if (swimlaneMode === 'epic') {
      const groups: { id: string; label: string; issues: Issue[]; color?: string }[] = [];
      const epicIds = [...new Set(boardIssues.map(i => i.epicId))];
      epicIds.forEach(eId => {
        const epic = eId ? epics.find(e => e.id === eId) : null;
        groups.push({
          id: eId || 'no-epic',
          label: epic ? epic.name : 'No Epic',
          issues: boardIssues.filter(i => i.epicId === eId),
          color: epic?.color,
        });
      });
      return groups.sort((a, b) => a.label.localeCompare(b.label));
    }
    return [{ id: 'all', label: '', issues: boardIssues }];
  }, [boardIssues, swimlaneMode, users, epics]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId.split('::')[0] as Status;
    moveIssue(result.draggableId, newStatus);
  };

  const handleQuickCreate = useCallback(async (status: Status) => {
    if (!quickCreateTitle.trim()) {
      setQuickCreateCol(null);
      return;
    }
    const num = issues.filter(i => i.key.startsWith(currentProject.key)).length + 1;
    const newIssue: Issue = {
      id: `i-${Date.now()}`,
      key: `${currentProject.key}-${100 + num + 1}`,
      title: quickCreateTitle.trim(),
      description: '',
      type: 'task',
      status,
      priority: 'medium',
      assigneeId: null,
      reporterId: '',
      labels: [],
      storyPoints: null,
      sprintId: activeSprint?.id || null,
      epicId: null,
      parentId: null,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: null,
      timeTracking: { estimatedHours: null, loggedHours: 0 },
      links: [],
      watchers: [],
    };
    await addIssue(newIssue);
    setQuickCreateTitle('');
    setQuickCreateCol(null);
  }, [quickCreateTitle, issues, currentProject.key, activeSprint, addIssue]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Board</h1>
            <p className="text-2xs text-muted-foreground">
              {activeSprint ? `${activeSprint.name} · ${activeSprint.startDate.slice(5)} - ${activeSprint.endDate.slice(5)}` : 'No active sprint'}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Create
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={boardScope} onValueChange={setBoardScope}>
            <SelectTrigger className="h-7 w-[170px] text-xs">
              <SelectValue placeholder="Board Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Sprint</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="all">All Issues</SelectItem>
              {sprints.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <User className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="spike">Spike</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEpic} onValueChange={setFilterEpic}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <Zap className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Epic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All epics</SelectItem>
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

          <div className="ml-auto">
            <Select value={swimlaneMode} onValueChange={(v) => setSwimlaneMode(v as SwimlaneMode)}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <LayoutGrid className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Swimlanes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Swimlanes</SelectItem>
                <SelectItem value="assignee">By Assignee</SelectItem>
                <SelectItem value="epic">By Epic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {boardIssues.length === 0 ? (
          <NoIssuesEmpty onCreateClick={() => setCreateOpen(true)} />
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="space-y-6">
              {swimlanes.map((lane) => (
                <div key={lane.id}>
                  {lane.label && (
                    <div className="flex items-center gap-2 mb-3">
                      {(lane as any).color && (
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: (lane as any).color }} />
                      )}
                      <h3 className="text-sm font-semibold text-foreground">{lane.label}</h3>
                      <span className="text-2xs text-muted-foreground">({lane.issues.length})</span>
                    </div>
                  )}
                  <div className="flex gap-4 min-h-[200px]">
                    {columns.map(status => {
                      const columnIssues = lane.issues.filter(i => i.status === status);
                      const droppableId = `${status}::${lane.id}`;
                      return (
                        <div key={droppableId} className={cn('flex flex-col w-72 min-w-[288px] bg-board-column rounded-lg border-t-2', columnStyles[status])}>
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-board-column-header uppercase tracking-wider">
                                {STATUS_LABELS[status]}
                              </span>
                              <span className="bg-muted text-muted-foreground text-2xs px-1.5 py-0.5 rounded-full font-medium">
                                {columnIssues.length}
                              </span>
                            </div>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6"
                              onClick={() => { setQuickCreateCol(status); setQuickCreateTitle(''); }}
                              title="Quick create"
                            >
                              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                          <Droppable droppableId={droppableId}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={cn(
                                  'flex-1 px-2 pb-2 space-y-2 overflow-y-auto jira-scrollbar transition-colors',
                                  snapshot.isDraggingOver && 'bg-primary/5'
                                )}
                              >
                                {/* Inline quick create */}
                                {quickCreateCol === status && lane.id === (swimlanes[0]?.id) && (
                                  <div className="p-2 bg-card border border-primary/30 rounded-md shadow-sm">
                                    <Input
                                      autoFocus
                                      value={quickCreateTitle}
                                      onChange={(e) => setQuickCreateTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleQuickCreate(status);
                                        if (e.key === 'Escape') setQuickCreateCol(null);
                                      }}
                                      onBlur={() => {
                                        if (!quickCreateTitle.trim()) setQuickCreateCol(null);
                                      }}
                                      placeholder="What needs to be done?"
                                      className="h-7 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                                    />
                                  </div>
                                )}
                                {columnIssues.map((issue, index) => (
                                  <Draggable key={issue.id} draggableId={issue.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={cn(snapshot.isDragging && 'rotate-2 scale-105')}
                                      >
                                        <IssueCard issue={issue} onClick={() => setSelectedIssue(issue)} />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      <IssueDetailDialog
        issue={selectedIssue}
        open={!!selectedIssue}
        onOpenChange={(open) => !open && setSelectedIssue(null)}
      />
      <CreateIssueDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
