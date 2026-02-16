import { Issue, IssueType, Priority } from '@/types/jira';
import { users } from '@/data/mockData';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bug, BookOpen, CheckSquare, Zap, Layers, ArrowUp, ArrowDown, Minus, FlaskConical, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeIcons: Record<IssueType, React.ComponentType<{ className?: string }>> = {
  story: BookOpen,
  bug: Bug,
  task: CheckSquare,
  epic: Zap,
  subtask: Layers,
  spike: FlaskConical,
};

const typeColors: Record<IssueType, string> = {
  story: 'text-issue-story',
  bug: 'text-issue-bug',
  task: 'text-issue-task',
  epic: 'text-issue-epic',
  subtask: 'text-issue-task',
  spike: 'text-jira-orange',
};

export function IssueTypeIcon({ type, className }: { type: IssueType; className?: string }) {
  const Icon = typeIcons[type];
  return <Icon className={cn('h-4 w-4', typeColors[type], className)} />;
}

const priorityIcons: Record<Priority, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  highest: { icon: ArrowUp, color: 'text-priority-highest' },
  high: { icon: ArrowUp, color: 'text-priority-high' },
  medium: { icon: Minus, color: 'text-priority-medium' },
  low: { icon: ArrowDown, color: 'text-priority-low' },
  lowest: { icon: ArrowDown, color: 'text-priority-lowest' },
};

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const { icon: Icon, color } = priorityIcons[priority];
  return <Icon className={cn('h-3.5 w-3.5', color, className)} />;
}

interface IssueCardProps {
  issue: Issue;
  onClick?: () => void;
  compact?: boolean;
}

export function IssueCard({ issue, onClick, compact }: IssueCardProps) {
  const assignee = issue.assigneeId ? users.find(u => u.id === issue.assigneeId) : null;
  const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.status !== 'done';

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card rounded-md border border-border p-3 cursor-pointer',
        'hover:bg-accent/50 transition-colors shadow-sm hover:shadow-md',
        'animate-fade-in',
        issue.type === 'subtask' && 'ml-4 border-l-2 border-l-primary/20'
      )}
    >
      {!compact && (
        <p className="text-sm text-foreground mb-2 line-clamp-2 font-normal leading-snug">
          {issue.title}
        </p>
      )}
      {compact && (
        <div className="flex items-center gap-2">
          <IssueTypeIcon type={issue.type} className="h-3.5 w-3.5 shrink-0" />
          <span className="text-2xs text-muted-foreground font-medium">{issue.key}</span>
          <span className="text-sm text-foreground truncate flex-1">{issue.title}</span>
          {isOverdue && <Calendar className="h-3 w-3 text-destructive shrink-0" />}
          {issue.timeTracking.loggedHours > 0 && (
            <span className="text-2xs text-muted-foreground flex items-center gap-0.5 shrink-0">
              <Clock className="h-3 w-3" />
              {issue.timeTracking.loggedHours}h
            </span>
          )}
          <PriorityIcon priority={issue.priority} />
          {assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px] bg-muted">{assignee.initials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <IssueTypeIcon type={issue.type} className="h-3.5 w-3.5" />
            <span className="text-2xs text-muted-foreground font-medium">{issue.key}</span>
            {isOverdue && <Calendar className="h-3 w-3 text-destructive" />}
          </div>
          <div className="flex items-center gap-1.5">
            <PriorityIcon priority={issue.priority} />
            {issue.timeTracking.loggedHours > 0 && (
              <span className="text-2xs text-muted-foreground">
                {issue.timeTracking.loggedHours}/{issue.timeTracking.estimatedHours || '?'}h
              </span>
            )}
            {issue.storyPoints && (
              <span className="bg-muted text-muted-foreground text-2xs px-1.5 py-0.5 rounded-full font-medium">
                {issue.storyPoints}
              </span>
            )}
            {assignee && (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-muted">{assignee.initials}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
