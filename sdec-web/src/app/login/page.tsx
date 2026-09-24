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
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <PasswordLoginFlow
          identifierLabel="Roll number or email"
          identifierPlaceholder="CS21B045"
          uppercaseIdentifier
          redirectTo="/dashboard"
          signIn={signInStudent}
        />
      </main>
    </div>
  );
}
