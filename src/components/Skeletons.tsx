import { Skeleton } from '@/components/ui/skeleton';

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 p-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-72 min-w-[288px] space-y-3">
          <Skeleton className="h-8 w-full rounded-md" />
          {[...Array(3)].map((_, j) => (
            <Skeleton key={j} className="h-24 w-full rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function BacklogSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-3">
          <Skeleton className="h-6 w-48" />
          {[...Array(4)].map((_, j) => (
            <Skeleton key={j} className="h-10 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-[1fr_320px] gap-6">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-3">
      <Skeleton className="h-8 w-full" />
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
