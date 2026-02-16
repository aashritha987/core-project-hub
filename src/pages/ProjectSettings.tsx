import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useProject } from '@/contexts/ProjectContext';

export default function ProjectSettings() {
  const { currentProject } = useProject();

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
            <Input defaultValue={currentProject.name} className="h-9 max-w-md" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Project Key</Label>
            <Input defaultValue={currentProject.key} className="h-9 max-w-[120px]" disabled />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
            <Input defaultValue={currentProject.description} className="h-9 max-w-md" />
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button size="sm">Save Changes</Button>
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
    </div>
  );
}
