import { Bell, HelpCircle, Plus, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog';
import { ROLE_LABELS } from '@/types/jira';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export function AppHeader() {
  const { currentProject } = useProject();
  const { currentUser, logout } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{currentProject.key}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Create
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-7 w-7 cursor-pointer">
                <AvatarFallback className="text-2xs bg-primary text-primary-foreground">
                  {currentUser?.initials || '??'}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{currentUser?.name}</span>
                  <span className="text-xs text-muted-foreground">{currentUser?.email}</span>
                  <Badge variant="outline" className="text-2xs mt-1 w-fit gap-1">
                    <Shield className="h-2.5 w-2.5" />
                    {currentUser?.role ? ROLE_LABELS[currentUser.role] : 'Unknown'}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <CreateIssueDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
