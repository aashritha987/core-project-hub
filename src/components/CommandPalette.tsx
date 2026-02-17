import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Columns3, List, Milestone, Zap, BarChart3, Settings, Users,
  Bug, BookOpen, CheckSquare, FlaskConical, Search,
} from 'lucide-react';
import { IssueType } from '@/types/jira';

const typeIcons: Record<IssueType, React.ComponentType<{ className?: string }>> = {
  story: BookOpen,
  bug: Bug,
  task: CheckSquare,
  epic: Zap,
  subtask: CheckSquare,
  spike: FlaskConical,
};

const navPages = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Board', path: '/board', icon: Columns3 },
  { name: 'Backlog', path: '/backlog', icon: List },
  { name: 'Sprints', path: '/sprints', icon: Milestone },
  { name: 'Epics', path: '/epics', icon: Zap },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Users', path: '/users', icon: Users },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { issues, users, epics } = useProject();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const issueItems = useMemo(
    () => issues.filter((i) => !i.parentId).slice(0, 20),
    [issues],
  );

  const go = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search issues, pages, or actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {navPages.map((page) => (
            <CommandItem key={page.path} onSelect={() => go(page.path)}>
              <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {page.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Issues">
          {issueItems.map((issue) => {
            const Icon = typeIcons[issue.type] || CheckSquare;
            return (
              <CommandItem key={issue.id} onSelect={() => go('/board')}>
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground mr-2 text-xs font-mono">{issue.key}</span>
                <span className="truncate">{issue.title}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
