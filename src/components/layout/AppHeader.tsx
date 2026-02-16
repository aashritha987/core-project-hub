import { Bell, HelpCircle, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useProject } from '@/contexts/ProjectContext';
import { useState } from 'react';
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog';

export function AppHeader() {
  const { currentProject } = useProject();
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
          <Avatar className="h-7 w-7 cursor-pointer">
            <AvatarFallback className="text-2xs bg-primary text-primary-foreground">AM</AvatarFallback>
          </Avatar>
        </div>
      </header>
      <CreateIssueDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
