import { Inbox, Zap, Milestone, BarChart3, Users, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center">{description}</p>
      {action && (
        <Button size="sm" className="mt-4 text-xs" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function NoIssuesEmpty({ onCreateClick }: { onCreateClick?: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No issues yet"
      description="Create your first issue to start tracking work."
      action={onCreateClick ? { label: 'Create Issue', onClick: onCreateClick } : undefined}
    />
  );
}

export function NoSprintsEmpty({ onCreateClick }: { onCreateClick?: () => void }) {
  return (
    <EmptyState
      icon={Milestone}
      title="No sprints"
      description="Create a sprint to organize your team's work into time-boxed iterations."
      action={onCreateClick ? { label: 'Create Sprint', onClick: onCreateClick } : undefined}
    />
  );
}

export function NoEpicsEmpty({ onCreateClick }: { onCreateClick?: () => void }) {
  return (
    <EmptyState
      icon={Zap}
      title="No epics"
      description="Create epics to group related issues into larger bodies of work."
      action={onCreateClick ? { label: 'Create Epic', onClick: onCreateClick } : undefined}
    />
  );
}

export function NoProjectsEmpty() {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects"
      description="Ask an admin to create a project to get started."
    />
  );
}

export function NoDataEmpty() {
  return (
    <EmptyState
      icon={BarChart3}
      title="No data to display"
      description="Complete some sprints and resolve issues to see reports here."
    />
  );
}

export function NoUsersEmpty() {
  return (
    <EmptyState
      icon={Users}
      title="No team members"
      description="Add team members to start collaborating."
    />
  );
}
