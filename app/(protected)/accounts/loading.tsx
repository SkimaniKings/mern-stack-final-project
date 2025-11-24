import { Skeleton } from "@/components/ui/skeleton"

export default function AccountsLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-8">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      <Skeleton className="h-[600px] w-full mt-4" />
    </div>
  )
}

