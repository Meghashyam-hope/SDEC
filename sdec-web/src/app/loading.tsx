import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
