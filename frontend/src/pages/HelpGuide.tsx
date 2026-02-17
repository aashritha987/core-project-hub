import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, Compass, FolderKanban, ListTodo, Milestone, Zap } from 'lucide-react';

const quickStart = [
  'Create a workspace (project) from the project switcher in the left sidebar.',
  'Create issues from Backlog or the top Create button.',
  'Group issues into Epics for large feature themes.',
  'Plan Sprints and move selected issues into a sprint.',
  'Track progress on Board and update issue statuses.',
  'Use Reports to monitor sprint burndown and velocity.',
];

export default function HelpGuide() {
  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Help Guide</h1>
        <p className="text-sm text-muted-foreground">Simple, practical guidance to use this project hub effectively.</p>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Compass className="h-4 w-4" /> Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quickStart.map((step, idx) => (
            <div key={step} className="flex items-start gap-2">
              <Badge variant="secondary" className="text-2xs mt-0.5">{idx + 1}</Badge>
              <p className="text-sm text-foreground">{step}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FolderKanban className="h-4 w-4" /> Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">A workspace is your project container. It holds issues, sprints, epics, and reports.</p>
            <p className="text-sm text-muted-foreground">Admins can create, update, and delete workspaces from settings.</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ListTodo className="h-4 w-4" /> Issue Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Use statuses to track work: To Do, In Progress, In Review, Done.</p>
            <p className="text-sm text-muted-foreground">Assign owners, add comments, track estimates, and log effort.</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Milestone className="h-4 w-4" /> Sprints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Sprints are short delivery cycles. Plan scope, start sprint, then complete sprint.</p>
            <p className="text-sm text-muted-foreground">When completing a sprint, unfinished issues are moved back to backlog.</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" /> Epics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Epics group related issues under a large objective or feature theme.</p>
            <p className="text-sm text-muted-foreground">One epic can span multiple sprints.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Who can manage users and workspaces?</AccordionTrigger>
              <AccordionContent>
                Admin users can manage user accounts and workspace-level settings.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What is the difference between Backlog and Board?</AccordionTrigger>
              <AccordionContent>
                Backlog is for planning future work. Board is for tracking current sprint execution.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>How do notifications work?</AccordionTrigger>
              <AccordionContent>
                You receive real-time notifications for assignment changes, comments, status updates, and sprint events.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Can I delete a workspace?</AccordionTrigger>
              <AccordionContent>
                Yes, admins can delete a workspace from Project Settings. This permanently removes its related project data.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="py-4 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Tip: Start simple. Create a workspace, add a few issues, run one short sprint, and review reports at the end.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
