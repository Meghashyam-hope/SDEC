import type { Metadata } from "next";
import { PasswordLoginFlow } from "@/components/auth/PasswordLoginFlow";
import { signInAdmin } from "@/actions/auth";

export const metadata: Metadata = {
  title: "Commission sign-in",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <p className="mb-6 font-heading text-lg font-semibold text-navy">SDEC — Election Commission</p>
      <PasswordLoginFlow
        identifierLabel="Email"
        identifierPlaceholder="you@college.edu"
        redirectTo="/admin"
        signIn={signInAdmin}
      />
    </div>
  );
}
