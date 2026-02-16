import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Clock, Settings } from 'lucide-react';

export default function Timeline() {
  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Timeline</h1>
        <p className="text-sm text-muted-foreground">Visualize your project timeline and dependencies</p>
      </div>
      <Card className="border shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-1">Timeline View</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Gantt chart view with epic-level planning, dependency tracking, and milestone markers will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
