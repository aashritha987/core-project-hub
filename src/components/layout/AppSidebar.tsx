import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Columns3, List, Settings, Search, ChevronDown,
  Zap, BarChart3, Bug, Milestone, FolderKanban
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useProject } from '@/contexts/ProjectContext';
import { projects } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Board', url: '/board', icon: Columns3 },
  { title: 'Backlog', url: '/backlog', icon: List },
  { title: 'Sprints', url: '/sprints', icon: Milestone },
  { title: 'Epics', url: '/epics', icon: Zap },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { currentProject, selectedProjectId, setSelectedProjectId, searchQuery, setSearchQuery, sprints } = useProject();
  const navigate = useNavigate();
  const activeSprint = sprints.find(s => s.status === 'active');
  const daysLeft = activeSprint ? Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / 86400000) : 0;

  return (
    <aside className="w-64 min-w-[256px] border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Project Selector */}
      <div className="p-3 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent transition-colors text-left">
              <span className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-lg">
                {currentProject.avatar}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{currentProject.name}</div>
                <div className="text-2xs text-muted-foreground">Software project</div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {projects.map(p => (
              <DropdownMenuItem key={p.id} onClick={() => { setSelectedProjectId(p.id); navigate('/'); }}>
                <span className="mr-2">{p.avatar}</span>
                {p.name}
                <span className="ml-auto text-2xs text-muted-foreground">{p.key}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search issues..."
            className="pl-8 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Planning Nav */}
      <div className="px-3 mb-1">
        <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Planning</span>
      </div>
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto jira-scrollbar">
        {navItems.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-sidebar-foreground hover:bg-accent transition-colors"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Quick Stats */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
          <Bug className="h-3 w-3" />
          <span>{activeSprint ? `${activeSprint.name} · ${daysLeft > 0 ? `${daysLeft} days remaining` : 'Ending today'}` : 'No active sprint'}</span>
        </div>
      </div>
    </aside>
  );
}
