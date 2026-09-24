import type { Metadata } from "next";
import { OtpLoginFlow } from "@/components/auth/OtpLoginFlow";
import { requestAdminOtp, verifyAdminOtp } from "@/actions/auth";

export const metadata: Metadata = {
  title: "Commission sign-in",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <p className="mb-6 font-heading text-lg font-semibold text-navy">SDEC — Election Commission</p>
      <OtpLoginFlow
        identifierLabel="Email"
        identifierPlaceholder="you@college.edu"
        notFoundMessage="This email isn't registered with the election commission."
        redirectTo="/admin"
        requestOtp={requestAdminOtp}
        verifyOtp={verifyAdminOtp}
      />
    </div>
  );
}
