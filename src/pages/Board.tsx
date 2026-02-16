import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useProject } from '@/contexts/ProjectContext';
import { IssueCard } from '@/components/issues/IssueCard';
import { IssueDetailDialog } from '@/components/issues/IssueDetailDialog';
import { Issue, Status, STATUS_LABELS } from '@/types/jira';
import { cn } from '@/lib/utils';
import { Filter, MoreHorizontal, User, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { users } from '@/data/mockData';

const columns: Status[] = ['todo', 'in_progress', 'in_review', 'done'];

const columnStyles: Record<Status, string> = {
  todo: 'border-t-status-todo',
  in_progress: 'border-t-status-progress',
  in_review: 'border-t-status-review',
  done: 'border-t-status-done',
};

export default function Board() {
  const { issues, moveIssue, searchQuery, sprints, epics } = useProject();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterEpic, setFilterEpic] = useState<string>('all');

  const activeSprint = sprints.find(s => s.status === 'active');

  const sprintIssues = useMemo(() => {
    if (!activeSprint) return [];
    let filtered = issues.filter(i => i.sprintId === activeSprint.id && !i.parentId);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.title.toLowerCase().includes(q) || i.key.toLowerCase().includes(q));
    }
    if (filterAssignee !== 'all') filtered = filtered.filter(i => i.assigneeId === filterAssignee);
    if (filterType !== 'all') filtered = filtered.filter(i => i.type === filterType);
    if (filterEpic !== 'all') filtered = filtered.filter(i => i.epicId === filterEpic);
    return filtered;
  }, [issues, searchQuery, filterAssignee, filterType, filterEpic, activeSprint]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as Status;
    moveIssue(result.draggableId, newStatus);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Board</h1>
            <p className="text-2xs text-muted-foreground">
              {activeSprint ? `${activeSprint.name} · ${activeSprint.startDate.slice(5)} – ${activeSprint.endDate.slice(5)}` : 'No active sprint'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 min-h-[calc(100vh-220px)]">
            {columns.map(status => {
              const columnIssues = sprintIssues.filter(i => i.status === status);
              return (
                <div key={status} className={cn('flex flex-col w-72 min-w-[288px] bg-board-column rounded-lg border-t-2', columnStyles[status])}>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-board-column-header uppercase tracking-wider">
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="bg-muted text-muted-foreground text-2xs px-1.5 py-0.5 rounded-full font-medium">
                        {columnIssues.length}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'flex-1 px-2 pb-2 space-y-2 overflow-y-auto jira-scrollbar transition-colors',
                          snapshot.isDraggingOver && 'bg-primary/5'
                        )}
                      >
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
        </DragDropContext>
      </div>

      <IssueDetailDialog
        issue={selectedIssue}
        open={!!selectedIssue}
        onOpenChange={(open) => !open && setSelectedIssue(null)}
      />
    </div>
  );
}
