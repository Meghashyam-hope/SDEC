import type { Metadata } from "next";
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
          Forgot your password, or don&apos;t have one yet? Ask the election commission —
          they can set or reset it for you from the admin panel.
        </p>
      </main>
    </div>
  );
}
