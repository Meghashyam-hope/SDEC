import { AppHeader } from "@/components/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";

export default function VoteLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <div className="mx-auto w-full max-w-(--breakpoint-sm) space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="space-y-2.5 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
