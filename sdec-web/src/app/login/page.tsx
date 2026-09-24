import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PasswordLoginFlow } from "@/components/auth/PasswordLoginFlow";
import { signInStudent } from "@/actions/auth";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
        <PasswordLoginFlow
          identifierLabel="Roll number or email"
          identifierPlaceholder="2473A05133"
          uppercaseIdentifier
          redirectTo="/dashboard"
          signIn={signInStudent}
        />
        <p className="text-sm text-ink-2">
          First time, or forgot your password?{" "}
          <Link href="/signup" className="text-teal underline-offset-2 hover:underline">
            Set up your account
          </Link>
        </p>
      </main>
    </div>
  );
}
