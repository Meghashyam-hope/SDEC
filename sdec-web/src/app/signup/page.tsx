import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Set up your account",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
        <SignupForm />
        <p className="text-sm text-ink-2">
          Already set up?{" "}
          <Link href="/login" className="text-teal underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
