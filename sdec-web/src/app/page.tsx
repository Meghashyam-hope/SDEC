import { AppHeader } from "@/components/AppHeader";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-(--breakpoint-md) flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-3 text-sm font-medium text-teal">
          Student Digital Election Commission
        </p>
        <h1 className="font-heading text-4xl font-semibold text-navy sm:text-5xl">
          Elections you can trust.
        </h1>
        <p className="mt-4 max-w-md text-balance text-base text-ink-2">
          Vote once, get a receipt that proves it was counted — without
          revealing your choice. Calm, quiet and impossible to get wrong.
        </p>
      </main>
    </div>
  );
}
