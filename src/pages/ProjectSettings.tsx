import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProjectSettings() {
  const { currentProject, projects, updateProject, deleteProject } = useProject();
  const { canManageProject } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(currentProject.name);
  const [description, setDescription] = useState(currentProject.description);
  const [avatar, setAvatar] = useState(currentProject.avatar || '🚀');

  useEffect(() => {
    setName(currentProject.name);
    setDescription(currentProject.description);
    setAvatar(currentProject.avatar || '🚀');
  }, [currentProject.id, currentProject.name, currentProject.description, currentProject.avatar]);

  const handleSave = async () => {
    if (!canManageProject()) return;
    await updateProject(currentProject.id, { name, description, avatar });
  };

  const handleDeleteWorkspace = async () => {
    if (!canManageProject()) return;
    const ok = confirm(
      `Delete workspace "${currentProject.name}"? This will permanently delete its sprints, epics, issues, and related project data.`,
    );
    if (!ok) return;
    await deleteProject(currentProject.id);
    navigate('/');
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Project Settings</h1>
        <p className="text-sm text-muted-foreground">Manage project configuration</p>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Project Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-9 max-w-md" disabled={!canManageProject()} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Project Avatar</Label>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-lg">
                {avatar || '🚀'}
              </div>
              <Input
                value={avatar}
                onChange={e => setAvatar(e.target.value)}
                placeholder="🚀"
                className="h-9 max-w-[120px]"
                disabled={!canManageProject()}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Project Key</Label>
            <Input defaultValue={currentProject.key} className="h-9 max-w-[120px]" disabled />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="h-9 max-w-md" disabled={!canManageProject()} />
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={!canManageProject()}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Notification preferences and email settings will be available here.</p>
        </CardContent>
      </Card>

      <Card className="border border-destructive/30 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deleting a workspace will remove all its sprints, epics, issues, and related project data permanently.
          </p>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteWorkspace}
              disabled={!canManageProject() || projects.length === 0 || currentProject.id === 'none'}
            >
              Delete Workspace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
