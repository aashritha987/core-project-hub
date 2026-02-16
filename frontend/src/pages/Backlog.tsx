import { useState, useMemo } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { IssueCard } from '@/components/issues/IssueCard';
import { IssueDetailDialog } from '@/components/issues/IssueDetailDialog';
import { Issue, STATUS_LABELS } from '@/types/jira';
import { ChevronDown, ChevronRight, GripVertical, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateIssueDialog } from '@/components/issues/CreateIssueDialog';

export default function Backlog() {
  const { issues, searchQuery, sprints, epics } = useProject();
  const { canManageSprints } = useAuth();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set([...sprints.filter(s => s.status !== 'completed').map(s => s.id), 'backlog']));
  const [createOpen, setCreateOpen] = useState(false);
  const [filterEpic, setFilterEpic] = useState<string>('all');

  const toggle = (id: string) => {
    setExpandedSprints(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredIssues = useMemo(() => {
    let result = issues.filter(i => !i.parentId); // exclude subtasks
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.title.toLowerCase().includes(q) || i.key.toLowerCase().includes(q));
    }
    if (filterEpic !== 'all') result = result.filter(i => i.epicId === filterEpic);
    return result;
  }, [issues, searchQuery, filterEpic]);

  const groupedIssues = useMemo(() => {
    const groups: { id: string; name: string; issues: Issue[]; meta?: string; status?: string }[] = [];
    sprints.filter(s => s.status !== 'completed').forEach(s => {
      groups.push({
        id: s.id,
        name: s.name,
        issues: filteredIssues.filter(i => i.sprintId === s.id),
        meta: `${s.startDate.slice(5)} – ${s.endDate.slice(5)}`,
        status: s.status,
      });
    });
    groups.push({
      id: 'backlog',
      name: 'Backlog',
      issues: filteredIssues.filter(i => !i.sprintId),
    });
    return groups;
  }, [filteredIssues, sprints]);

  const totalPoints = (items: Issue[]) => items.reduce((s, i) => s + (i.storyPoints || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Backlog</h1>
            <p className="text-2xs text-muted-foreground">{filteredIssues.length} issues</p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create Issue
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 jira-scrollbar">
        {groupedIssues.map(group => (
          <div key={group.id} className="border border-border rounded-lg bg-card">
            <button
              onClick={() => toggle(group.id)}
              className="flex items-center gap-2 w-full px-4 py-3 hover:bg-accent/50 transition-colors text-left"
            >
              {expandedSprints.has(group.id) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold text-foreground">{group.name}</span>
              {group.status && <Badge variant={group.status === 'active' ? 'default' : 'secondary'} className="text-2xs">{group.status}</Badge>}
              <Badge variant="secondary" className="text-2xs ml-1">{group.issues.length} issues</Badge>
              <Badge variant="outline" className="text-2xs">{totalPoints(group.issues)} pts</Badge>
              {group.meta && (
                <span className="text-2xs text-muted-foreground ml-auto">{group.meta}</span>
              )}
            </button>
            {expandedSprints.has(group.id) && (
              <div className="px-2 pb-2 space-y-1">
                {group.issues.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No issues in this group</p>
                ) : (
                  group.issues.map(issue => (
                    <div key={issue.id} className="flex items-center gap-1 group">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 shrink-0" />
                      <div className="flex-1">
                        <IssueCard issue={issue} compact onClick={() => setSelectedIssue(issue)} />
                      </div>
                      <Badge variant="outline" className="text-2xs shrink-0">
                        {STATUS_LABELS[issue.status]}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <IssueDetailDialog issue={selectedIssue} open={!!selectedIssue} onOpenChange={o => !o && setSelectedIssue(null)} />
      <CreateIssueDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
