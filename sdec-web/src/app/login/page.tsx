import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { OtpLoginFlow } from "@/components/auth/OtpLoginFlow";
import { requestStudentOtp, verifyStudentOtp } from "@/actions/auth";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <OtpLoginFlow
          identifierLabel="Roll number"
          identifierPlaceholder="CS21B045"
          uppercaseIdentifier
          notFoundMessage="Not on the voter roll. Contact the election commission."
          redirectTo="/dashboard"
          requestOtp={requestStudentOtp}
          verifyOtp={verifyStudentOtp}
        />
      </main>
    </div>
  );
}
