import { Bell, HelpCircle, Plus, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useState } from 'react';
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog';
import { ROLE_LABELS } from '@/types/jira';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export function AppHeader() {
  const { currentProject } = useProject();
  const { currentUser, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const openNotification = async (id: string, actionUrl: string) => {
    await markAsRead(id);
    if (actionUrl) navigate(actionUrl);
  };

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] leading-4 text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-2xs text-muted-foreground">{unreadCount} unread</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead} disabled={unreadCount === 0}>
                  Mark all read
                </Button>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {loading && (
                  <div className="px-3 py-3 text-xs text-muted-foreground">Loading notifications...</div>
                )}
                {!loading && notifications.length === 0 && (
                  <div className="px-3 py-6 text-xs text-muted-foreground text-center">No notifications yet.</div>
                )}
                {!loading && notifications.map((n) => (
                  <button
                    key={n.id}
                    className={`w-full text-left px-3 py-2.5 border-b border-border/60 hover:bg-accent/50 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
                    onClick={() => openNotification(n.id, n.actionUrl)}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold flex-1 truncate">{n.title}</p>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-2xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/help')}>
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
