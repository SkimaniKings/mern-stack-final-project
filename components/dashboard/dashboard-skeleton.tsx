import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="p-6 flex flex-col space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
      </div>
    </>
  )
}

