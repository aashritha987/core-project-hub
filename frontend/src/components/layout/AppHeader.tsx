import { Bell, HelpCircle, Plus, LogOut, Shield, Moon, Sun, Timer, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useEffect, useMemo, useState } from 'react';
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog';
import { ROLE_LABELS } from '@/types/jira';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useLiveTimer } from '@/contexts/LiveTimerContext';
import { apiRequest } from '@/lib/api';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function AppHeader() {
  const { currentProject, issues } = useProject();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const { state: timerState, start, pause, resume, stop, getElapsedMs } = useLiveTimer();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [timerIssueId, setTimerIssueId] = useState<string>('');
  const [, setTick] = useState(0);

  const allNonSubtaskIssues = useMemo(
    () => issues.filter((i) => !i.parentId),
    [issues],
  );
  const availableIssues = useMemo(() => {
    if (!currentUser) return [];
    return allNonSubtaskIssues.filter(
      (i) => i.assigneeId === currentUser.id || i.reporterId === currentUser.id,
    );
  }, [allNonSubtaskIssues, currentUser]);
  const activeTimerIssue = useMemo(
    () => allNonSubtaskIssues.find((i) => i.id === timerState.issueId),
    [allNonSubtaskIssues, timerState.issueId],
  );

  useEffect(() => {
    if (timerState.status !== 'running') return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [timerState.status]);

  useEffect(() => {
    if (!timerDialogOpen) return;
    if (timerIssueId) return;
    if (availableIssues.length > 0) {
      setTimerIssueId(availableIssues[0].id);
    }
  }, [timerDialogOpen, timerIssueId, availableIssues]);

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleStartTimer = () => {
    if (!timerIssueId) return;
    start(timerIssueId);
    toast.success('Timer started', {
      description: `Tracking ${availableIssues.find((i) => i.id === timerIssueId)?.key || 'ticket'}`,
    });
    setTimerDialogOpen(false);
  };

  const handleStopTimer = async () => {
    const result = stop();
    if (!result) return;
    const hours = Number((result.elapsedMs / 3600000).toFixed(3));
    if (hours <= 0) {
      toast.info('Timer stopped', { description: 'No time logged because duration was too short.' });
      return;
    }
    try {
      await apiRequest(`/issues/${result.issueId}/log-time/`, {
        method: 'POST',
        body: { hours },
      });
      toast.success('Time logged', {
        description: `${hours}h added to ${activeTimerIssue?.key || result.issueId}`,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to log time', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

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
          <Button
            variant={timerState.status === 'running' ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              if (timerState.status === 'running' || timerState.status === 'paused') void handleStopTimer();
              else setTimerDialogOpen(true);
            }}
          >
            <Timer className="h-3.5 w-3.5" />
            {timerState.status === 'idle' ? 'Start Timer' : `Stop ${formatDuration(getElapsedMs())}`}
          </Button>
          {timerState.status !== 'idle' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  if (timerState.status === 'running') {
                    pause();
                    toast.info('Timer paused');
                  } else if (timerState.status === 'paused') {
                    resume();
                    toast.info('Timer resumed');
                  }
                }}
              >
                {timerState.status === 'running' ? 'Pause' : 'Resume'}
              </Button>
              <Badge variant="outline" className="h-8 px-2 text-2xs gap-1">
                <Timer className="h-3 w-3" />
                {activeTimerIssue?.key || 'Ticket'} · {timerState.status}
              </Badge>
            </>
          ) : null}
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate('/chat')}
            title="Open Chat"
            aria-label="Open Chat"
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
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
      <Dialog open={timerDialogOpen} onOpenChange={setTimerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Start Live Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a ticket assigned to you or reported by you before starting the timer.
            </p>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Ticket</Label>
              <Select value={timerIssueId} onValueChange={setTimerIssueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ticket" />
                </SelectTrigger>
                <SelectContent>
                  {availableIssues.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No tickets available
                    </SelectItem>
                  ) : (
                    availableIssues.map((issue) => (
                      <SelectItem key={issue.id} value={issue.id}>
                        {issue.key} - {issue.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartTimer} disabled={!timerIssueId || availableIssues.length === 0}>
              Start Timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
