import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Columns3, List, Settings, Search, ChevronDown,
  Zap, BarChart3, Bug, Milestone, Users, X, BookOpen
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export function AppSidebar() {
  const avatarOptions = ['🚀', '🎨', '⚙️', '📊', '🛡️', '💡', '📦', '🧪', '🌐', '🧩'];
  const { currentProject, projects, setSelectedProjectId, searchQuery, setSearchQuery, sprints, createProject } = useProject();
  const { canManageProject } = useAuth();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('🚀');
  const [error, setError] = useState('');
  const activeSprint = sprints.find(s => s.status === 'active');
  const daysLeft = activeSprint ? Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / 86400000) : 0;
  const navItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Board', url: '/board', icon: Columns3 },
    { title: 'Backlog', url: '/backlog', icon: List },
    { title: 'Sprints', url: '/sprints', icon: Milestone },
    { title: 'Epics', url: '/epics', icon: Zap },
    { title: 'Onboarding', url: '/onboarding', icon: BookOpen },
    { title: 'Reports', url: '/reports', icon: BarChart3 },
    { title: 'Settings', url: '/settings', icon: Settings },
    ...(canManageProject() ? [{ title: 'Users', url: '/users', icon: Users }] : []),
  ];

  const onCreateWorkspace = async () => {
    if (!name.trim() || !key.trim()) {
      setError('Workspace name and key are required.');
      return;
    }
    try {
      const created = await createProject({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
        avatar: avatar.trim() || '🚀',
      });
      setSelectedProjectId(created.id);
      navigate('/');
      setCreateOpen(false);
      setName('');
      setKey('');
      setDescription('');
      setAvatar('🚀');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create workspace');
    }
  };

  const onOpenCreate = () => {
    setError('');
    setCreateOpen(true);
  };

  return (
    <>
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
            {canManageProject() && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenCreate}>Create Workspace</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search issues..."
            className="pl-8 pr-8 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
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
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Workspace Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Project Atlas" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Project Key</Label>
              <Input value={key} onChange={e => setKey(e.target.value.toUpperCase())} placeholder="ATL" className="h-9 uppercase" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Avatar</Label>
              <Input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="🚀" className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Choose Avatar</Label>
            <div className="flex flex-wrap gap-1.5">
              {avatarOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`w-8 h-8 rounded-md border text-base flex items-center justify-center transition-colors ${
                    avatar === option
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent'
                  }`}
                  onClick={() => setAvatar(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this workspace..." className="h-9" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={onCreateWorkspace}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
