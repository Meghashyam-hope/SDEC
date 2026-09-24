"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type RequestResult =
  | { ok: true; maskedEmail: string; devCode?: string }
  | { ok: false; error: "not_found" | "too_many_attempts" | "unknown" };

type VerifyResult =
  | { ok: true }
  | { ok: false; error: "invalid_code" | "not_found" | "unknown" };

export interface OtpLoginFlowProps {
  /** "Roll number" or "Email" */
  identifierLabel: string;
  identifierPlaceholder: string;
  /** Uppercases as you type (roll numbers); off for email. */
  uppercaseIdentifier?: boolean;
  notFoundMessage: string;
  redirectTo: string;
  requestOtp: (identifier: string) => Promise<RequestResult>;
  verifyOtp: (identifier: string, code: string) => Promise<VerifyResult>;
}

const RESEND_COOLDOWN_SECONDS = 60;

function OtpLoginFlow({
  identifierLabel,
  identifierPlaceholder,
  uppercaseIdentifier,
  notFoundMessage,
  redirectTo,
  requestOtp,
  verifyOtp,
}: OtpLoginFlowProps) {
  const router = useRouter();
  const [step, setStep] = React.useState<"identifier" | "otp">("identifier");
  const [identifier, setIdentifier] = React.useState("");
  const [maskedEmail, setMaskedEmail] = React.useState("");
  const [devCode, setDevCode] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  function requestErrorMessage(err: "not_found" | "too_many_attempts" | "unknown") {
    if (err === "not_found") return notFoundMessage;
    if (err === "too_many_attempts") return "Too many attempts. Try again in a few minutes.";
    return "Something went wrong. Try again.";
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setPending(true);
    setError(null);

    const result = await requestOtp(identifier.trim());

    if (!result.ok) {
      setError(requestErrorMessage(result.error));
      setPending(false);
      return;
    }

    setMaskedEmail(result.maskedEmail);
    setDevCode(result.devCode ?? null);
    setStep("otp");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setPending(false);
  }

  async function handleResend() {
    if (cooldown > 0 || pending) return;
    setPending(true);
    setError(null);
    const result = await requestOtp(identifier.trim());
    if (!result.ok) {
      setError(requestErrorMessage(result.error));
    } else {
      setDevCode(result.devCode ?? null);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("Code resent");
    }
    setPending(false);
  }

  async function handleVerify(codeValue: string) {
    setPending(true);
    setError(null);
    const result = await verifyOtp(identifier.trim(), codeValue);
    if (!result.ok) {
      setError(
        result.error === "invalid_code"
          ? "That code didn't work. Check it and try again."
          : "Something went wrong. Try again.",
      );
      setPending(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      {step === "identifier" ? (
        <form onSubmit={handleRequest}>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your {identifierLabel.toLowerCase()} to get a sign-in code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">{identifierLabel}</Label>
              <Input
                id="identifier"
                autoFocus
                value={identifier}
                placeholder={identifierPlaceholder}
                onChange={(e) =>
                  setIdentifier(
                    uppercaseIdentifier ? e.target.value.toUpperCase() : e.target.value,
                  )
                }
                aria-invalid={!!error}
              />
              {error ? (
                <p className="text-xs text-destructive" role="alert" aria-live="polite">
                  {error}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={pending || !identifier.trim()}>
              {pending ? "Checking…" : "Continue"}
            </Button>
          </CardContent>
        </form>
      ) : (
        <div>
          <CardHeader>
            <CardTitle>Enter your code</CardTitle>
            <CardDescription>We sent a 6-digit code to {maskedEmail}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {devCode ? (
              <p className="rounded-lg bg-amber-tint px-3 py-2 text-xs text-amber">
                Dev mode — email isn&apos;t wired up yet. Your code is{" "}
                <span className="font-semibold tabular-nums">{devCode}</span>.
              </p>
            ) : null}
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={handleVerify}
              disabled={pending}
              autoFocus
            />
            {error ? (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">
                {error}
              </p>
            ) : null}
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep("identifier");
                  setCode("");
                  setError(null);
                }}
                className="text-ink-2 hover:text-ink"
              >
                ← Use a different {identifierLabel.toLowerCase()}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || pending}
                className="text-teal hover:underline disabled:pointer-events-none disabled:text-caption"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
}

export { OtpLoginFlow };
