import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-(--breakpoint-sm) flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-semibold text-navy">Page not found</h1>
        <p className="text-sm text-ink-2">
          That page doesn&apos;t exist, or the election it points to isn&apos;t published.
        </p>
        <Button render={<Link href="/" />} nativeButton={false}>
          Back to SDEC
        </Button>
      </main>
    </div>
  );
}
