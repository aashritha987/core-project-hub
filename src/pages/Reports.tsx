import { Card, CardContent } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export default function Reports() {
  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Sprint and team performance analytics</p>
      </div>
      <Card className="border shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-1">Reports & Analytics</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Burndown charts, velocity tracking, cumulative flow diagrams, and sprint retrospectives will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
